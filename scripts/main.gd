extends Control

const WROTheme = preload("res://scripts/ui/wro_theme.gd")
const TimerScreenScene = preload("res://scenes/screens/TimerScreen.tscn")
const BallRandomizerScreenScene = preload("res://scenes/screens/BallRandomizerScreen.tscn")

const TITLE_NORMAL_BBCODE: String = "[font_size=30]WRO RoboSports Assist[/font_size]"

@onready var outer_margin: MarginContainer = $MarginContainer
@onready var root_layout: VBoxContainer = $MarginContainer/RootLayout
@onready var header_panel: PanelContainer = $MarginContainer/RootLayout/HeaderPanel
@onready var content_panel: PanelContainer = $MarginContainer/RootLayout/ContentPanel
@onready var content_margin: MarginContainer = $MarginContainer/RootLayout/ContentPanel/ContentMargin
@onready var title_label: RichTextLabel = $MarginContainer/RootLayout/HeaderPanel/HeaderMargin/HeaderRow/TitleBlock/TitleLabel
@onready var nav_flow: HFlowContainer = $MarginContainer/RootLayout/HeaderPanel/HeaderMargin/HeaderRow/NavFlow
@onready var screen_host: Control = $MarginContainer/RootLayout/ContentPanel/ContentMargin/ScreenHost
@onready var nav_buttons: Dictionary = {
	"timer": $MarginContainer/RootLayout/HeaderPanel/HeaderMargin/HeaderRow/NavFlow/TimerButton,
	"balls": $MarginContainer/RootLayout/HeaderPanel/HeaderMargin/HeaderRow/NavFlow/BallsButton,
	"records": $MarginContainer/RootLayout/HeaderPanel/HeaderMargin/HeaderRow/NavFlow/RecordsButton,
	"rules": $MarginContainer/RootLayout/HeaderPanel/HeaderMargin/HeaderRow/NavFlow/RulesButton,
	"news": $MarginContainer/RootLayout/HeaderPanel/HeaderMargin/HeaderRow/NavFlow/NewsButton,
	"links": $MarginContainer/RootLayout/HeaderPanel/HeaderMargin/HeaderRow/NavFlow/LinksButton
}
@onready var screens: Dictionary = {
	"timer": $MarginContainer/RootLayout/ContentPanel/ContentMargin/ScreenHost/TimerScreen,
	"balls": $MarginContainer/RootLayout/ContentPanel/ContentMargin/ScreenHost/BallRandomizerScreen,
	"records": $MarginContainer/RootLayout/ContentPanel/ContentMargin/ScreenHost/MatchRecordScreen,
	"rules": $MarginContainer/RootLayout/ContentPanel/ContentMargin/ScreenHost/RuleViewerScreen,
	"news": $MarginContainer/RootLayout/ContentPanel/ContentMargin/ScreenHost/NewsScreen,
	"links": $MarginContainer/RootLayout/ContentPanel/ContentMargin/ScreenHost/LinksScreen
}

var current_screen: String = "dashboard"
var flow_status_panel: PanelContainer
var flow_status_label: Label
var flow_current_match_number: int = 0
var flow_status_active: bool = false
var dashboard_body: BoxContainer
var dashboard_ball_panel: PanelContainer
var dashboard_timer_panel: PanelContainer
var dashboard_timer_screen: Control
var dashboard_timer_fullscreen_active: bool = false

func _ready() -> void:
	_apply_theme()
	_create_flow_status_bar()
	_create_dashboard_screen()
	_update_title_label()
	_connect_nav_buttons()
	_connect_fullscreen_signal()
	_connect_competition_flow_signals()
	_show_screen(current_screen)

func _apply_theme() -> void:
	theme = WROTheme.create_theme()

func _update_title_label() -> void:
	title_label.text = TITLE_NORMAL_BBCODE

func _connect_nav_buttons() -> void:
	for screen_name_variant in nav_buttons.keys():
		var screen_name: String = String(screen_name_variant)
		var button_variant: Variant = nav_buttons[screen_name]
		if button_variant is Button:
			var button: Button = button_variant
			button.pressed.connect(_show_screen.bind(screen_name))

func _connect_fullscreen_signal() -> void:
	var timer_screen_variant: Variant = screens["timer"]
	if timer_screen_variant is Control:
		var timer_screen: Control = timer_screen_variant
		if timer_screen.has_signal("fullscreen_ui_toggled"):
			timer_screen.connect("fullscreen_ui_toggled", Callable(self, "_set_competition_chrome_hidden"))
	var balls_screen_variant: Variant = screens.get("balls")
	if balls_screen_variant is Control:
		var balls_screen: Control = balls_screen_variant
		if balls_screen.has_signal("fullscreen_ui_toggled"):
			balls_screen.connect("fullscreen_ui_toggled", Callable(self, "_set_competition_chrome_hidden"))

func _connect_competition_flow_signals() -> void:
	# Main owns the automatic competition flow between screens.
	var records_screen_variant: Variant = screens.get("records")
	if records_screen_variant is Control:
		var records_screen: Control = records_screen_variant
		if records_screen.has_signal("series_started"):
			records_screen.connect("series_started", Callable(self, "_on_series_started"))
		if records_screen.has_signal("match_saved_for_next_match"):
			records_screen.connect("match_saved_for_next_match", Callable(self, "_on_match_saved_for_next_match"))
		if records_screen.has_signal("requested_ball_preparation"):
			records_screen.connect("requested_ball_preparation", Callable(self, "_on_record_requested_ball_preparation"))
		if records_screen.has_signal("requested_timer_return"):
			records_screen.connect("requested_timer_return", Callable(self, "_on_record_requested_timer_return"))
		if records_screen.has_signal("requested_match_restart"):
			records_screen.connect("requested_match_restart", Callable(self, "_on_record_requested_match_restart"))
		if records_screen.has_signal("series_completed"):
			records_screen.connect("series_completed", Callable(self, "_on_series_completed"))

	var balls_screen_variant: Variant = screens.get("balls")
	if balls_screen_variant is Control:
		var balls_screen: Control = balls_screen_variant
		if balls_screen.has_signal("preparation_completed"):
			balls_screen.connect("preparation_completed", Callable(self, "_on_ball_preparation_completed"))

	var timer_screen_variant: Variant = screens.get("timer")
	if timer_screen_variant is Control:
		var timer_screen: Control = timer_screen_variant
		if timer_screen.has_signal("match_finished"):
			timer_screen.connect("match_finished", Callable(self, "_on_timer_match_finished"))

func _create_dashboard_screen() -> void:
	var dashboard_scroll: ScrollContainer = ScrollContainer.new()
	dashboard_scroll.name = "Scroll"
	dashboard_scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	dashboard_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	dashboard_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	screen_host.add_child(dashboard_scroll)
	screen_host.move_child(dashboard_scroll, 0)

	dashboard_body = BoxContainer.new()
	dashboard_body.name = "DashboardBody"
	dashboard_body.vertical = true
	dashboard_body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	dashboard_body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	dashboard_body.add_theme_constant_override("separation", 14)
	dashboard_scroll.add_child(dashboard_body)

	dashboard_ball_panel = _create_dashboard_card("ボール配置", BallRandomizerScreenScene.instantiate())
	dashboard_timer_panel = _create_dashboard_card("タイマー", TimerScreenScene.instantiate())
	dashboard_body.add_child(dashboard_ball_panel)
	dashboard_body.add_child(dashboard_timer_panel)

	var ball_screen: Node = dashboard_ball_panel.get_node("DashboardMargin/DashboardStack/BallRandomizerScreen")
	if ball_screen != null and ball_screen.has_method("set_dashboard_mode"):
		ball_screen.call_deferred("set_dashboard_mode", true)

	var timer_screen: Node = dashboard_timer_panel.get_node("DashboardMargin/DashboardStack/TimerScreen")
	if timer_screen != null:
		if timer_screen is Control:
			dashboard_timer_screen = timer_screen
		timer_screen.set_process_unhandled_input(false)
		if timer_screen.has_signal("fullscreen_ui_toggled"):
			timer_screen.connect("fullscreen_ui_toggled", Callable(self, "_on_dashboard_timer_fullscreen_toggled"))
		if timer_screen.has_method("set_dashboard_mode"):
			timer_screen.call_deferred("set_dashboard_mode", true)

	var dashboard_button: Button = Button.new()
	dashboard_button.text = "ホーム"
	dashboard_button.custom_minimum_size = Vector2(110, 48)
	nav_flow.add_child(dashboard_button)
	nav_flow.move_child(dashboard_button, 0)

	nav_buttons["dashboard"] = dashboard_button
	screens["dashboard"] = dashboard_scroll
	_update_dashboard_layout()

func _create_dashboard_card(title_text: String, content: Node) -> PanelContainer:
	var panel: PanelContainer = PanelContainer.new()
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var margin: MarginContainer = MarginContainer.new()
	margin.name = "DashboardMargin"
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	panel.add_child(margin)

	var stack: VBoxContainer = VBoxContainer.new()
	stack.name = "DashboardStack"
	stack.add_theme_constant_override("separation", 8)
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	margin.add_child(stack)

	var title: Label = Label.new()
	title.text = title_text
	title.add_theme_font_size_override("font_size", 20)
	stack.add_child(title)

	if content is Control:
		var control: Control = content
		control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		control.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stack.add_child(content)
	return panel

func _update_dashboard_layout() -> void:
	if dashboard_body == null:
		return

	var viewport_size: Vector2 = get_viewport_rect().size
	var portrait: bool = viewport_size.y >= viewport_size.x
	dashboard_body.vertical = portrait or dashboard_timer_fullscreen_active
	dashboard_body.custom_minimum_size = Vector2(0, 720 if portrait else 460)

	dashboard_ball_panel.visible = not dashboard_timer_fullscreen_active
	if dashboard_timer_fullscreen_active:
		dashboard_timer_panel.custom_minimum_size = Vector2(0, maxf(520.0, viewport_size.y - 48.0))
		return

	if portrait:
		dashboard_ball_panel.custom_minimum_size = Vector2(0, 500)
		dashboard_timer_panel.custom_minimum_size = Vector2(0, 430)
	else:
		dashboard_ball_panel.custom_minimum_size = Vector2(560, 0)
		dashboard_timer_panel.custom_minimum_size = Vector2(420, 0)

func _on_dashboard_timer_fullscreen_toggled(is_compact: bool) -> void:
	dashboard_timer_fullscreen_active = is_compact
	if current_screen == "dashboard":
		_set_competition_chrome_hidden(is_compact)
	_update_dashboard_layout()

func _on_series_started(match_number: int) -> void:
	_open_ball_preparation(match_number)

func _on_match_saved_for_next_match(match_number: int) -> void:
	_open_ball_preparation(match_number)

func _open_ball_preparation(match_number: int) -> void:
	_set_flow_status(match_number, "ボール配置中")
	_show_screen("balls")
	var balls_screen_variant: Variant = screens.get("balls")
	if balls_screen_variant != null and balls_screen_variant.has_method("begin_match_preparation"):
		balls_screen_variant.call("begin_match_preparation", match_number)

func _on_ball_preparation_completed(match_number: int) -> void:
	_set_flow_status(match_number, "タイマー待機中")
	_show_screen("timer")
	var timer_screen_variant: Variant = screens.get("timer")
	if timer_screen_variant != null and timer_screen_variant.has_method("prepare_match_timer"):
		timer_screen_variant.call("prepare_match_timer", match_number)

func _on_timer_match_finished(_finish_type: String) -> void:
	if not flow_status_active:
		return

	_hide_flow_status()
	_set_competition_chrome_hidden(false)
	_show_screen("records")
	var records_screen_variant: Variant = screens.get("records")
	if records_screen_variant != null and records_screen_variant.has_method("focus_result_entry_after_match"):
		records_screen_variant.call_deferred("focus_result_entry_after_match")

func _on_record_requested_ball_preparation(match_number: int) -> void:
	_open_ball_preparation(match_number)

func _on_record_requested_timer_return(match_number: int) -> void:
	_set_flow_status(match_number, "タイマー確認中")
	_show_screen("timer")

func _on_record_requested_match_restart(match_number: int) -> void:
	_open_ball_preparation(match_number)

func _on_series_completed() -> void:
	_hide_flow_status()

func _create_flow_status_bar() -> void:
	flow_status_panel = PanelContainer.new()
	flow_status_panel.name = "FlowStatusPanel"
	flow_status_panel.visible = false
	flow_status_panel.custom_minimum_size = Vector2(0, 46)
	flow_status_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 8)
	flow_status_panel.add_child(margin)

	flow_status_label = Label.new()
	flow_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	flow_status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	flow_status_label.add_theme_font_size_override("font_size", 20)
	margin.add_child(flow_status_label)

	root_layout.add_child(flow_status_panel)
	root_layout.move_child(flow_status_panel, 1)

func _set_flow_status(match_number: int, status_text: String) -> void:
	flow_current_match_number = match_number
	flow_status_active = true
	flow_status_panel.visible = header_panel.visible
	flow_status_label.text = "第%dマッチ / %s" % [match_number, status_text]

func _hide_flow_status() -> void:
	flow_current_match_number = 0
	flow_status_active = false
	flow_status_panel.visible = false

func _show_screen(screen_name: String) -> void:
	if not screens.has(screen_name):
		return

	current_screen = screen_name
	for key_variant in screens.keys():
		var key: String = String(key_variant)
		var screen_variant: Variant = screens[key]
		var button_variant: Variant = nav_buttons.get(key)
		if screen_variant is Control and button_variant is Button:
			var screen: Control = screen_variant
			var button: Button = button_variant
			screen.visible = key == screen_name
			if key == "timer" or key == "balls":
				screen.set_process_unhandled_input(key == screen_name)
			if key == screen_name and screen.has_method("refresh_responsive_layout"):
				screen.call_deferred("refresh_responsive_layout")
			_set_button_selected(button, key == screen_name)

func _set_button_selected(button: Button, selected: bool) -> void:
	if selected:
		button.modulate = Color.WHITE
	else:
		button.modulate = Color(0.82, 0.88, 0.98, 1.0)

func _set_competition_chrome_hidden(hidden: bool) -> void:
	header_panel.visible = not hidden
	flow_status_panel.visible = flow_status_active and not hidden
	if hidden:
		content_panel.add_theme_stylebox_override("panel", StyleBoxEmpty.new())
	else:
		content_panel.remove_theme_stylebox_override("panel")

	var outer_margin_size: int = 0 if hidden else 24
	outer_margin.add_theme_constant_override("margin_left", outer_margin_size)
	outer_margin.add_theme_constant_override("margin_top", outer_margin_size)
	outer_margin.add_theme_constant_override("margin_right", outer_margin_size)
	outer_margin.add_theme_constant_override("margin_bottom", outer_margin_size)

	var inner_margin_size: int = 0 if hidden else 18
	content_margin.add_theme_constant_override("margin_left", inner_margin_size)
	content_margin.add_theme_constant_override("margin_top", inner_margin_size)
	content_margin.add_theme_constant_override("margin_right", inner_margin_size)
	content_margin.add_theme_constant_override("margin_bottom", inner_margin_size)

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_update_dashboard_layout()

func _input(event: InputEvent) -> void:
	if current_screen == "dashboard" and event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F:
		if dashboard_timer_screen != null and dashboard_timer_screen.has_method("toggle_fullscreen_ui"):
			dashboard_timer_screen.call("toggle_fullscreen_ui")
			accept_event()
		return

	# Route mobile touch drags to the active screen ScrollContainer.
	if event is InputEventScreenDrag:
		if _scroll_current_screen_by(event.relative.y):
			accept_event()
		return

	# Some mobile browsers send canvas drags as mouse motion instead of touch drag.
	if event is InputEventMouseMotion and (event.button_mask & MOUSE_BUTTON_MASK_LEFT) != 0:
		if absf(event.relative.y) < absf(event.relative.x):
			return
		if _scroll_current_screen_by(event.relative.y):
			accept_event()
		return

	if event is InputEventPanGesture:
		if _scroll_current_screen_by(event.delta.y):
			accept_event()

func _unhandled_input(event: InputEvent) -> void:
	if current_screen != "dashboard":
		return
	if event is InputEventKey and event.pressed and not event.echo and event.keycode == KEY_F:
		if dashboard_timer_screen != null and dashboard_timer_screen.has_method("toggle_fullscreen_ui"):
			dashboard_timer_screen.call("toggle_fullscreen_ui")
			accept_event()

func _scroll_current_screen_by(relative_y: float) -> bool:
	var scroll_container: ScrollContainer = _current_screen_scroll_container()
	if scroll_container == null:
		return false

	scroll_container.scroll_vertical = maxi(0, scroll_container.scroll_vertical - int(relative_y))
	return true

func _current_screen_scroll_container() -> ScrollContainer:
	var screen_variant: Variant = screens.get(current_screen)
	if not (screen_variant is Node):
		return null

	var screen_node: Node = screen_variant
	var scroll_node: Node = screen_node.get_node_or_null("Scroll")
	if scroll_node is ScrollContainer:
		return scroll_node
	return null
