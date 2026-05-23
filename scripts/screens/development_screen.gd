extends Control

const SETTINGS_PATH: String = "user://admin_settings.json"
const ADMIN_GATE_HASH: String = "31749b1d44f155c116ce285a185146310ce0cd131f77cc1e4e1546d97feef275"

var password_input: LineEdit
var auth_button: Button
var auth_message: Label
var settings_panel: PanelContainer
var gas_url_input: LineEdit
var api_key_input: LineEdit
var send_enabled_check: CheckBox
var save_button: Button
var test_button: Button
var test_message: Label
var http_request: HTTPRequest
var authenticated: bool = false

func _ready() -> void:
	_build_ui()
	_load_settings()
	_set_settings_visible(false)

func _build_ui() -> void:
	var scroll: ScrollContainer = ScrollContainer.new()
	scroll.name = "Scroll"
	scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(scroll)

	var root: VBoxContainer = VBoxContainer.new()
	root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	root.add_theme_constant_override("separation", 16)
	scroll.add_child(root)

	var title: Label = Label.new()
	title.text = "開発中"
	title.add_theme_font_size_override("font_size", 30)
	root.add_child(title)

	var note: Label = Label.new()
	note.text = "管理者向けの隠し設定です。ここで入力したGAS URLやAPIキーはこの端末内にのみ保存されます。実際の書き込み許可はGoogle Apps Script側でAPIキーを検証してください。"
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	root.add_child(note)

	var auth_panel: PanelContainer = PanelContainer.new()
	root.add_child(auth_panel)

	var auth_margin: MarginContainer = MarginContainer.new()
	auth_margin.add_theme_constant_override("margin_left", 18)
	auth_margin.add_theme_constant_override("margin_top", 18)
	auth_margin.add_theme_constant_override("margin_right", 18)
	auth_margin.add_theme_constant_override("margin_bottom", 18)
	auth_panel.add_child(auth_margin)

	var auth_stack: VBoxContainer = VBoxContainer.new()
	auth_stack.add_theme_constant_override("separation", 10)
	auth_margin.add_child(auth_stack)

	var auth_title: Label = Label.new()
	auth_title.text = "管理者表示ロック"
	auth_title.add_theme_font_size_override("font_size", 22)
	auth_stack.add_child(auth_title)

	password_input = LineEdit.new()
	password_input.placeholder_text = "パスワード"
	password_input.secret = true
	password_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	password_input.text_submitted.connect(func(_text: String) -> void: _authenticate())
	auth_stack.add_child(password_input)

	auth_button = Button.new()
	auth_button.text = "認証"
	auth_button.custom_minimum_size = Vector2(150, 48)
	auth_button.pressed.connect(_authenticate)
	auth_stack.add_child(auth_button)

	auth_message = Label.new()
	auth_message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	auth_message.text = "この認証はGAS設定欄を隠すための表示制御です。本番の保護はGAS側のAPIキー検証で行ってください。"
	auth_stack.add_child(auth_message)

	settings_panel = PanelContainer.new()
	root.add_child(settings_panel)

	var settings_margin: MarginContainer = MarginContainer.new()
	settings_margin.add_theme_constant_override("margin_left", 18)
	settings_margin.add_theme_constant_override("margin_top", 18)
	settings_margin.add_theme_constant_override("margin_right", 18)
	settings_margin.add_theme_constant_override("margin_bottom", 18)
	settings_panel.add_child(settings_margin)

	var settings_stack: VBoxContainer = VBoxContainer.new()
	settings_stack.add_theme_constant_override("separation", 12)
	settings_margin.add_child(settings_stack)

	var settings_title: Label = Label.new()
	settings_title.text = "Google Apps Script 送信設定"
	settings_title.add_theme_font_size_override("font_size", 22)
	settings_stack.add_child(settings_title)

	gas_url_input = LineEdit.new()
	gas_url_input.placeholder_text = "Google Apps Script WebアプリURL"
	gas_url_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	gas_url_input.focus_exited.connect(_save_settings)
	settings_stack.add_child(gas_url_input)

	api_key_input = LineEdit.new()
	api_key_input.placeholder_text = "APIキー / 合言葉"
	api_key_input.secret = true
	api_key_input.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	api_key_input.focus_exited.connect(_save_settings)
	settings_stack.add_child(api_key_input)

	send_enabled_check = CheckBox.new()
	send_enabled_check.text = "スプレッドシート送信ON/OFF"
	send_enabled_check.toggled.connect(func(_enabled: bool) -> void: _save_settings())
	settings_stack.add_child(send_enabled_check)

	var button_row: HFlowContainer = HFlowContainer.new()
	button_row.add_theme_constant_override("h_separation", 12)
	button_row.add_theme_constant_override("v_separation", 10)
	settings_stack.add_child(button_row)

	save_button = Button.new()
	save_button.text = "設定を保存"
	save_button.custom_minimum_size = Vector2(150, 48)
	save_button.pressed.connect(_save_settings)
	button_row.add_child(save_button)

	test_button = Button.new()
	test_button.text = "テスト送信"
	test_button.custom_minimum_size = Vector2(150, 48)
	test_button.pressed.connect(_send_test_payload)
	button_row.add_child(test_button)

	test_message = Label.new()
	test_message.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	test_message.text = "未送信"
	settings_stack.add_child(test_message)

	http_request = HTTPRequest.new()
	http_request.request_completed.connect(_on_test_request_completed)
	add_child(http_request)

func _authenticate() -> void:
	if password_input.text.strip_edges().sha256_text() != ADMIN_GATE_HASH:
		authenticated = false
		_set_settings_visible(false)
		auth_message.text = "認証に失敗しました。"
		return

	authenticated = true
	_set_settings_visible(true)
	auth_message.text = "認証しました。GAS設定を表示します。"
	password_input.text = ""

func _set_settings_visible(visible_state: bool) -> void:
	if settings_panel != null:
		settings_panel.visible = visible_state

func _load_settings() -> void:
	if not FileAccess.file_exists(SETTINGS_PATH):
		return
	var file: FileAccess = FileAccess.open(SETTINGS_PATH, FileAccess.READ)
	if file == null:
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary):
		return
	var data: Dictionary = parsed
	gas_url_input.text = str(data.get("gas_url", ""))
	api_key_input.text = str(data.get("api_key", ""))
	send_enabled_check.button_pressed = bool(data.get("send_enabled", false))

func _save_settings() -> void:
	if gas_url_input == null or api_key_input == null or send_enabled_check == null:
		return
	var data: Dictionary = {
		"gas_url": gas_url_input.text.strip_edges(),
		"api_key": api_key_input.text,
		"send_enabled": send_enabled_check.button_pressed
	}
	var file: FileAccess = FileAccess.open(SETTINGS_PATH, FileAccess.WRITE)
	if file == null:
		test_message.text = "設定を保存できませんでした。"
		return
	file.store_string(JSON.stringify(data, "\t"))
	if test_message != null:
		test_message.text = "設定を端末内に保存しました。"

func _send_test_payload() -> void:
	if not authenticated:
		test_message.text = "先に認証してください。"
		return
	_save_settings()
	var url: String = gas_url_input.text.strip_edges()
	if url.is_empty() or not (url.begins_with("https://") or url.begins_with("http://")):
		test_message.text = "GAS WebアプリURLを入力してください。"
		return
	if url.contains("/home/projects/") or url.ends_with("/edit"):
		test_message.text = "GASの編集URLではなく、デプロイ後のWebアプリURL（/macros/s/.../exec）を入力してください。"
		return
	if api_key_input.text.is_empty():
		test_message.text = "APIキー / 合言葉を入力してください。"
		return

	var payload: Dictionary = {
		"api_key": api_key_input.text,
		"event": "test",
		"source": "WRO RoboSports Assist",
		"sent_at": Time.get_datetime_string_from_system(),
		"payload": {
			"message": "test send",
			"record_kind": "connection_test"
		}
	}
	var headers: PackedStringArray = PackedStringArray(["Content-Type: text/plain;charset=utf-8"])
	var err: Error = http_request.request(url, headers, HTTPClient.METHOD_POST, JSON.stringify(payload))
	if err != OK:
		test_message.text = "テスト送信を開始できませんでした。エラー: %d" % err
		return
	test_message.text = "テスト送信中..."

func _on_test_request_completed(result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	var body_text: String = body.get_string_from_utf8()
	if result == HTTPRequest.RESULT_SUCCESS and response_code >= 200 and response_code < 300:
		test_message.text = "テスト送信に成功しました。HTTP %d %s" % [response_code, body_text.left(120)]
	else:
		test_message.text = "テスト送信に失敗しました。result=%d HTTP=%d %s" % [result, response_code, body_text.left(160)]
