extends Control

signal fullscreen_ui_toggled(is_compact: bool)
signal preparation_completed(match_number: int)

@onready var field_display: Control = $Layout/FieldPanel/FieldMargin/FieldCenter/Playfield/PlayfieldStack/FieldDisplay
@onready var layout: VBoxContainer = $Layout
@onready var toolbar: HFlowContainer = $Layout/Toolbar
@onready var randomize_button: Button = $Layout/Toolbar/RandomizeButton
@onready var reset_button: Button = $Layout/Toolbar/ResetButton
@onready var fullscreen_button: Button = $Layout/Toolbar/FullscreenButton
@onready var title_label: Label = $Layout/Title
@onready var status_label: Label = $Layout/Toolbar/StatusLabel
@onready var status_label_2: Label = $Layout/Toolbar/StatusLabel2
@onready var ready_button: Button = $Layout/Toolbar/ReadyButton
@onready var field_margin: MarginContainer = $Layout/FieldPanel/FieldMargin
@onready var playfield: AspectRatioContainer = $Layout/FieldPanel/FieldMargin/FieldCenter/Playfield
@onready var playfield_stack: Control = $Layout/FieldPanel/FieldMargin/FieldCenter/Playfield/PlayfieldStack
@onready var playfield_image: TextureRect = $Layout/FieldPanel/FieldMargin/FieldCenter/Playfield/PlayfieldStack/PlayfieldImage

const PLAYFIELD_RATIO: float = 2.066

var workflow_match_number: int = 0
var workflow_preparation_active: bool = false
var dashboard_mode: bool = false
var playfield_portrait: bool = false
var playfield_refresh_token: int = 0
var is_fullscreen_ui: bool = false

func _enter_tree() -> void:
	call_deferred("refresh_responsive_layout")

func _ready() -> void:
	$Layout/Toolbar/RandomizeButton.pressed.connect(_randomize)
	$Layout/Toolbar/ResetButton.pressed.connect(_reset_layout)
	fullscreen_button.pressed.connect(_toggle_fullscreen)
	ready_button.pressed.connect(_complete_preparation)
	visibility_changed.connect(_on_visibility_changed)
	ready_button.visible = false
	_disable_button_focus()
	status_label.text = "4ライン分の配置を準備しました。紫ボールは180度反転で配置します。"

func set_dashboard_mode(enabled: bool) -> void:
	dashboard_mode = enabled
	if not is_node_ready():
		return
	_update_dashboard_mode()
	refresh_responsive_layout()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		refresh_responsive_layout()

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F:
		_toggle_fullscreen()

func refresh_responsive_layout() -> void:
	if not is_node_ready():
		return
	_schedule_playfield_refresh(10)

func _on_visibility_changed() -> void:
	if visible:
		refresh_responsive_layout()

func _update_dashboard_mode() -> void:
	_apply_responsive_controls(_get_effective_available_size())

func _apply_responsive_controls(available_size: Vector2) -> void:
	var portrait: bool = available_size.y > available_size.x * 1.08
	var compact: bool = dashboard_mode or portrait or is_fullscreen_ui
	title_label.visible = not dashboard_mode and not is_fullscreen_ui
	status_label_2.visible = not dashboard_mode
	status_label.visible = not dashboard_mode and not is_fullscreen_ui
	status_label.custom_minimum_size = Vector2(0, 28 if compact else 52)
	status_label.add_theme_font_size_override("font_size", 12 if compact else 16)
	layout.add_theme_constant_override("separation", 8 if compact else 18)
	toolbar.alignment = FlowContainer.ALIGNMENT_CENTER if compact else FlowContainer.ALIGNMENT_BEGIN
	toolbar.add_theme_constant_override("h_separation", 6 if compact else 12)
	toolbar.add_theme_constant_override("v_separation", 6 if compact else 12)
	var button_size: Vector2 = Vector2(108, 38) if portrait else (Vector2(132, 44) if dashboard_mode else Vector2(180, 52))
	randomize_button.custom_minimum_size = button_size
	reset_button.custom_minimum_size = button_size
	fullscreen_button.custom_minimum_size = button_size
	ready_button.custom_minimum_size = button_size
	fullscreen_button.text = "全画面解除" if is_fullscreen_ui else "全画面"
	var field_margin_size: int = 6 if portrait else (10 if dashboard_mode else 18)
	field_margin.add_theme_constant_override("margin_left", field_margin_size)
	field_margin.add_theme_constant_override("margin_top", field_margin_size)
	field_margin.add_theme_constant_override("margin_right", field_margin_size)
	field_margin.add_theme_constant_override("margin_bottom", field_margin_size)

func _update_playfield_size(schedule_transform: bool = true) -> void:
	if playfield == null:
		return
	var available_size: Vector2 = _get_effective_available_size()
	if available_size.x <= 1.0 or available_size.y <= 1.0:
		available_size = get_parent_area_size()
	if available_size.x <= 1.0 or available_size.y <= 1.0:
		available_size = get_viewport_rect().size

	var horizontal_padding: float = 20.0 if dashboard_mode else 40.0
	playfield_portrait = available_size.y > available_size.x * 1.08
	_apply_responsive_controls(available_size)
	if playfield_portrait:
		playfield.ratio = 1.0 / PLAYFIELD_RATIO
		var horizontal_padding_portrait: float = 12.0 if dashboard_mode else 18.0
		var reserved_height: float = 88.0 if dashboard_mode else 165.0
		var height_limited_width: float = maxf(240.0, (available_size.y - reserved_height) / PLAYFIELD_RATIO)
		var max_portrait_width: float = minf(760.0, height_limited_width)
		var min_portrait_width: float = minf(300.0, max_portrait_width)
		var target_portrait_width: float = clampf(available_size.x - horizontal_padding_portrait, min_portrait_width, max_portrait_width)
		playfield.custom_minimum_size = Vector2(target_portrait_width, target_portrait_width * PLAYFIELD_RATIO)
	else:
		playfield.ratio = PLAYFIELD_RATIO
		var height_limited_width: float = maxf(360.0, (available_size.y - 118.0) * PLAYFIELD_RATIO)
		var max_width: float = minf(820.0, maxf(320.0, available_size.x - horizontal_padding)) if dashboard_mode else minf(1680.0, height_limited_width)
		var min_width: float = minf(360.0, max_width) if dashboard_mode else 360.0
		var target_width: float = clampf(available_size.x - horizontal_padding, min_width, max_width)
		playfield.custom_minimum_size = Vector2(target_width, target_width / PLAYFIELD_RATIO)
	if schedule_transform:
		_schedule_playfield_transform()

func _get_effective_available_size() -> Vector2:
	var local_size: Vector2 = size
	var browser_size: Vector2 = _get_browser_viewport_size()
	if browser_size.x > 1.0 and browser_size.y > 1.0:
		if browser_size.y > browser_size.x and local_size.y <= local_size.x:
			return browser_size
	return local_size

func _get_browser_viewport_size() -> Vector2:
	if not OS.has_feature("web") or not Engine.has_singleton("JavaScriptBridge"):
		return Vector2.ZERO
	var width_variant: Variant = JavaScriptBridge.eval("window.visualViewport ? window.visualViewport.width : window.innerWidth", true)
	var height_variant: Variant = JavaScriptBridge.eval("window.visualViewport ? window.visualViewport.height : window.innerHeight", true)
	return Vector2(float(width_variant), float(height_variant))

func _schedule_playfield_refresh(frame_count: int = 6) -> void:
	playfield_refresh_token += 1
	call_deferred("_refresh_playfield_for_frames", playfield_refresh_token, frame_count)

func _refresh_playfield_for_frames(token: int, frame_count: int) -> void:
	for _index in frame_count:
		if token != playfield_refresh_token:
			return
		_update_playfield_size(false)
		_update_playfield_transform()
		await get_tree().process_frame
	if token == playfield_refresh_token:
		_update_playfield_size(false)
		_update_playfield_transform()

func _schedule_playfield_transform() -> void:
	call_deferred("_update_playfield_transform")
	call_deferred("_update_playfield_transform_after_frame")

func _update_playfield_transform_after_frame() -> void:
	await get_tree().process_frame
	_update_playfield_transform()

func _update_playfield_transform() -> void:
	if playfield == null or playfield_stack == null:
		return
	var target_size: Vector2 = playfield.size
	if target_size.x <= 1.0 or target_size.y <= 1.0:
		return

	playfield.clip_contents = true
	playfield_stack.pivot_offset = Vector2.ZERO
	if playfield_portrait:
		playfield_stack.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
		playfield_stack.rotation_degrees = 90.0
		playfield_stack.position = Vector2(target_size.x, 0.0)
		var rotated_stack_size: Vector2 = Vector2(target_size.y, target_size.x)
		playfield_stack.size = rotated_stack_size
		_apply_layer_size(playfield_image, rotated_stack_size)
		_apply_layer_size(field_display, rotated_stack_size)
	else:
		playfield_stack.rotation_degrees = 0.0
		playfield_stack.position = Vector2.ZERO
		playfield_stack.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
		_apply_layer_full_rect(playfield_image)
		_apply_layer_full_rect(field_display)

	if field_display.has_method("refresh_layout"):
		field_display.call("refresh_layout")

func _apply_layer_size(layer: Control, target_size: Vector2) -> void:
	if layer == null:
		return
	layer.set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	layer.position = Vector2.ZERO
	layer.size = target_size

func _apply_layer_full_rect(layer: Control) -> void:
	if layer == null:
		return
	layer.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

func _toggle_fullscreen() -> void:
	_set_fullscreen_enabled(not is_fullscreen_ui)

func toggle_fullscreen_ui() -> void:
	_toggle_fullscreen()

func set_fullscreen_ui_enabled(enabled: bool) -> void:
	if is_fullscreen_ui == enabled:
		return
	_set_fullscreen_enabled(enabled)

func _set_fullscreen_enabled(enabled: bool) -> void:
	is_fullscreen_ui = enabled
	fullscreen_ui_toggled.emit(enabled)
	_apply_responsive_controls(_get_effective_available_size())
	refresh_responsive_layout()

	if OS.has_feature("web"):
		_set_web_fullscreen(enabled)
	else:
		var target_mode: int = DisplayServer.WINDOW_MODE_FULLSCREEN if enabled else DisplayServer.WINDOW_MODE_WINDOWED
		if DisplayServer.window_get_mode() != target_mode:
			DisplayServer.window_set_mode(target_mode)

func _set_web_fullscreen(enabled: bool) -> void:
	if not Engine.has_singleton("JavaScriptBridge"):
		return

	var command: String = ""
	if enabled:
		command = """
			if (!document.fullscreenElement) {
				document.documentElement.requestFullscreen();
			}
		"""
	else:
		command = """
			if (document.fullscreenElement) {
				document.exitFullscreen();
			}
		"""
	JavaScriptBridge.eval(command)

func _disable_button_focus() -> void:
	randomize_button.focus_mode = Control.FOCUS_NONE
	reset_button.focus_mode = Control.FOCUS_NONE
	fullscreen_button.focus_mode = Control.FOCUS_NONE
	ready_button.focus_mode = Control.FOCUS_NONE

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
