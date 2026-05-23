extends Control

const SAMPLE_NEWS_PATH: String = "res://data/news.json"
const CATEGORY_ALL: String = "すべて"
const CATEGORY_QA: String = "Q&A更新"
const CATEGORY_COMPETITION: String = "競技情報"

@export var news_url: String = ""

@onready var category_filter: OptionButton = $Scroll/Layout/Header/CategoryFilter
@onready var status_label: Label = $Scroll/Layout/StatusLabel
@onready var news_list: VBoxContainer = $Scroll/Layout/NewsScroll/NewsList
@onready var popup: PopupPanel = $DetailPopup
@onready var detail_title: Label = $DetailPopup/DetailMargin/DetailLayout/DetailTitle
@onready var detail_meta: Label = $DetailPopup/DetailMargin/DetailLayout/DetailMeta
@onready var detail_content: RichTextLabel = $DetailPopup/DetailMargin/DetailLayout/DetailContent

var news_items: Array[Dictionary] = []
var news_loaded: bool = false

func _ready() -> void:
	_setup_categories()
	category_filter.item_selected.connect(_render_news_cards)
	$Scroll/Layout/Header/ReloadButton.pressed.connect(load_news)
	$DetailPopup/DetailMargin/DetailLayout/CloseButton.pressed.connect(popup.hide)

	var http_request: HTTPRequest = HTTPRequest.new()
	http_request.name = "HTTPRequest"
	add_child(http_request)
	http_request.request_completed.connect(_on_news_response)

	status_label.text = "ニュース画面を開くと読み込みます。"

func _setup_categories() -> void:
	category_filter.clear()
	category_filter.add_item(CATEGORY_ALL)
	category_filter.add_item(CATEGORY_QA)
	category_filter.add_item(CATEGORY_COMPETITION)
	category_filter.select(0)

func set_screen_active(active: bool) -> void:
	if active and not news_loaded:
		load_news()

func load_news() -> void:
	news_loaded = true
	if news_url.is_empty():
		_load_local_news()
		return

	status_label.text = "外部ニュースを読み込み中です..."
	var error: int = $HTTPRequest.request(news_url)
	if error != OK:
		status_label.text = "外部ニュースを取得できなかったため、ローカルのニュース JSON を表示します。"
		_load_local_news()

func _on_news_response(_result: int, response_code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	if response_code < 200 or response_code >= 300:
		status_label.text = "外部レスポンスを利用できなかったため、ローカルのニュース JSON を表示します。"
		_load_local_news()
		return

	var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
	if parsed is Dictionary and parsed.has("news"):
		news_items = _to_news_dictionary_array(parsed["news"])
		status_label.text = "外部ニュースを読み込みました。"
	else:
		status_label.text = "外部ニュースの形式が正しくないため、ローカルのニュース JSON を表示します。"
		_load_local_news()
		return

	_render_news_cards()

func _load_local_news() -> void:
	if not FileAccess.file_exists(SAMPLE_NEWS_PATH):
		status_label.text = "ローカルニュース JSON が見つかりません。"
		news_items.clear()
		_render_news_cards()
		return

	var file: FileAccess = FileAccess.open(SAMPLE_NEWS_PATH, FileAccess.READ)
	if file == null:
		status_label.text = "ローカルニュース JSON を開けませんでした。"
		news_items.clear()
		_render_news_cards()
		return

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if parsed is Dictionary and parsed.has("news"):
		news_items = _to_news_dictionary_array(parsed["news"])
		status_label.text = "ローカルニュース JSON を読み込みました。"
	else:
		news_items.clear()
		status_label.text = "ローカルニュース JSON の形式が正しくありません。"

	_render_news_cards()

func _render_news_cards(_index: int = -1) -> void:
	for child_variant in news_list.get_children():
		var child: Node = child_variant
		child.queue_free()

	var selected_category: String = _selected_category()
	var visible_count: int = 0
	for item in news_items:
		var item_category: String = str(item.get("category", ""))
		if selected_category == CATEGORY_ALL or item_category == selected_category:
			news_list.add_child(_build_news_card(item))
			visible_count += 1

	if visible_count == 0:
		var empty_label: Label = Label.new()
		empty_label.text = "このカテゴリのニュースはありません。"
		news_list.add_child(empty_label)

func _build_news_card(item: Dictionary) -> PanelContainer:
	var card: PanelContainer = PanelContainer.new()

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 18)
	card.add_child(margin)

	var body: VBoxContainer = VBoxContainer.new()
	body.add_theme_constant_override("separation", 10)
	margin.add_child(body)

	var title: Label = Label.new()
	title.text = str(item.get("title", "無題"))
	title.add_theme_font_size_override("font_size", 24)
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body.add_child(title)

	var meta: Label = Label.new()
	meta.text = "%s | %s" % [str(item.get("category", "-")), str(item.get("date", "-"))]
	body.add_child(meta)

	var summary: Label = Label.new()
	summary.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	summary.text = str(item.get("summary", ""))
	body.add_child(summary)

	var button: Button = Button.new()
	button.text = "詳細を見る"
	button.custom_minimum_size = Vector2(0.0, 46.0)
	button.pressed.connect(_open_details.bind(item))
	body.add_child(button)

	return card

func _open_details(item: Dictionary) -> void:
	detail_title.text = str(item.get("title", "無題"))
	detail_meta.text = "%s | %s" % [str(item.get("category", "-")), str(item.get("date", "-"))]
	detail_content.text = "[font_size=18]%s[/font_size]" % str(item.get("content", ""))
	popup.popup_centered_ratio(0.6)

func _selected_category() -> String:
	return category_filter.get_item_text(category_filter.selected)

func _to_news_dictionary_array(items_variant: Variant) -> Array[Dictionary]:
	var items: Array[Dictionary] = []
	if typeof(items_variant) != TYPE_ARRAY:
		return items

	var raw_items: Array = items_variant
	for item_variant in raw_items:
		if typeof(item_variant) == TYPE_DICTIONARY:
			items.append(item_variant)
	return items
