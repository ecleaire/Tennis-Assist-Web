extends Control

signal preparation_completed(match_number: int)

@onready var field_display: Control = $Layout/FieldPanel/FieldMargin/FieldCenter/Playfield/PlayfieldStack/FieldDisplay
@onready var layout: VBoxContainer = $Layout
@onready var toolbar: HFlowContainer = $Layout/Toolbar
@onready var randomize_button: Button = $Layout/Toolbar/RandomizeButton
@onready var reset_button: Button = $Layout/Toolbar/ResetButton
@onready var title_label: Label = $Layout/Title
@onready var status_label: Label = $Layout/Toolbar/StatusLabel
@onready var status_label_2: Label = $Layout/Toolbar/StatusLabel2
@onready var ready_button: Button = $Layout/Toolbar/ReadyButton
@onready var field_margin: MarginContainer = $Layout/FieldPanel/FieldMargin
@onready var playfield: AspectRatioContainer = $Layout/FieldPanel/FieldMargin/FieldCenter/Playfield

var workflow_match_number: int = 0
var workflow_preparation_active: bool = false
var dashboard_mode: bool = false

func _ready() -> void:
	$Layout/Toolbar/RandomizeButton.pressed.connect(_randomize)
	$Layout/Toolbar/ResetButton.pressed.connect(_reset_layout)
	ready_button.pressed.connect(_complete_preparation)
	ready_button.visible = false
	status_label.text = "4ライン分の配置を準備しました。紫ボールは180度反転で配置します。"

func set_dashboard_mode(enabled: bool) -> void:
	dashboard_mode = enabled
	if not is_node_ready():
		return
	_update_dashboard_mode()
	_update_playfield_size()
	call_deferred("_update_playfield_size")

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_update_playfield_size()

func _update_dashboard_mode() -> void:
	title_label.visible = not dashboard_mode
	status_label_2.visible = not dashboard_mode
	status_label.visible = not dashboard_mode
	status_label.custom_minimum_size = Vector2(0, 34 if dashboard_mode else 52)
	status_label.add_theme_font_size_override("font_size", 14 if dashboard_mode else 16)
	layout.add_theme_constant_override("separation", 10 if dashboard_mode else 18)
	toolbar.alignment = FlowContainer.ALIGNMENT_CENTER if dashboard_mode else FlowContainer.ALIGNMENT_BEGIN
	toolbar.add_theme_constant_override("h_separation", 8 if dashboard_mode else 12)
	toolbar.add_theme_constant_override("v_separation", 8 if dashboard_mode else 12)
	var button_size: Vector2 = Vector2(132, 44) if dashboard_mode else Vector2(180, 52)
	randomize_button.custom_minimum_size = button_size
	reset_button.custom_minimum_size = button_size
	ready_button.custom_minimum_size = button_size
	var field_margin_size: int = 10 if dashboard_mode else 18
	field_margin.add_theme_constant_override("margin_left", field_margin_size)
	field_margin.add_theme_constant_override("margin_top", field_margin_size)
	field_margin.add_theme_constant_override("margin_right", field_margin_size)
	field_margin.add_theme_constant_override("margin_bottom", field_margin_size)

func _update_playfield_size() -> void:
	if playfield == null:
		return
	var available_width: float = size.x
	if available_width <= 1.0:
		available_width = get_parent_area_size().x
	if available_width <= 1.0:
		available_width = get_viewport_rect().size.x

	var horizontal_padding: float = 20.0 if dashboard_mode else 40.0
	var max_width: float = minf(820.0, maxf(320.0, available_width - horizontal_padding)) if dashboard_mode else 1281.0
	var min_width: float = minf(360.0, max_width) if dashboard_mode else 360.0
	var target_width: float = clampf(available_width - horizontal_padding, min_width, max_width)
	playfield.custom_minimum_size = Vector2(target_width, target_width / 2.066)

func begin_match_preparation(match_number: int) -> void:
	# Only the guided match flow shows the ready button.
	workflow_match_number = match_number
	workflow_preparation_active = true
	ready_button.visible = false
	ready_button.disabled = true
	if _randomize():
		ready_button.visible = true
		ready_button.disabled = false

func _randomize() -> bool:
	if field_display.has_method("is_layout_ready") and not field_display.call("is_layout_ready"):
		status_label.text = "初期位置の取得待ちです。もう一度お試しください。"
		return false

	field_display.animate_random_layout()
	status_label.text = "ボール配置を生成しました。"
	if workflow_preparation_active:
		ready_button.visible = true
		ready_button.disabled = false
	return true

func _reset_layout() -> void:
	if field_display.has_method("is_layout_ready") and not field_display.call("is_layout_ready"):
		status_label.text = "初期位置の取得待ちです。もう一度お試しください。"
		return

	field_display.set_default_layout()
	status_label.text = "調整済みの初期位置に戻しました。"
	if workflow_preparation_active:
		ready_button.visible = false
		ready_button.disabled = true

func _complete_preparation() -> void:
	if not workflow_preparation_active:
		return
	workflow_preparation_active = false
	ready_button.visible = false
	preparation_completed.emit(workflow_match_number)
