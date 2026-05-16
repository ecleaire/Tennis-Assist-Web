extends Control

signal navigate_requested(screen_name: String)

func _ready() -> void:
	$Layout/ActionsFlow/TimerAction.pressed.connect(_emit_navigation.bind("timer"))
	$Layout/ActionsFlow/BallAction.pressed.connect(_emit_navigation.bind("balls"))
	$Layout/ActionsFlow/RecordAction.pressed.connect(_emit_navigation.bind("records"))
	$Layout/ActionsFlow/RuleAction.pressed.connect(_emit_navigation.bind("rules"))
	$Layout/ActionsFlow/NewsAction.pressed.connect(_emit_navigation.bind("news"))
	_update_grid_columns()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_update_grid_columns()

func _emit_navigation(screen_name: String) -> void:
	navigate_requested.emit(screen_name)

func _update_grid_columns() -> void:
	$Layout/FeatureGrid.columns = 1 if size.x < 1050.0 else 2
