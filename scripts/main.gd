extends Control

const WROTheme = preload("res://scripts/ui/wro_theme.gd")
const TimerScreenScene = preload("res://scenes/screens/TimerScreen.tscn")
const BallRandomizerScreenScene = preload("res://scenes/screens/BallRandomizerScreen.tscn")
const DevelopmentScreenScript = preload("res://scripts/screens/development_screen.gd")

const TITLE_NORMAL_BBCODE: String = "[font_size=30]WRO RoboSports Assist[/font_size]"
const TITLE_ADMIN_BBCODE: String = "[font_size=30][color=#9BE23D]WRO RoboSports Assist Master[/color][/font_size]"
const ADMIN_ENTRY_PRESS_COUNT: int = 10

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
var dashboard_ball_screen: Control
var dashboard_timer_screen: Control
var dashboard_ball_fullscreen_active: bool = false
var dashboard_timer_fullscreen_active: bool = false
var admin_link_press_streak: int = 0
var admin_mode_enabled: bool = false
var development_button: Button
var admin_exit_button: Button

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
	title_label.text = TITLE_ADMIN_BBCODE if admin_mode_enabled else TITLE_NORMAL_BBCODE

func _connect_nav_buttons() -> void:
	for screen_name_variant in nav_buttons.keys():
		var screen_name: String = String(screen_name_variant)
		var button_variant: Variant = nav_buttons[screen_name]
		if button_variant is Button:
			var button: Button = button_variant
			if screen_name == "links":
				button.pressed.connect(_on_links_button_pressed)
			else:
				button.pressed.connect(_on_nav_button_pressed.bind(screen_name))

func _on_nav_button_pressed(screen_name: String) -> void:
	admin_link_press_streak = 0
	_show_screen(screen_name)

func _on_links_button_pressed() -> void:
	admin_link_press_streak += 1
	# 通常UIには管理者機能を出さず、リンク連打だけで一時的に入口を開きます。
	if not admin_mode_enabled and admin_link_press_streak >= ADMIN_ENTRY_PRESS_COUNT:
		_enable_admin_mode()
	_show_screen("links")

func _enable_admin_mode() -> void:
	admin_mode_enabled = true
	admin_link_press_streak = 0
	# 管理者画面は通常利用では不要なので、MasterModeに入った時だけ生成します。
	if development_button == null:
		_create_development_screen()
	_update_title_label()
	if development_button != null:
		development_button.visible = true
	if admin_exit_button != null:
		admin_exit_button.visible = true

func _disable_admin_mode() -> void:
	admin_mode_enabled = false
	admin_link_press_streak = 0
	_update_title_label()
	if development_button != null:
		development_button.visible = false
	if admin_exit_button != null:
		admin_exit_button.visible = false
	if current_screen == "development":
		_show_screen("dashboard")

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
	if ball_screen != null:
		if ball_screen is Control:
			dashboard_ball_screen = ball_screen
		if ball_screen.has_signal("fullscreen_ui_toggled"):
			ball_screen.connect("fullscreen_ui_toggled", Callable(self, "_on_dashboard_ball_fullscreen_toggled"))

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

func _create_development_screen() -> void:
	var development_screen: Control = DevelopmentScreenScript.new()
	development_screen.name = "DevelopmentScreen"
	development_screen.visible = false
	development_screen.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	development_screen.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	development_screen.size_flags_vertical = Control.SIZE_EXPAND_FILL
	screen_host.add_child(development_screen)

	development_button = Button.new()
	development_button.text = "開発中"
	development_button.visible = false
	development_button.custom_minimum_size = Vector2(110, 48)
	development_button.pressed.connect(_on_nav_button_pressed.bind("development"))
	nav_flow.add_child(development_button)

	admin_exit_button = Button.new()
	admin_exit_button.text = "管理者表示を終了"
	admin_exit_button.visible = false
	admin_exit_button.custom_minimum_size = Vector2(170, 48)
	admin_exit_button.pressed.connect(_disable_admin_mode)
	nav_flow.add_child(admin_exit_button)
	var links_button_variant: Variant = nav_buttons.get("links")
	if links_button_variant is Button:
		var links_index: int = nav_flow.get_children().find(links_button_variant)
		if links_index >= 0:
			nav_flow.move_child(admin_exit_button, links_index)
			nav_flow.move_child(development_button, links_index + 1)

	nav_buttons["development"] = development_button
	screens["development"] = development_screen

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
	title.name = "DashboardTitle"
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
	var fullscreen_active: bool = dashboard_ball_fullscreen_active or dashboard_timer_fullscreen_active
	dashboard_body.vertical = portrait or fullscreen_active
	dashboard_body.custom_minimum_size = Vector2(0, 720 if portrait else 460)

	dashboard_ball_panel.visible = not dashboard_timer_fullscreen_active
	dashboard_timer_panel.visible = not dashboard_ball_fullscreen_active
	_set_dashboard_card_fullscreen(dashboard_ball_panel, dashboard_ball_fullscreen_active)
	_set_dashboard_card_fullscreen(dashboard_timer_panel, dashboard_timer_fullscreen_active)
	if dashboard_ball_fullscreen_active:
		dashboard_ball_panel.custom_minimum_size = Vector2(0, maxf(520.0, viewport_size.y - 48.0))
		return
	if dashboard_timer_fullscreen_active:
		dashboard_timer_panel.custom_minimum_size = Vector2(0, maxf(520.0, viewport_size.y - 48.0))
		return

	if portrait:
		dashboard_ball_panel.custom_minimum_size = Vector2(0, 500)
		dashboard_timer_panel.custom_minimum_size = Vector2(0, 430)
	else:
		dashboard_ball_panel.custom_minimum_size = Vector2(560, 0)
		dashboard_timer_panel.custom_minimum_size = Vector2(420, 0)

func _set_dashboard_card_fullscreen(panel: PanelContainer, fullscreen: bool) -> void:
	if panel == null:
		return
	var margin: MarginContainer = panel.get_node_or_null("DashboardMargin") as MarginContainer
	if margin != null:
		var margin_size: int = 0 if fullscreen else 16
		margin.add_theme_constant_override("margin_left", margin_size)
		margin.add_theme_constant_override("margin_top", margin_size)
		margin.add_theme_constant_override("margin_right", margin_size)
		margin.add_theme_constant_override("margin_bottom", margin_size)

	var stack: VBoxContainer = panel.get_node_or_null("DashboardMargin/DashboardStack") as VBoxContainer
	if stack != null:
		stack.add_theme_constant_override("separation", 0 if fullscreen else 12)
		var title: Label = stack.get_node_or_null("DashboardTitle") as Label
		if title != null:
			title.visible = not fullscreen

func _on_dashboard_ball_fullscreen_toggled(is_compact: bool) -> void:
	dashboard_ball_fullscreen_active = is_compact
	if is_compact and dashboard_timer_screen != null and dashboard_timer_screen.has_method("set_fullscreen_ui_enabled"):
		dashboard_timer_screen.call("set_fullscreen_ui_enabled", false)
	if current_screen == "dashboard":
		_set_competition_chrome_hidden(is_compact)
	_update_dashboard_layout()

func _on_dashboard_timer_fullscreen_toggled(is_compact: bool) -> void:
	dashboard_timer_fullscreen_active = is_compact
	if is_compact and dashboard_ball_screen != null and dashboard_ball_screen.has_method("set_fullscreen_ui_enabled"):
		dashboard_ball_screen.call("set_fullscreen_ui_enabled", false)
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
	if screen_name == "development" and not admin_mode_enabled:
		return

	current_screen = screen_name
	_set_dashboard_runtime_active(screen_name == "dashboard")
	for key_variant in screens.keys():
		var key: String = String(key_variant)
		var screen_variant: Variant = screens[key]
		var button_variant: Variant = nav_buttons.get(key)
		if screen_variant is Control and button_variant is Button:
			var screen: Control = screen_variant
			var button: Button = button_variant
			var is_active: bool = key == screen_name
			screen.visible = is_active
			if key == "timer" or key == "balls":
				screen.set_process_unhandled_input(is_active)
			_set_screen_runtime_active(screen, is_active)
			if is_active and screen.has_method("refresh_responsive_layout"):
				screen.call_deferred("refresh_responsive_layout")
			_set_button_selected(button, is_active)
	call_deferred("_reset_current_screen_scroll")
	call_deferred("_reset_browser_scroll")

func _set_screen_runtime_active(screen: Control, active: bool) -> void:
	if screen.has_method("set_screen_active"):
		screen.call("set_screen_active", active)

func _set_dashboard_runtime_active(active: bool) -> void:
	for screen in [dashboard_ball_screen, dashboard_timer_screen]:
		if screen == null:
			continue
		if screen.has_method("set_screen_active"):
			screen.call("set_screen_active", active)

func _reset_current_screen_scroll() -> void:
	var scroll_container: ScrollContainer = _current_screen_scroll_container()
	if scroll_container != null:
		scroll_container.scroll_vertical = 0

func _reset_browser_scroll() -> void:
	if OS.has_feature("web") and Engine.has_singleton("JavaScriptBridge"):
		JavaScriptBridge.eval("window.scrollTo(0, 0)", true)

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
