extends RefCounted

const DEFAULT_JP_FONT: FontFile = preload("res://assets/fonts/Noto_Sans_JP/static/NotoSansJP-Regular.ttf")

const SURFACE: Color = Color("131d34")
const SURFACE_ALT: Color = Color("182546")
const BORDER: Color = Color("2b4375")
const ACCENT_BLUE: Color = Color("2ea8ff")
const ACCENT_BLUE_SOFT: Color = Color("163968")
const ACCENT_ORANGE: Color = Color("ff9a2f")
const ACCENT_ORANGE_SOFT: Color = Color("5b3110")
const TEXT: Color = Color("edf4ff")
const TEXT_MUTED: Color = Color("a6bad8")

static func create_theme(secret_mode: bool = false) -> Theme:
	var accent: Color = ACCENT_ORANGE if secret_mode else ACCENT_BLUE
	var accent_soft: Color = ACCENT_ORANGE_SOFT if secret_mode else ACCENT_BLUE_SOFT
	var button_hover: Color = Color("5b3110") if secret_mode else Color("1c3b69")
	var button_pressed: Color = Color("8a4b12") if secret_mode else Color("24548f")

	var theme_instance: Theme = Theme.new()
	theme_instance.default_font = DEFAULT_JP_FONT
	theme_instance.default_font_size = 18

	var label_color_types: Array[String] = ["Label", "Button", "LineEdit", "TextEdit", "OptionButton", "SpinBox", "RichTextLabel", "ProgressBar"]
	for type_name in label_color_types:
		theme_instance.set_color("font_color", type_name, TEXT)
	theme_instance.set_color("font_focus_color", "Button", TEXT)
	theme_instance.set_color("font_hover_color", "Button", TEXT)
	theme_instance.set_color("font_pressed_color", "Button", TEXT)
	theme_instance.set_color("caret_color", "LineEdit", accent)
	theme_instance.set_color("caret_color", "TextEdit", accent)
	theme_instance.set_color("selection_color", "LineEdit", accent_soft)
	theme_instance.set_color("selection_color", "TextEdit", accent_soft)
	theme_instance.set_color("font_placeholder_color", "LineEdit", TEXT_MUTED)
	theme_instance.set_color("font_placeholder_color", "TextEdit", TEXT_MUTED)

	theme_instance.set_stylebox("panel", "PanelContainer", _panel_style(SURFACE, BORDER, 18))
	theme_instance.set_stylebox("normal", "Button", _button_style(SURFACE_ALT, BORDER))
	theme_instance.set_stylebox("hover", "Button", _button_style(button_hover, accent))
	theme_instance.set_stylebox("pressed", "Button", _button_style(button_pressed, accent))
	theme_instance.set_stylebox("focus", "Button", _button_style(button_pressed, accent, 2))
	theme_instance.set_stylebox("disabled", "Button", _button_style(Color("14213b"), BORDER))

	theme_instance.set_stylebox("normal", "LineEdit", _input_style(BORDER))
	theme_instance.set_stylebox("focus", "LineEdit", _input_style(accent))
	theme_instance.set_stylebox("normal", "TextEdit", _input_style(BORDER))
	theme_instance.set_stylebox("focus", "TextEdit", _input_style(accent))
	theme_instance.set_stylebox("normal", "OptionButton", _input_style(BORDER))
	theme_instance.set_stylebox("focus", "OptionButton", _input_style(accent))
	theme_instance.set_stylebox("normal", "SpinBox", _input_style(BORDER))
	theme_instance.set_stylebox("focus", "SpinBox", _input_style(accent))

	theme_instance.set_stylebox("background", "ProgressBar", _panel_style(Color("0d1730"), BORDER, 12))
	theme_instance.set_stylebox("fill", "ProgressBar", _panel_style(accent, accent, 12))

	return theme_instance

static func _panel_style(bg_color: Color, border_color: Color, radius: int) -> StyleBoxFlat:
	var style: StyleBoxFlat = StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = border_color
	style.set_border_width_all(1)
	style.set_corner_radius_all(radius)
	return style

static func _button_style(bg_color: Color, border_color: Color, border_width: int = 1) -> StyleBoxFlat:
	var style: StyleBoxFlat = _panel_style(bg_color, border_color, 16)
	style.set_border_width_all(border_width)
	style.content_margin_left = 18
	style.content_margin_right = 18
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	return style

static func _input_style(focus_color: Color) -> StyleBoxFlat:
	var style: StyleBoxFlat = _panel_style(Color("0e1830"), focus_color, 14)
	style.content_margin_left = 16
	style.content_margin_right = 16
	style.content_margin_top = 12
	style.content_margin_bottom = 12
	return style
