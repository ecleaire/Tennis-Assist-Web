extends Control

const MOBILE_BREAKPOINT: float = 920.0
const BUTTON_HEIGHT: float = 64.0

# リンクを増やすときは、この配列を編集すると画面へ自動反映されます。
const BASE_LINK_SECTIONS: Array[Dictionary] = [
	{
		"title": "WRO",
		"description": "各地域や公式大会ページへのリンクです。",
		"links": [
			{"label": "WRO Japan ホームページ", "url": "https://www.wroj.org/action/2026"},
			{"label": "WRO 兵庫 ホームページ", "url": "https://wro-hyogo.jp/"},
			{"label": "WRO 東京 ホームページ", "url": "https://www.wro-tokyo-competition.net/"},
			{"label": "WRO 奈良 ホームページ", "url": "https://sites.google.com/view/wro-nara/%E3%83%AD%E3%83%9C%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84"},
			{"label": "WRO 三重 ホームページ", "url": "https://wro2025.miraido.net/"}
		]
	},
	{
		"title": "公式資料",
		"description": "Q&A とルール関連の公式資料ページです。",
		"links": [
			{"label": "ルールなど", "url": "https://wro-association.org/competition/2026-season/#:~:text=ROBOSPORTS-,GENERAL%20%26%20GAME%20RULES,-PLAYFIELD%20DOUBLE%20TENNIS"},
			{"label": "Q&A", "url": "https://wro-association.org/competition/questions-answers/#:~:text=Q%26A%20yet.-,RoboSports,-Are%20there%20limitations"},
		]
	},
	{
		"title": "その他",
		"description": "動画など、運用補助リンクです。",
		"links": [
		]
	}
]

@onready var sections_list: VBoxContainer = $Layout/LinksPanel/LinksMargin/LinksLayout/LinksScroll/SectionsList
@onready var status_label: Label = $Layout/LinksPanel/LinksMargin/LinksLayout/StatusLabel

var section_grids: Array[GridContainer] = []

func _ready() -> void:
	_rebuild_sections()
	_update_layout()

func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_update_layout()

func _rebuild_sections() -> void:
	if sections_list == null:
		return

	for child_variant in sections_list.get_children():
		var child: Node = child_variant
		child.queue_free()

	section_grids.clear()

	var sections: Array[Dictionary] = _build_sections_data()
	for section in sections:
		_add_section(section)

	_update_layout()

func _build_sections_data() -> Array[Dictionary]:
	var sections: Array[Dictionary] = []
	for section in BASE_LINK_SECTIONS:
		var clone: Dictionary = {
			"title": str(section.get("title", "")),
			"description": str(section.get("description", "")),
			"links": []
		}

		var cloned_links: Array[Dictionary] = []
		var links_variant: Variant = section.get("links", [])
		if typeof(links_variant) == TYPE_ARRAY:
			var links_array: Array = links_variant
			for link_variant in links_array:
				if typeof(link_variant) == TYPE_DICTIONARY:
					cloned_links.append(link_variant.duplicate(true))

		clone["links"] = cloned_links
		sections.append(clone)

	return sections

func _add_section(section: Dictionary) -> void:
	var section_panel: PanelContainer = PanelContainer.new()
	sections_list.add_child(section_panel)

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 16)
	section_panel.add_child(margin)

	var layout: VBoxContainer = VBoxContainer.new()
	layout.add_theme_constant_override("separation", 12)
	margin.add_child(layout)

	var title_label: Label = Label.new()
	title_label.text = str(section.get("title", ""))
	title_label.add_theme_font_size_override("font_size", 24)
	layout.add_child(title_label)

	var description_label: Label = Label.new()
	description_label.text = str(section.get("description", ""))
	description_label.modulate = Color(0.72, 0.8, 0.92, 1.0)
	description_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	layout.add_child(description_label)

	var grid: GridContainer = GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 12)
	grid.add_theme_constant_override("v_separation", 12)
	layout.add_child(grid)
	section_grids.append(grid)

	var links_variant: Variant = section.get("links", [])
	if typeof(links_variant) == TYPE_ARRAY:
		var links_array: Array = links_variant
		for link_variant in links_array:
			if typeof(link_variant) != TYPE_DICTIONARY:
				continue

			var link: Dictionary = link_variant
			var label: String = str(link.get("label", ""))
			var url: String = str(link.get("url", ""))

			var button: Button = Button.new()
			button.custom_minimum_size = Vector2(260.0, BUTTON_HEIGHT)
			button.text = label
			button.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			button.clip_text = false
			button.focus_mode = Control.FOCUS_NONE
			button.pressed.connect(_open_link.bind(url, label))
			grid.add_child(button)

func _update_layout() -> void:
	var columns: int = 1 if size.x < MOBILE_BREAKPOINT else 2
	for grid in section_grids:
		if grid != null:
			grid.columns = columns

func _open_link(url: String, label: String) -> void:
	var open_error: Error = OS.shell_open(url)
	if open_error == OK:
		status_label.text = "%s をブラウザで開きました" % label
	else:
		status_label.text = "%s を開けませんでした" % label
