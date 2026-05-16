extends RefCounted

const SAVE_PATH: String = "user://match_records.json"
const RESULT_WIN: String = "勝ち"

var records: Array = []

func load_records() -> Array:
	if not FileAccess.file_exists(SAVE_PATH):
		records = []
		return records

	var file: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		records = []
		return records

	var parsed: Variant = JSON.parse_string(file.get_as_text())
	records = parsed if parsed is Array else []
	return records

func save_records() -> bool:
	var file: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(records, "\t"))
	return true

func add_record(record: Dictionary) -> bool:
	records.push_front(record)
	return save_records()

func replace_series_record(series_id: String, match_number: int, updated_record: Dictionary) -> bool:
	for index in range(records.size()):
		var record: Dictionary = records[index] as Dictionary
		if str(record.get("series_id", "")) == series_id and int(record.get("match_number", 0)) == match_number:
			records[index] = updated_record
			return save_records()

	return add_record(updated_record)

func get_filtered_records(filter_name: String) -> Array:
	if filter_name == "all":
		return records.duplicate(true)

	var filtered: Array = []
	for record in records:
		if str(record.get("match_type", "")) == filter_name:
			filtered.append(record)
	return filtered

func get_statistics(for_records: Array) -> Dictionary:
	var total_matches: int = for_records.size()
	if total_matches == 0:
		return {
			"win_rate": 0.0,
			"total_matches": 0,
			"average_score": 0.0
		}

	var wins: int = 0
	var score_total: float = 0.0
	for record in for_records:
		if str(record.get("result", "")) == RESULT_WIN:
			wins += 1
		score_total += float(record.get("team_a_score", 0)) + float(record.get("team_b_score", 0))

	return {
		"win_rate": (float(wins) / float(total_matches)) * 100.0,
		"total_matches": total_matches,
		"average_score": score_total / float(total_matches)
	}
