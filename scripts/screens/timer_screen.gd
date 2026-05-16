extends Control

signal fullscreen_ui_toggled(is_compact: bool)
signal match_finished(finish_type: String)

const MIN_DURATION: int = 60
const MAX_DURATION: int = 120

const RANDOM_STEP_ONE_SECOND: int = 1
const RANDOM_STEP_FIVE_SECONDS: int = 5
const RANDOM_STEP_TEN_SECONDS: int = 10
const RANDOM_MODE_MANUAL: int = -1

const MENU_ID_ONE_SECOND: int = 0
const MENU_ID_FIVE_SECONDS: int = 1
const MENU_ID_TEN_SECONDS: int = 2
const MENU_ID_MANUAL: int = 3
const SPACE_DOUBLE_PRESS_WINDOW_MS: int = 450

const NORMAL_MANUAL_MINUTE_MAX: int = 2

const HINT_TEXT: String = "Space / Enter: 開始    Enter / Space２回: 一時停止    F: 全画面"
const PAUSE_HINT_TEXT: String = "Space / Enter: 再開    F: 全画面"
const END_HINT_TEXT: String = "ランダム再生成で新しいタイマーを作れます。"
const PREPARE_TEXT: String = "試合準備完了"
const RUNNING_TEXT: String = "試合進行中"
const PAUSED_TEXT: String = "一時停止中"
const FINISHED_TEXT: String = "終了"
const COLD_NOTICE_TEXT: String = "ここからコールドが適用されます"
const PAUSE_NOTICE_TEXT: String = "タイマーを一時停止しています"
const RANGE_LABEL_TEXT: String = "ランダム範囲: 1:00〜2:00"

const COLD_NOTICE_TRIGGER_SECONDS: float = 30.0
const COLD_NOTICE_DURATION: float = 10.0
const TEN_COUNT_DURATION: float = 10.0
const FIVE_COUNT_DURATION: float = 5.0
const PROGRESS_NORMAL_COLOR: Color = Color("2ea8ff")
const PROGRESS_WARNING_COLOR: Color = Color("ff5d73")
const SUB_TIMER_ACCENT_COLOR: Color = Color(1.0, 0.0, 0.0, 1.0)
const HINT_CAPTION_COLOR: Color = Color.WHITE

@onready var overlay: MarginContainer = $Overlay
@onready var header_row: HBoxContainer = $Overlay/Layout/HeaderRow
@onready var mode_label: Label = $Overlay/Layout/HeaderRow/ModeLabel
@onready var range_label: Label = $Overlay/Layout/HeaderRow/RangeLabel
@onready var cold_notice_label: Label = $Overlay/Layout/TimerCenter/TimerStack/ColdNoticeLabel
@onready var timer_label: Label = $Overlay/Layout/TimerCenter/TimerStack/TimerLabel
@onready var sub_timer_caption_label: Label = $Overlay/Layout/TimerCenter/TimerStack/SubTimerRow/SubTimerCaptionLabel
@onready var sub_timer_label: Label = $Overlay/Layout/TimerCenter/TimerStack/SubTimerRow/SubTimerLabel
@onready var progress_bar: ProgressBar = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ProgressBar
@onready var start_button: Button = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/StartButton
@onready var end_button: Button = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/StopButton
@onready var fullscreen_button: Button = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/FullscreenButton
@onready var reset_button: Button = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/ResetButton
@onready var random_option_count_button: Button = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/RandomOptionCountButton
@onready var ten_count_button: Button = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/TenCountButton
@onready var five_count_button: Button = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/FiveCountButton
@onready var legacy_hint_label: Label = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/HintLabel
@onready var count_spacer4: Control = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/CountSpacer4
@onready var count_spacer5: Control = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/CountSpacer5
@onready var count_spacer6: Control = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/CountSpacer6
@onready var count_spacer7: Control = $Overlay/Layout/BottomPanel/BottomMargin/BottomStack/ControlsRow/CountSpacer7
@onready var random_interval_menu: PopupMenu = $RandomIntervalMenu
@onready var manual_time_popup: PopupPanel = $ManualTimePopup
@onready var manual_minute_option: OptionButton = $ManualTimePopup/ManualTimeMargin/ManualTimeLayout/ManualSelectors/MinuteOption
@onready var manual_second_option: OptionButton = $ManualTimePopup/ManualTimeMargin/ManualTimeLayout/ManualSelectors/SecondOption
@onready var manual_cancel_button: Button = $ManualTimePopup/ManualTimeMargin/ManualTimeLayout/ManualButtons/ManualCancelButton
@onready var manual_apply_button: Button = $ManualTimePopup/ManualTimeMargin/ManualTimeLayout/ManualButtons/ManualApplyButton

const HIDDEN_BUTTON_MODULATE: Color = Color(1, 1, 1, 0)

var total_duration: int = 90
var remaining_time: float = 90.0
var is_running: bool = false
var is_compact_fullscreen_ui: bool = false
var cold_notice_has_triggered: bool = false
var cold_notice_remaining: float = 0.0
var sub_timer_remaining: float = 0.0
var sub_timer_running: bool = false
var sub_timer_total: float = 0.0
var sub_timer_caption_text: String = ""
var random_step_seconds: int = RANDOM_STEP_FIVE_SECONDS
var manual_duration_seconds: int = 90
var progress_fill_style: StyleBoxFlat
var bottom_caption_text: String = HINT_TEXT
var last_space_press_msec: int = -1000
var timer_has_started: bool = false
var match_finish_signal_emitted: bool = false
var dashboard_mode: bool = false

func _ready() -> void:
	randomize()
	_setup_random_interval_menu()
	_setup_manual_time_options()
	start_button.pressed.connect(_toggle_start_stop)
	end_button.pressed.connect(_end_timer)
	fullscreen_button.pressed.connect(_toggle_fullscreen)
	reset_button.pressed.connect(_reset_timer)
	random_option_count_button.pressed.connect(_show_random_interval_menu)
	ten_count_button.pressed.connect(_toggle_ten_count)
	five_count_button.pressed.connect(_toggle_five_count)
	manual_cancel_button.pressed.connect(manual_time_popup.hide)
	manual_apply_button.pressed.connect(_apply_manual_duration)
	_disable_button_focus()
	_apply_static_text()
	_setup_progress_styles()
	legacy_hint_label.visible = false
	_reset_timer()
	set_process(true)
	_update_responsive_sizes()
	_apply_compact_ui(false)

func set_dashboard_mode(enabled: bool) -> void:
	dashboard_mode = enabled
	if not is_node_ready():
		return
	_apply_dashboard_mode()
	_update_control_visibility()
	_update_responsive_sizes()

func _apply_dashboard_mode() -> void:
	header_row.visible = not dashboard_mode and not is_compact_fullscreen_ui
	legacy_hint_label.visible = false
	var margin_size: int = 8 if dashboard_mode else 0
	overlay.add_theme_constant_override("margin_left", margin_size)
	overlay.add_theme_constant_override("margin_top", margin_size)
	overlay.add_theme_constant_override("margin_right", margin_size)
	overlay.add_theme_constant_override("margin_bottom", margin_size)

func _setup_random_interval_menu() -> void:
	random_interval_menu.clear()
	random_interval_menu.add_item("1秒単位", MENU_ID_ONE_SECOND)
	random_interval_menu.add_item("5秒単位", MENU_ID_FIVE_SECONDS)
	random_interval_menu.add_item("10秒単位", MENU_ID_TEN_SECONDS)
	random_interval_menu.add_item("手動指定", MENU_ID_MANUAL)
	if not random_interval_menu.id_pressed.is_connected(_on_random_interval_selected):
		random_interval_menu.id_pressed.connect(_on_random_interval_selected)

func _setup_manual_time_options() -> void:
	var max_minute: int = NORMAL_MANUAL_MINUTE_MAX
	var selected_minute: int = clampi(manual_duration_seconds / 60, 0, max_minute)
	var selected_second: int = manual_duration_seconds % 60

	manual_minute_option.clear()
	for minute: int in range(0, max_minute + 1):
		manual_minute_option.add_item("%d分" % minute, minute)

	manual_second_option.clear()
	for second: int in range(60):
		manual_second_option.add_item("%02d秒" % second, second)

	manual_minute_option.select(selected_minute)
	manual_second_option.select(selected_second)

func _process(delta: float) -> void:
	if is_running:
		remaining_time = maxf(remaining_time - delta, 0.0)

	if sub_timer_running:
		sub_timer_remaining = maxf(sub_timer_remaining - delta, 0.0)
		if sub_timer_remaining <= 0.0:
			sub_timer_running = false
			sub_timer_remaining = 0.0
			_set_sub_timer_visible(false)

	_update_cold_notice(delta)
	_update_timer_visuals()
	_update_sub_timer_visuals()

	if is_running and remaining_time <= 0.0:
		is_running = false
		mode_label.text = FINISHED_TEXT
		_set_bottom_caption_text(END_HINT_TEXT)
		_sync_primary_button()
		_update_control_visibility()
		_emit_match_finished("time")

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_SPACE:
				_handle_space_key()
				accept_event()
			KEY_ENTER, KEY_KP_ENTER:
				_handle_enter_key()
				accept_event()
			KEY_F:
				_toggle_fullscreen()
				accept_event()

func _handle_space_key() -> void:
	if not is_running:
		_toggle_start_stop()
		last_space_press_msec = -1000
		return

	var now_msec: int = Time.get_ticks_msec()
	if now_msec - last_space_press_msec <= SPACE_DOUBLE_PRESS_WINDOW_MS:
		_pause_timer()
		last_space_press_msec = -1000
	else:
		last_space_press_msec = now_msec

func _handle_enter_key() -> void:
	if is_running:
		_pause_timer()
	else:
		_start_timer()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_update_responsive_sizes()

func _toggle_start_stop() -> void:
	if is_running:
		_pause_timer()
	else:
		_start_timer()

func _start_timer() -> void:
	if remaining_time <= 0.0:
		return
	is_running = true
	timer_has_started = true
	last_space_press_msec = -1000
	mode_label.text = RUNNING_TEXT
	_set_bottom_caption_text("")
	if cold_notice_remaining > 0.0:
		cold_notice_label.text = COLD_NOTICE_TEXT
	else:
		cold_notice_label.text = ""
	_sync_primary_button()
	_update_control_visibility()

func _pause_timer() -> void:
	is_running = false
	last_space_press_msec = -1000
	mode_label.text = PAUSED_TEXT
	_set_bottom_caption_text(PAUSE_HINT_TEXT)
	cold_notice_label.text = PAUSE_NOTICE_TEXT
	_sync_primary_button()
	_update_control_visibility()

func _end_timer() -> void:
	is_running = false
	last_space_press_msec = -1000
	remaining_time = 0.0
	mode_label.text = FINISHED_TEXT
	_set_bottom_caption_text(END_HINT_TEXT)
	cold_notice_remaining = 0.0
	_set_cold_notice_visible(false)
	_update_timer_visuals()
	_sync_primary_button()
	_update_control_visibility()
	_emit_match_finished("manual")

func _reset_timer() -> void:
	is_running = false
	timer_has_started = false
	match_finish_signal_emitted = false
	last_space_press_msec = -1000
	total_duration = _generate_duration_from_mode()
	remaining_time = float(total_duration)
	mode_label.text = PREPARE_TEXT
	_set_bottom_caption_text(HINT_TEXT)
	cold_notice_has_triggered = false
	cold_notice_remaining = 0.0
	sub_timer_remaining = 0.0
	sub_timer_running = false
	sub_timer_total = 0.0
	sub_timer_caption_text = ""
	_set_cold_notice_visible(false)
	_set_sub_timer_visible(false)
	_update_timer_visuals()
	_sync_primary_button()
	_update_control_visibility()

func prepare_match_timer(_match_number: int = 0) -> void:
	# Public reset entry point used by the guided match flow.
	_reset_timer()

func _emit_match_finished(finish_type: String) -> void:
	if match_finish_signal_emitted or not timer_has_started:
		return
	match_finish_signal_emitted = true
	match_finished.emit(finish_type)

func _generate_duration_from_mode() -> int:
	if random_step_seconds == RANDOM_MODE_MANUAL:
		return manual_duration_seconds
	if random_step_seconds == RANDOM_STEP_ONE_SECOND:
		return randi_range(MIN_DURATION, MAX_DURATION)

	var step_count: int = ((MAX_DURATION - MIN_DURATION) / random_step_seconds) + 1
	var random_index: int = randi_range(0, step_count - 1)
	return MIN_DURATION + (random_index * random_step_seconds)

func _update_timer_visuals() -> void:
	var whole_seconds: int = int(ceil(remaining_time))
	var minutes: int = whole_seconds / 60
	var seconds: int = whole_seconds % 60
	timer_label.text = "%02d : %02d" % [minutes, seconds]

	if total_duration > 0:
		progress_bar.value = (remaining_time / float(total_duration)) * 100.0
	else:
		progress_bar.value = 0.0

	if remaining_time <= 10.0 and is_running:
		timer_label.modulate = Color("ff5d73")
		_set_progress_fill_color(PROGRESS_WARNING_COLOR)
	elif remaining_time <= 0.0:
		timer_label.modulate = Color("ff5d73")
		_set_progress_fill_color(PROGRESS_WARNING_COLOR)
	else:
		timer_label.modulate = Color.WHITE
		_set_progress_fill_color(PROGRESS_NORMAL_COLOR)

func _update_cold_notice(delta: float) -> void:
	if not cold_notice_has_triggered and is_running:
		var elapsed_time: float = float(total_duration) - remaining_time
		if elapsed_time >= COLD_NOTICE_TRIGGER_SECONDS:
			cold_notice_has_triggered = true
			cold_notice_remaining = COLD_NOTICE_DURATION
			_set_cold_notice_visible(true)

	if cold_notice_remaining > 0.0:
		cold_notice_remaining = maxf(cold_notice_remaining - delta, 0.0)
		if cold_notice_remaining <= 0.0:
			_set_cold_notice_visible(false)

func _toggle_ten_count() -> void:
	_toggle_sub_timer(TEN_COUNT_DURATION, "コールド カウント")

func _toggle_five_count() -> void:
	_toggle_sub_timer(FIVE_COUNT_DURATION, "オーバーボール カウント")

func _toggle_sub_timer(duration: float, caption: String) -> void:
	if sub_timer_running and is_equal_approx(sub_timer_total, duration) and sub_timer_caption_text == caption:
		sub_timer_running = false
		sub_timer_remaining = 0.0
		sub_timer_total = 0.0
		sub_timer_caption_text = ""
		_set_sub_timer_visible(false)
		return

	sub_timer_total = duration
	sub_timer_remaining = duration
	sub_timer_caption_text = caption
	sub_timer_running = true
	_set_sub_timer_visible(true)
	_update_sub_timer_visuals()

func _update_sub_timer_visuals() -> void:
	if sub_timer_label == null:
		return
	if not sub_timer_running and sub_timer_remaining <= 0.0:
		return

	var whole_seconds: int = int(ceil(sub_timer_remaining))
	sub_timer_label.text = "00 : %02d" % whole_seconds
	sub_timer_caption_label.text = sub_timer_caption_text
	_apply_caption_visuals(false)

func _toggle_fullscreen() -> void:
	_set_fullscreen_enabled(not is_compact_fullscreen_ui)

func _set_fullscreen_enabled(enabled: bool) -> void:
	_apply_compact_ui(enabled)

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

func _apply_compact_ui(compact: bool) -> void:
	is_compact_fullscreen_ui = compact
	header_row.visible = not compact and not dashboard_mode
	fullscreen_ui_toggled.emit(compact)
	_apply_dashboard_mode()
	_update_control_visibility()
	_update_responsive_sizes()

func _disable_button_focus() -> void:
	start_button.focus_mode = Control.FOCUS_NONE
	end_button.focus_mode = Control.FOCUS_NONE
	fullscreen_button.focus_mode = Control.FOCUS_NONE
	reset_button.focus_mode = Control.FOCUS_NONE
	random_option_count_button.focus_mode = Control.FOCUS_NONE
	ten_count_button.focus_mode = Control.FOCUS_NONE
	five_count_button.focus_mode = Control.FOCUS_NONE
	manual_cancel_button.focus_mode = Control.FOCUS_NONE
	manual_apply_button.focus_mode = Control.FOCUS_NONE

func _setup_progress_styles() -> void:
	progress_fill_style = StyleBoxFlat.new()
	progress_fill_style.set_corner_radius_all(12)
	progress_fill_style.bg_color = PROGRESS_NORMAL_COLOR
	progress_fill_style.border_color = PROGRESS_NORMAL_COLOR
	progress_fill_style.set_border_width_all(1)
	progress_bar.add_theme_stylebox_override("fill", progress_fill_style)

func _set_progress_fill_color(color: Color) -> void:
	if progress_fill_style == null:
		return
	progress_fill_style.bg_color = color
	progress_fill_style.border_color = color

func _apply_static_text() -> void:
	end_button.text = "終了"
	ten_count_button.text = "10カウント"
	five_count_button.text = "5カウント"
	mode_label.text = PREPARE_TEXT
	range_label.text = RANGE_LABEL_TEXT
	cold_notice_label.text = ""
	bottom_caption_text = HINT_TEXT
	sub_timer_caption_label.text = HINT_TEXT
	_apply_caption_visuals(true)
	sub_timer_label.text = ""
	_update_random_option_button_text()

func _set_cold_notice_visible(visible_state: bool) -> void:
	cold_notice_label.text = COLD_NOTICE_TEXT if visible_state else ""

func _set_sub_timer_visible(visible_state: bool) -> void:
	if visible_state:
		sub_timer_label.visible = true
		sub_timer_caption_label.text = sub_timer_caption_text
		_apply_caption_visuals(false)
		var initial_seconds: int = int(ceil(sub_timer_total))
		sub_timer_label.text = "00 : %02d" % initial_seconds
	else:
		sub_timer_label.visible = false
		sub_timer_caption_label.text = bottom_caption_text
		_apply_caption_visuals(true)
		sub_timer_label.text = ""

func _set_bottom_caption_text(text: String) -> void:
	bottom_caption_text = text
	if not sub_timer_running:
		sub_timer_caption_label.text = bottom_caption_text
		_apply_caption_visuals(true)

func _apply_caption_visuals(is_hint: bool) -> void:
	sub_timer_caption_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	if is_hint:
		sub_timer_caption_label.add_theme_color_override("font_color", HINT_CAPTION_COLOR)
	else:
		sub_timer_caption_label.add_theme_color_override("font_color", SUB_TIMER_ACCENT_COLOR)

func _sync_primary_button   () -> void:
	if is_running:
		start_button.text = "停止"
	elif remaining_time < float(total_duration) and remaining_time > 0.0:
		start_button.text = "再開"
	else:
		start_button.text = "開始"

func _update_control_visibility() -> void:
	var hide_random_controls: bool = is_running
	fullscreen_button.text = "全画面解除" if is_compact_fullscreen_ui else "全画面"
	_set_button_placeholder(fullscreen_button, dashboard_mode)
	_set_button_placeholder(reset_button, hide_random_controls)
	_set_button_placeholder(random_option_count_button, hide_random_controls)
	if not hide_random_controls:
		reset_button.text = "ランダム再生成"
		_update_random_option_button_text()

	count_spacer4.visible = true
	count_spacer5.visible = not dashboard_mode
	count_spacer6.visible = true
	count_spacer7.visible = true

func _set_button_placeholder(button: Button, hidden: bool) -> void:
	if hidden:
		button.disabled = true
		button.self_modulate = HIDDEN_BUTTON_MODULATE
		button.mouse_filter = Control.MOUSE_FILTER_IGNORE
		button.text = ""
	else:
		button.disabled = false
		button.self_modulate = Color.WHITE
		button.mouse_filter = Control.MOUSE_FILTER_STOP

func _update_responsive_sizes() -> void:
	if timer_label == null:
		return

	var available_width: float = size.x
	if available_width <= 1.0:
		available_width = get_viewport_rect().size.x

	var font_scale: float = 0.16 if dashboard_mode else (0.28 if is_compact_fullscreen_ui else 0.20)
	var min_size: int = 56 if dashboard_mode else (128 if is_compact_fullscreen_ui else 84)
	var max_size: int = 150 if dashboard_mode else (420 if is_compact_fullscreen_ui else 300)
	var font_size: int = clampi(int(available_width * font_scale), min_size, max_size)
	timer_label.add_theme_font_size_override("font_size", font_size)
	var label_width: float = maxf(260.0, minf(980.0, available_width * (0.82 if dashboard_mode else 0.90)))
	var min_height: float = 78.0 if dashboard_mode else 160.0
	var max_height: float = 180.0 if dashboard_mode else 360.0
	timer_label.custom_minimum_size = Vector2(label_width, clampf(float(font_size) * 1.25, min_height, max_height))

	var notice_size: int = clampi(int(font_size * 0.24), 24, 56)
	var sub_timer_size: int = clampi(int(font_size * 0.20), 26, 64)
	cold_notice_label.add_theme_font_size_override("font_size", notice_size)
	sub_timer_caption_label.add_theme_font_size_override("font_size", clampi(int(sub_timer_size * 0.66), 20, 34))
	sub_timer_label.add_theme_font_size_override("font_size", sub_timer_size)

func _show_random_interval_menu() -> void:
	var button_rect: Rect2 = random_option_count_button.get_global_rect()
	random_interval_menu.position = Vector2i(int(button_rect.position.x), int(button_rect.end.y + 4.0))
	random_interval_menu.reset_size()
	random_interval_menu.popup()

func _on_random_interval_selected(menu_id: int) -> void:
	match menu_id:
		MENU_ID_ONE_SECOND:
			random_step_seconds = RANDOM_STEP_ONE_SECOND
			_update_random_option_button_text()
			_reset_timer()
		MENU_ID_FIVE_SECONDS:
			random_step_seconds = RANDOM_STEP_FIVE_SECONDS
			_update_random_option_button_text()
			_reset_timer()
		MENU_ID_TEN_SECONDS:
			random_step_seconds = RANDOM_STEP_TEN_SECONDS
			_update_random_option_button_text()
			_reset_timer()
		MENU_ID_MANUAL:
			_open_manual_time_popup()

func _open_manual_time_popup() -> void:
	var max_minute: int = NORMAL_MANUAL_MINUTE_MAX
	var minute_index: int = clampi(manual_duration_seconds / 60, 0, max_minute)
	var second_value: int = manual_duration_seconds % 60
	manual_minute_option.select(minute_index)
	manual_second_option.select(second_value)
	manual_time_popup.popup_centered()

func _apply_manual_duration() -> void:
	var selected_minute: int = manual_minute_option.get_selected_id()
	var selected_second: int = manual_second_option.get_selected_id()
	manual_duration_seconds = (selected_minute * 60) + selected_second
	random_step_seconds = RANDOM_MODE_MANUAL
	manual_time_popup.hide()
	_update_random_option_button_text()
	_reset_timer()

func _update_random_option_button_text() -> void:
	var prefix: String = "ランダム設定\n"
	match random_step_seconds:
		RANDOM_STEP_ONE_SECOND:
			random_option_count_button.text = prefix + "1秒単位"
		RANDOM_STEP_FIVE_SECONDS:
			random_option_count_button.text = prefix + "5秒単位"
		RANDOM_STEP_TEN_SECONDS:
			random_option_count_button.text = prefix + "10秒単位"
		RANDOM_MODE_MANUAL:
			random_option_count_button.text = prefix + ("手動 %02d:%02d" % [manual_duration_seconds / 60, manual_duration_seconds % 60])
		_:
			random_option_count_button.text = prefix + "5秒単位"
