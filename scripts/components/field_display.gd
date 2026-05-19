@tool
extends Control

const ORANGE_COLOR: Color = Color("ff9f1a")
const PURPLE_COLOR: Color = Color("ff38ff")
const BALL_RADIUS: float = 16.0
const COURT_WHITE: Color = Color("f8f8f6")
const COURT_BLACK: Color = Color("231f20")
const COURT_GREEN: Color = Color("82c46b")
const COURT_BLUE: Color = Color("2b7fc0")
const COURT_RED: Color = Color("ff332a")
const COURT_DASH: Color = Color("75c763")

@export var reference_playfield_size: Vector2 = Vector2(1280.0, 620.0)
var layout_data: Dictionary = {}
var default_layout_data: Dictionary = {}
var default_pixel_layout_data: Dictionary = {}
var ball_nodes: Dictionary = {}
var slot_reference: Dictionary = {}
var use_pixel_default_layout: bool = true
var layout_initialized: bool = false

func _ready() -> void:
	_collect_ball_nodes()
	_apply_ball_styles()
	call_deferred("_ensure_layout_initialized")

func _notification(what: int) -> void:
	if what != NOTIFICATION_RESIZED:
		return

	queue_redraw()
	if not layout_initialized:
		call_deferred("_ensure_layout_initialized")
		return

	if not layout_data.is_empty() and not use_pixel_default_layout:
		_apply_layout(false)

func _draw() -> void:
	pass

func _draw_playfield_background() -> void:
	if size.x <= 0.0 or size.y <= 0.0:
		return

	draw_rect(Rect2(Vector2.ZERO, size), COURT_WHITE)

	var line_width: float = maxf(4.0, size.y * 0.012)
	var thin_width: float = maxf(1.0, size.y * 0.002)

	_draw_vertical(0.066, 0.0, 1.0, line_width)
	_draw_vertical(0.376, 0.0, 1.0, line_width)
	_draw_vertical(0.486, 0.0, 1.0, line_width)
	_draw_vertical(0.514, 0.0, 1.0, line_width)
	_draw_vertical(0.596, 0.0, 1.0, line_width)
	_draw_vertical(0.690, 0.0, 1.0, line_width)
	_draw_vertical(0.938, 0.0, 1.0, line_width)
	_draw_vertical(0.984, 0.0, 1.0, line_width)

	for y in [0.13, 0.31, 0.50, 0.69, 0.87]:
		_draw_horizontal(y, 0.0, 0.376, line_width)
		_draw_horizontal(y, 0.596, 1.0, line_width)

	_draw_horizontal(0.50, 0.376, 0.690, line_width)
	_draw_horizontal(0.31, 0.486, 0.596, line_width)
	_draw_horizontal(0.69, 0.486, 0.596, line_width)

	_draw_color_strip(Rect2(0.376, 0.50, 0.043, 0.50), COURT_GREEN)
	_draw_color_strip(Rect2(0.419, 0.50, 0.028, 0.50), COURT_BLUE)
	_draw_color_strip(Rect2(0.447, 0.50, 0.017, 0.50), COURT_RED)
	_draw_color_strip(Rect2(0.514, 0.0, 0.040, 0.32), COURT_RED)
	_draw_color_strip(Rect2(0.554, 0.0, 0.040, 0.32), COURT_BLUE)
	_draw_color_strip(Rect2(0.594, 0.0, 0.062, 0.32), COURT_GREEN)

	_draw_dashed_rect(Rect2(0.012, 0.12, 0.060, 0.12), thin_width)
	_draw_dashed_rect(Rect2(0.012, 0.67, 0.060, 0.12), thin_width)
	_draw_dashed_rect(Rect2(0.925, 0.18, 0.060, 0.12), thin_width)
	_draw_dashed_rect(Rect2(0.925, 0.73, 0.060, 0.12), thin_width)

func _draw_vertical(x: float, y_from: float, y_to: float, width: float) -> void:
	var from_point: Vector2 = Vector2(x * size.x, y_from * size.y)
	var to_point: Vector2 = Vector2(x * size.x, y_to * size.y)
	draw_line(from_point, to_point, COURT_BLACK, width, true)

func _draw_horizontal(y: float, x_from: float, x_to: float, width: float) -> void:
	var from_point: Vector2 = Vector2(x_from * size.x, y * size.y)
	var to_point: Vector2 = Vector2(x_to * size.x, y * size.y)
	draw_line(from_point, to_point, COURT_BLACK, width, true)

func _draw_color_strip(rect: Rect2, color: Color) -> void:
	draw_rect(Rect2(rect.position * size, rect.size * size), color)

func _draw_dashed_rect(rect: Rect2, width: float) -> void:
	var pixel_rect: Rect2 = Rect2(rect.position * size, rect.size * size)
	var dash: float = maxf(4.0, size.y * 0.012)
	_draw_dashed_line(pixel_rect.position, Vector2(pixel_rect.end.x, pixel_rect.position.y), dash, width)
	_draw_dashed_line(Vector2(pixel_rect.end.x, pixel_rect.position.y), pixel_rect.end, dash, width)
	_draw_dashed_line(pixel_rect.end, Vector2(pixel_rect.position.x, pixel_rect.end.y), dash, width)
	_draw_dashed_line(Vector2(pixel_rect.position.x, pixel_rect.end.y), pixel_rect.position, dash, width)

func _draw_dashed_line(from_point: Vector2, to_point: Vector2, dash_length: float, width: float) -> void:
	var vector: Vector2 = to_point - from_point
	var length: float = vector.length()
	if length <= 0.0:
		return
	var direction: Vector2 = vector / length
	var cursor: float = 0.0
	var draw_dash: bool = true
	while cursor < length:
		var next_cursor: float = minf(cursor + dash_length, length)
		if draw_dash:
			draw_line(from_point + direction * cursor, from_point + direction * next_cursor, COURT_DASH, width, true)
		cursor = next_cursor
		draw_dash = not draw_dash

func is_layout_ready() -> bool:
	return layout_initialized

func refresh_layout() -> void:
	if layout_initialized and not layout_data.is_empty():
		_apply_layout(false)
	queue_redraw()

func _ensure_layout_initialized() -> bool:
	if layout_initialized:
		return true

	if ball_nodes.is_empty():
		_collect_ball_nodes()
	if ball_nodes.is_empty():
		return false

	if size.x <= 0.0 or size.y <= 0.0:
		return false

	# 最初に見えている手動調整済みの配置を、以後の基準として固定します。
	default_pixel_layout_data = _capture_current_pixel_layout()
	default_layout_data = _capture_current_layout()
	slot_reference = _build_slot_reference_from_defaults()
	layout_data = default_layout_data.duplicate(true)
	use_pixel_default_layout = false
	layout_initialized = true
	_apply_layout(false)
	return true

func _collect_ball_nodes() -> void:
	ball_nodes = {
		"left_orange": _get_group_nodes("LeftOrange", 4),
		"right_orange": _get_group_nodes("RightOrange", 4),
		"left_purple": _get_group_nodes("LeftPurple", 1),
		"right_purple": _get_group_nodes("RightPurple", 1),
		"center_orange": _get_group_nodes("CenterOrange", 1)
	}

func _get_group_nodes(prefix: String, count: int) -> Array[Panel]:
	var nodes: Array[Panel] = []
	for index in count:
		var node: Panel = get_node_or_null(NodePath("%s%d" % [prefix, index]))
		if node != null:
			nodes.append(node)
	return nodes

func _apply_ball_styles() -> void:
	_apply_style_to_group("left_orange", ORANGE_COLOR)
	_apply_style_to_group("right_orange", ORANGE_COLOR)
	_apply_style_to_group("center_orange", ORANGE_COLOR)
	_apply_style_to_group("left_purple", PURPLE_COLOR)
	_apply_style_to_group("right_purple", PURPLE_COLOR)

func _apply_style_to_group(group_name: String, color: Color) -> void:
	var nodes_variant: Variant = ball_nodes.get(group_name, [])
	if typeof(nodes_variant) != TYPE_ARRAY:
		return

	var nodes: Array = nodes_variant
	for node_variant in nodes:
		if node_variant is Panel:
			var node: Panel = node_variant
			node.custom_minimum_size = Vector2(BALL_RADIUS * 2.0, BALL_RADIUS * 2.0)
			node.size = node.custom_minimum_size
			var style: StyleBoxFlat = StyleBoxFlat.new()
			style.bg_color = color
			style.border_color = Color.WHITE
			style.set_border_width_all(2)
			style.set_corner_radius_all(int(BALL_RADIUS))
			node.add_theme_stylebox_override("panel", style)

func _capture_current_layout() -> Dictionary:
	return {
		"left_orange": _capture_group_positions("left_orange"),
		"right_orange": _capture_group_positions("right_orange"),
		"left_purple": _capture_first_position("left_purple"),
		"right_purple": _capture_first_position("right_purple"),
		"center_orange": _capture_first_position("center_orange")
	}

func _capture_current_pixel_layout() -> Dictionary:
	return {
		"left_orange": _capture_group_pixel_positions("left_orange"),
		"right_orange": _capture_group_pixel_positions("right_orange"),
		"left_purple": _capture_first_pixel_position("left_purple"),
		"right_purple": _capture_first_pixel_position("right_purple"),
		"center_orange": _capture_first_pixel_position("center_orange")
	}

func _capture_group_positions(group_name: String) -> Array[Vector2]:
	var positions: Array[Vector2] = []
	var nodes_variant: Variant = ball_nodes.get(group_name, [])
	if typeof(nodes_variant) != TYPE_ARRAY:
		return positions

	var nodes: Array = nodes_variant
	for node_variant in nodes:
		if node_variant is Control:
			var node: Control = node_variant
			positions.append(_to_normalized_position(node.position))
	return positions

func _capture_first_position(group_name: String) -> Vector2:
	var positions: Array[Vector2] = _capture_group_positions(group_name)
	return positions[0] if not positions.is_empty() else Vector2.ZERO

func _capture_group_pixel_positions(group_name: String) -> Array[Vector2]:
	var positions: Array[Vector2] = []
	var nodes_variant: Variant = ball_nodes.get(group_name, [])
	if typeof(nodes_variant) != TYPE_ARRAY:
		return positions

	var nodes: Array = nodes_variant
	for node_variant in nodes:
		if node_variant is Control:
			var node: Control = node_variant
			positions.append(node.position)
	return positions

func _capture_first_pixel_position(group_name: String) -> Vector2:
	var positions: Array[Vector2] = _capture_group_pixel_positions(group_name)
	return positions[0] if not positions.is_empty() else Vector2.ZERO

func set_default_layout() -> void:
	if not _ensure_layout_initialized():
		return

	layout_data = default_layout_data.duplicate(true)
	use_pixel_default_layout = false
	_apply_layout(false)

func animate_random_layout() -> void:
	if not _ensure_layout_initialized():
		return

	if slot_reference.is_empty():
		slot_reference = _build_slot_reference_from_defaults()

	var orange_choices: Array[int] = []
	for _i in 4:
		orange_choices.append(randi_range(0, 1))

	var purple_row: int = randi_range(0, 3)
	layout_data = _build_layout(orange_choices, purple_row)
	use_pixel_default_layout = false
	_apply_layout(true)

func _build_layout(orange_choices: Array[int], purple_row: int) -> Dictionary:
	var left_orange: Array[Vector2] = []
	var right_orange: Array[Vector2] = []
	var left_rows: Array[float] = _ensure_row_positions(_get_float_array(slot_reference, "left_rows"))
	var right_rows: Array[float] = _ensure_row_positions(_get_float_array(slot_reference, "right_rows"))
	var left_slots: Array[float] = _ensure_slot_positions(_get_float_array(slot_reference, "left_slots"), 0.19, 0.27)
	var right_slots: Array[float] = _ensure_slot_positions(_get_float_array(slot_reference, "right_slots"), 0.73, 0.81)
	var center_orange: Vector2 = _get_vector2_value(slot_reference, "center_orange")

	for row_index in left_rows.size():
		var left_position: Vector2 = Vector2(left_slots[orange_choices[row_index]], left_rows[row_index])
		left_orange.append(left_position)
		right_orange.append(_mirrored_right_slot(row_index, orange_choices[row_index], right_rows, right_slots, left_rows.size()))

	var left_purple: Vector2 = Vector2(left_slots[1 - orange_choices[purple_row]], left_rows[purple_row])
	var right_purple: Vector2 = _mirrored_right_slot(purple_row, 1 - orange_choices[purple_row], right_rows, right_slots, left_rows.size())

	return {
		"left_orange": left_orange,
		"left_purple": left_purple,
		"right_orange": right_orange,
		"right_purple": right_purple,
		"center_orange": center_orange
	}

func _mirrored_right_slot(left_row_index: int, left_slot_index: int, right_rows: Array[float], right_slots: Array[float], row_count: int) -> Vector2:
	var mirrored_row_index: int = row_count - 1 - left_row_index
	var mirrored_slot_index: int = 1 - left_slot_index
	return Vector2(right_slots[mirrored_slot_index], right_rows[mirrored_row_index])

func _apply_layout(animated: bool) -> void:
	if ball_nodes.is_empty() or layout_data.is_empty():
		return

	_move_group("left_orange", layout_data["left_orange"], animated)
	_move_group("right_orange", layout_data["right_orange"], animated)
	_move_group("left_purple", [layout_data["left_purple"]], animated)
	_move_group("right_purple", [layout_data["right_purple"]], animated)
	_move_group("center_orange", [layout_data["center_orange"]], animated)

func _apply_pixel_layout(pixel_layout: Dictionary, animated: bool) -> void:
	if ball_nodes.is_empty() or pixel_layout.is_empty():
		return

	_move_group_pixels("left_orange", pixel_layout["left_orange"], animated)
	_move_group_pixels("right_orange", pixel_layout["right_orange"], animated)
	_move_group_pixels("left_purple", [pixel_layout["left_purple"]], animated)
	_move_group_pixels("right_purple", [pixel_layout["right_purple"]], animated)
	_move_group_pixels("center_orange", [pixel_layout["center_orange"]], animated)

func _move_group(group_name: String, positions: Array, animated: bool) -> void:
	var nodes_variant: Variant = ball_nodes.get(group_name, [])
	if typeof(nodes_variant) != TYPE_ARRAY:
		return

	var nodes: Array = nodes_variant
	for index in mini(nodes.size(), positions.size()):
		var node_variant: Variant = nodes[index]
		if node_variant is Control:
			var node: Control = node_variant
			var pixel_position: Vector2 = _to_field_position(positions[index])
			if animated and not Engine.is_editor_hint():
				var tween: Tween = create_tween()
				tween.set_trans(Tween.TRANS_SINE)
				tween.set_ease(Tween.EASE_IN_OUT)
				tween.tween_property(node, "position", pixel_position, 0.40)
			else:
				node.position = pixel_position

func _build_slot_reference_from_defaults() -> Dictionary:
	var left_orange_pixels: Array[Vector2] = _get_vector2_array(default_pixel_layout_data, "left_orange")
	var right_orange_pixels: Array[Vector2] = _get_vector2_array(default_pixel_layout_data, "right_orange")
	var left_purple_pixel: Vector2 = _get_vector2_value(default_pixel_layout_data, "left_purple")
	var right_purple_pixel: Vector2 = _get_vector2_value(default_pixel_layout_data, "right_purple")
	var center_orange_pixel: Vector2 = _get_vector2_value(default_pixel_layout_data, "center_orange")

	var left_rows: Array[float] = _extract_sorted_y_positions(left_orange_pixels)
	var right_rows: Array[float] = _extract_sorted_y_positions(right_orange_pixels)
	var left_slots: Array[float] = _extract_sorted_x_positions(left_orange_pixels, left_purple_pixel)
	var right_slots: Array[float] = _extract_sorted_x_positions(right_orange_pixels, right_purple_pixel)

	return {
		"left_rows": left_rows,
		"right_rows": right_rows,
		"left_slots": left_slots,
		"right_slots": right_slots,
		"center_orange": _to_normalized_position(center_orange_pixel)
	}

func _extract_sorted_y_positions(points: Array[Vector2]) -> Array[float]:
	var values: Array[float] = []
	for point in points:
		values.append(_to_normalized_position(point).y)
	values.sort()
	return values

func _extract_sorted_x_positions(points: Array[Vector2], extra_point: Vector2) -> Array[float]:
	var values: Array[float] = []
	for point in points:
		values.append(_to_normalized_position(point).x)
	values.append(_to_normalized_position(extra_point).x)
	values.sort()

	var unique_values: Array[float] = []
	for value in values:
		if unique_values.is_empty() or absf(unique_values[unique_values.size() - 1] - value) > 0.0001:
			unique_values.append(value)
	return unique_values

func _ensure_row_positions(values: Array[float]) -> Array[float]:
	if values.size() >= 4:
		return values
	return [0.19, 0.38, 0.67, 0.86]

func _ensure_slot_positions(values: Array[float], fallback_a: float, fallback_b: float) -> Array[float]:
	if values.size() >= 2:
		return [values[0], values[1]]
	if values.size() == 1:
		var single: float = values[0]
		if absf(single - fallback_a) < absf(single - fallback_b):
			return [single, fallback_b]
		return [fallback_a, single]
	return [fallback_a, fallback_b]

func _get_float_array(source: Dictionary, key: String) -> Array[float]:
	var result: Array[float] = []
	var values_variant: Variant = source.get(key, [])
	if typeof(values_variant) != TYPE_ARRAY:
		return result

	var values: Array = values_variant
	for value_variant in values:
		result.append(float(value_variant))
	return result

func _get_vector2_array(source: Dictionary, key: String) -> Array[Vector2]:
	var result: Array[Vector2] = []
	var values_variant: Variant = source.get(key, [])
	if typeof(values_variant) != TYPE_ARRAY:
		return result

	var values: Array = values_variant
	for value_variant in values:
		if value_variant is Vector2:
			result.append(value_variant)
	return result

func _get_vector2_value(source: Dictionary, key: String) -> Vector2:
	var value_variant: Variant = source.get(key, Vector2.ZERO)
	return value_variant if value_variant is Vector2 else Vector2.ZERO

func _move_group_pixels(group_name: String, pixel_positions: Array, animated: bool) -> void:
	var nodes_variant: Variant = ball_nodes.get(group_name, [])
	if typeof(nodes_variant) != TYPE_ARRAY:
		return

	var nodes: Array = nodes_variant
	for index in mini(nodes.size(), pixel_positions.size()):
		var node_variant: Variant = nodes[index]
		if node_variant is Control:
			var node: Control = node_variant
			var pixel_position: Vector2 = pixel_positions[index]
			if animated and not Engine.is_editor_hint():
				var tween: Tween = create_tween()
				tween.set_trans(Tween.TRANS_SINE)
				tween.set_ease(Tween.EASE_IN_OUT)
				tween.tween_property(node, "position", pixel_position, 0.40)
			else:
				node.position = pixel_position

func _to_field_position(normalized: Vector2) -> Vector2:
	return Vector2(normalized.x * size.x, normalized.y * size.y) - Vector2(BALL_RADIUS, BALL_RADIUS)

func _to_normalized_position(pixel_position: Vector2) -> Vector2:
	if reference_playfield_size.x <= 0.0 or reference_playfield_size.y <= 0.0:
		return Vector2.ZERO
	return Vector2(
		(pixel_position.x + BALL_RADIUS) / reference_playfield_size.x,
		(pixel_position.y + BALL_RADIUS) / reference_playfield_size.y
	)
