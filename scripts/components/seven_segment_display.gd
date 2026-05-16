extends Control

@export var text: String = "00:00":
	set(value):
		text = value
		queue_redraw()

@export var active_color: Color = Color("edf4ff"):
	set(value):
		active_color = value
		queue_redraw()

@export var inactive_color: Color = Color(0.09, 0.14, 0.22, 0.35):
	set(value):
		inactive_color = value
		queue_redraw()

@export var segment_ratio: float = 0.12:
	set(value):
		segment_ratio = value
		queue_redraw()

@export var digit_spacing_ratio: float = 0.16:
	set(value):
		digit_spacing_ratio = value
		queue_redraw()

const DIGIT_SEGMENTS: Dictionary = {
	"0": [true, true, true, true, true, true, false],
	"1": [false, true, true, false, false, false, false],
	"2": [true, true, false, true, true, false, true],
	"3": [true, true, true, true, false, false, true],
	"4": [false, true, true, false, false, true, true],
	"5": [true, false, true, true, false, true, true],
	"6": [true, false, true, true, true, true, true],
	"7": [true, true, true, false, false, false, false],
	"8": [true, true, true, true, true, true, true],
	"9": [true, true, true, true, false, true, true]
}

func _draw() -> void:
	if text.is_empty():
		return

	var normalized: String = text.strip_edges()
	var digit_count: int = 0
	var colon_count: int = 0
	for character_variant in normalized:
		var character: String = String(character_variant)
		if character == ":":
			colon_count += 1
		else:
			digit_count += 1

	if digit_count == 0:
		return

	var total_width: float = size.x
	var total_height: float = size.y
	var base_unit: float = total_width / (float(digit_count) + float(colon_count) * 0.42 + float(maxi(digit_count - 1, 0)) * digit_spacing_ratio)
	var digit_width: float = base_unit
	var colon_width: float = base_unit * 0.42
	var spacing: float = base_unit * digit_spacing_ratio
	var x: float = (total_width - _measure_width(normalized, digit_width, colon_width, spacing)) * 0.5

	for index in normalized.length():
		var character: String = normalized[index]
		if character == ":":
			_draw_colon(Rect2(x, 0.0, colon_width, total_height))
			x += colon_width
		else:
			_draw_digit(Rect2(x, 0.0, digit_width, total_height), character)
			x += digit_width
		if index < normalized.length() - 1:
			x += spacing

func _measure_width(value: String, digit_width: float, colon_width: float, spacing: float) -> float:
	var width: float = 0.0
	for index in value.length():
		width += colon_width if value[index] == ":" else digit_width
		if index < value.length() - 1:
			width += spacing
	return width

func _draw_digit(rect: Rect2, digit: String) -> void:
	var thickness: float = minf(rect.size.x, rect.size.y) * segment_ratio
	var half_height: float = rect.size.y * 0.5
	var top_y: float = rect.position.y
	var mid_y: float = rect.position.y + half_height - thickness * 0.5
	var bottom_y: float = rect.position.y + rect.size.y - thickness
	var left_x: float = rect.position.x
	var right_x: float = rect.position.x + rect.size.x - thickness
	var upper_v_y: float = rect.position.y + thickness * 0.6
	var lower_v_y: float = rect.position.y + half_height + thickness * 0.2
	var vertical_height: float = half_height - thickness * 1.2

	var segments: Array = DIGIT_SEGMENTS.get(digit, [false, false, false, false, false, false, false])
	var segment_rects: Array[Rect2] = [
		Rect2(rect.position.x + thickness * 0.75, top_y, rect.size.x - thickness * 1.5, thickness),
		Rect2(right_x, upper_v_y, thickness, vertical_height),
		Rect2(right_x, lower_v_y, thickness, vertical_height),
		Rect2(rect.position.x + thickness * 0.75, bottom_y, rect.size.x - thickness * 1.5, thickness),
		Rect2(left_x, lower_v_y, thickness, vertical_height),
		Rect2(left_x, upper_v_y, thickness, vertical_height),
		Rect2(rect.position.x + thickness * 0.75, mid_y, rect.size.x - thickness * 1.5, thickness)
	]

	for segment_index in segment_rects.size():
		var color: Color = active_color if bool(segments[segment_index]) else inactive_color
		draw_rect(segment_rects[segment_index], color, true)

func _draw_colon(rect: Rect2) -> void:
	var dot_size: float = minf(rect.size.x, rect.size.y) * 0.24
	var top_dot: Rect2 = Rect2(
		rect.position.x + (rect.size.x - dot_size) * 0.5,
		rect.position.y + rect.size.y * 0.32 - dot_size * 0.5,
		dot_size,
		dot_size
	)
	var bottom_dot: Rect2 = Rect2(
		rect.position.x + (rect.size.x - dot_size) * 0.5,
		rect.position.y + rect.size.y * 0.68 - dot_size * 0.5,
		dot_size,
		dot_size
	)
	draw_rect(top_dot, active_color, true)
	draw_rect(bottom_dot, active_color, true)
