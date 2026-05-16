extends Control

signal preparation_completed(match_number: int)

@onready var field_display: Control = $Layout/FieldPanel/FieldMargin/FieldCenter/Playfield/PlayfieldStack/FieldDisplay
@onready var status_label: Label = $Layout/Toolbar/StatusLabel
@onready var ready_button: Button = $Layout/Toolbar/ReadyButton

var workflow_match_number: int = 0
var workflow_preparation_active: bool = false

func _ready() -> void:
	$Layout/Toolbar/RandomizeButton.pressed.connect(_randomize)
	$Layout/Toolbar/ResetButton.pressed.connect(_reset_layout)
	ready_button.pressed.connect(_complete_preparation)
	ready_button.visible = false
	status_label.text = "4 lines are ready. Purple balls are mirrored by 180 degrees."

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
		status_label.text = "Waiting for initial ball positions. Please try again."
		return false

	field_display.animate_random_layout()
	status_label.text = "Ball placement generated."
	if workflow_preparation_active:
		ready_button.visible = true
		ready_button.disabled = false
	return true

func _reset_layout() -> void:
	if field_display.has_method("is_layout_ready") and not field_display.call("is_layout_ready"):
		status_label.text = "Waiting for initial ball positions. Please try again."
		return

	field_display.set_default_layout()
	status_label.text = "Ball placement reset to the adjusted initial positions."
	if workflow_preparation_active:
		ready_button.visible = false
		ready_button.disabled = true

func _complete_preparation() -> void:
	if not workflow_preparation_active:
		return
	workflow_preparation_active = false
	ready_button.visible = false
	preparation_completed.emit(workflow_match_number)
