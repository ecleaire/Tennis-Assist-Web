extends Control

const RULES_DATA_PATH: String = "res://data/rules_sections.json"
const MOBILE_BREAKPOINT: float = 1040.0
const BUTTON_MIN_HEIGHT: float = 56.0
const ENGLISH_RULES_URL: String = "https://wro-association.org/competition/2026-season/#:~:text=ROBOSPORTS-,GENERAL%20%26%20GAME%20RULES,-PLAYFIELD%20DOUBLE%20TENNIS"
const GOOGLE_TRANSLATED_RULES_URL: String = "https://drive.google.com/file/d/16zFJ_bD8sfLZZF6QkRCWQ6azN_Dj3eUG/view?usp=sharing"
const DEEPL_TRANSLATED_RULES_URL: String = "https://drive.google.com/file/d/1z_Q7M7lP2Q55Zo3qZgzH-bN_QqhCx-wJ/view?usp=sharing"
const QA_URL: String = "https://wro-association.org/competition/questions-answers/#:~:text=Q%26A%20yet.-,RoboSports,-Are%20there%20limitations"

@onready var source_label: Label = $Scroll/Layout/Header/SourceLabel
@onready var search_edit: LineEdit = $Scroll/Layout/SearchPanel/SearchMargin/SearchRow/SearchEdit
@onready var search_status_label: Label = $Scroll/Layout/SearchPanel/SearchMargin/SearchRow/SearchStatusLabel
@onready var open_english_rules_button: Button = $Scroll/Layout/SearchPanel/SearchMargin/SearchRow/ActionsRow/OpenEnglishRulesButton
@onready var open_google_rules_button: Button = $Scroll/Layout/SearchPanel/SearchMargin/SearchRow/ActionsRow/OpenGoogleRulesButton
@onready var open_deepl_rules_button: Button = $Scroll/Layout/SearchPanel/SearchMargin/SearchRow/ActionsRow/OpenDeepLRulesButton
@onready var open_qa_button: Button = $Scroll/Layout/SearchPanel/SearchMargin/SearchRow/ActionsRow/OpenQaButton
@onready var responsive_body: BoxContainer = $Scroll/Layout/ResponsiveBody
@onready var navigation_panel: PanelContainer = $Scroll/Layout/ResponsiveBody/NavigationPanel
@onready var navigation_scroll: ScrollContainer = $Scroll/Layout/ResponsiveBody/NavigationPanel/NavigationMargin/NavigationLayout/NavigationScroll
@onready var category_list: VBoxContainer = $Scroll/Layout/ResponsiveBody/NavigationPanel/NavigationMargin/NavigationLayout/NavigationScroll/CategoryList
@onready var content: RichTextLabel = $Scroll/Layout/ResponsiveBody/ContentPanel/ContentMargin/RuleContent

var rule_sections: Array[Dictionary] = []
var current_section_id: String = ""
var nav_buttons: Dictionary = {}

func _ready() -> void:
	_load_rules_data()
	search_edit.text_changed.connect(_on_search_text_changed)
	open_english_rules_button.pressed.connect(_open_link.bind(ENGLISH_RULES_URL, "英語ルール"))
	open_google_rules_button.pressed.connect(_open_link.bind(GOOGLE_TRANSLATED_RULES_URL, "Google翻訳ルール"))
	open_deepl_rules_button.pressed.connect(_open_link.bind(DEEPL_TRANSLATED_RULES_URL, "DeepL翻訳ルール"))
	open_qa_button.pressed.connect(_open_link.bind(QA_URL, "Q&A"))
	_build_navigation()
	if rule_sections.is_empty():
		_render_empty_state("ルールデータを読み込めませんでした。")
	else:
		current_section_id = _get_section_string(rule_sections[0], "id")
		_select_section(current_section_id)
	_update_layout()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_update_layout()

func _load_rules_data() -> void:
	rule_sections.clear()
	var file: FileAccess = FileAccess.open(RULES_DATA_PATH, FileAccess.READ)
	if file == null:
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		return

	var root: Dictionary = parsed
	var title: String = str(root.get("document_title", ""))
	var version_label: String = str(root.get("version_label", ""))
	if source_label != null:
		source_label.text = "出典: %s" % title
		if not version_label.is_empty():
			source_label.text += " / %s" % version_label

	var sections_variant: Variant = root.get("sections", [])
	if typeof(sections_variant) != TYPE_ARRAY:
		return

	var sections_array: Array = sections_variant
	for section_variant in sections_array:
		if typeof(section_variant) == TYPE_DICTIONARY:
			var section: Dictionary = section_variant
			rule_sections.append(section)

func _build_navigation() -> void:
	if category_list == null:
		return

	for child_variant in category_list.get_children():
		var child: Node = child_variant
		child.queue_free()

	nav_buttons.clear()

	for section in rule_sections:
		var section_id: String = _get_section_string(section, "id")
		var title: String = _get_section_string(section, "title")
		var subtitle: String = _get_section_string(section, "subtitle")
		var button: Button = Button.new()
		button.custom_minimum_size = Vector2(0.0, BUTTON_MIN_HEIGHT)
		button.text = title if subtitle.is_empty() else "%s\n%s" % [title, subtitle]
		button.alignment = HORIZONTAL_ALIGNMENT_LEFT
		button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		button.clip_text = false
		button.focus_mode = Control.FOCUS_NONE
		button.pressed.connect(_select_section.bind(section_id))
		category_list.add_child(button)
		nav_buttons[section_id] = button

func _update_layout() -> void:
	if responsive_body == null or navigation_panel == null or navigation_scroll == null:
		return
	responsive_body.vertical = size.x < MOBILE_BREAKPOINT
	navigation_panel.custom_minimum_size = Vector2(0.0, 0.0) if responsive_body.vertical else Vector2(280.0, 0.0)
	if responsive_body.vertical:
		var viewport_height: float = maxf(size.y, get_viewport_rect().size.y)
		var expanded_height: float = viewport_height - 250.0
		navigation_scroll.custom_minimum_size = Vector2(0.0, clampf(expanded_height, 620.0, 1040.0))
	else:
		var available_height: float = size.y - 300.0
		navigation_scroll.custom_minimum_size = Vector2(0.0, clampf(available_height, 420.0, 760.0))

func _on_search_text_changed(_new_text: String) -> void:
	_render_content()

func _select_section(section_id: String) -> void:
	current_section_id = section_id
	_update_nav_selection()
	_render_content()

func _update_nav_selection() -> void:
	for key_variant in nav_buttons.keys():
		var key: String = String(key_variant)
		var button_variant: Variant = nav_buttons[key]
		if button_variant is Button:
			var button: Button = button_variant
			button.modulate = Color(1.0, 1.0, 1.0, 1.0) if key == current_section_id else Color(0.8, 0.87, 0.97, 1.0)

func _render_content() -> void:
	if content == null or search_edit == null:
		return
	if rule_sections.is_empty():
		_render_empty_state("ルールデータを読み込めませんでした。")
		return

	var query: String = search_edit.text.strip_edges().to_lower()
	if query.is_empty():
		var active_section: Dictionary = _find_section_by_id(current_section_id)
		if active_section.is_empty():
			active_section = rule_sections[0]
		_render_single_section(active_section)
		return

	var matching_sections: Array[Dictionary] = []
	for section in rule_sections:
		if _section_matches_query(section, query):
			matching_sections.append(section)

	_render_search_results(query, matching_sections)

func _render_single_section(section: Dictionary) -> void:
	var lines: Array[String] = []
	var title: String = _get_section_string(section, "title")
	var subtitle: String = _get_section_string(section, "subtitle")
	var pages: String = _get_section_string(section, "pages")

	lines.append("[font_size=30][b]%s[/b][/font_size]" % title)
	if not subtitle.is_empty():
		lines.append("[color=#8fb6ff]%s[/color]" % subtitle)
	if not pages.is_empty():
		lines.append("[color=#8fa1be]PDFページ: %s[/color]" % pages)
	lines.append("")
	lines.append_array(_build_content_lines(section, ""))

	search_status_label.text = "%s を表示中" % title
	content.text = "\n".join(lines)
	content.scroll_to_line(0)

func _render_search_results(query: String, matching_sections: Array[Dictionary]) -> void:
	var lines: Array[String] = []
	lines.append("[font_size=30][b]検索結果[/b][/font_size]")
	lines.append("[color=#8fa1be]キーワード: %s[/color]" % query)
	lines.append("")

	if matching_sections.is_empty():
		lines.append("[color=#a8b8d4]一致する章や項目は見つかりませんでした。[/color]")
		search_status_label.text = "検索結果 0件"
		content.text = "\n".join(lines)
		content.scroll_to_line(0)
		return

	for section in matching_sections:
		var title: String = _get_section_string(section, "title")
		lines.append("[font_size=24][b]%s[/b][/font_size]" % title)
		var subtitle: String = _get_section_string(section, "subtitle")
		if not subtitle.is_empty():
			lines.append("[color=#8fb6ff]%s[/color]" % subtitle)
		lines.append_array(_build_content_lines(section, query))
		lines.append("")

	search_status_label.text = "検索結果 %d件" % matching_sections.size()
	content.text = "\n".join(lines)
	content.scroll_to_line(0)

func _build_content_lines(section: Dictionary, query: String) -> Array[String]:
	var lines: Array[String] = []
	var summary: String = _get_section_string(section, "summary")
	if not summary.is_empty():
		lines.append("[color=#edf4ff]%s[/color]" % summary)
		lines.append("")

	var points: Array[String] = _extract_string_array(section.get("points", []))
	for point in points:
		if query.is_empty() or point.to_lower().contains(query):
			lines.append("[color=#edf4ff]• %s[/color]" % point)

	var keywords: Array[String] = _extract_string_array(section.get("keywords", []))
	if not keywords.is_empty():
		lines.append("")
		lines.append("[color=#8fa1be]検索キーワード: %s[/color]" % ", ".join(keywords))

	return lines

func _section_matches_query(section: Dictionary, query: String) -> bool:
	var title: String = _get_section_string(section, "title").to_lower()
	var subtitle: String = _get_section_string(section, "subtitle").to_lower()
	var summary: String = _get_section_string(section, "summary").to_lower()
	if title.contains(query) or subtitle.contains(query) or summary.contains(query):
		return true

	var points: Array[String] = _extract_string_array(section.get("points", []))
	for point in points:
		if point.to_lower().contains(query):
			return true

	var keywords: Array[String] = _extract_string_array(section.get("keywords", []))
	for keyword in keywords:
		if keyword.to_lower().contains(query):
			return true

	return false

func _find_section_by_id(section_id: String) -> Dictionary:
	for section in rule_sections:
		if _get_section_string(section, "id") == section_id:
			return section
	return {}

func _get_section_string(section: Dictionary, key: String) -> String:
	return str(section.get(key, ""))

func _extract_string_array(values_variant: Variant) -> Array[String]:
	var values: Array[String] = []
	if typeof(values_variant) != TYPE_ARRAY:
		return values

	var raw_values: Array = values_variant
	for value_variant in raw_values:
		values.append(str(value_variant))
	return values

func _render_empty_state(message: String) -> void:
	if content != null:
		content.text = "[color=#a8b8d4]%s[/color]" % message
	if search_status_label != null:
		search_status_label.text = message

func _open_link(url: String, label: String) -> void:
	var open_error: Error = OS.shell_open(url)
	if open_error == OK:
		search_status_label.text = "%s をブラウザで開きました" % label
	else:
		search_status_label.text = "%s を開けませんでした" % label
