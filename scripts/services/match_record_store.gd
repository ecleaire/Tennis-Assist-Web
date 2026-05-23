extends RefCounted

const SAVE_PATH: String = "user://match_records.json"
const RESULT_WIN: String = "勝ち"

var records: Array = []

func load_records() -> Array:
	# 対戦履歴は端末内の user:// に保存します。サーバーや他端末とは共有しません。
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
	# JSON配列として保存し、CSV出力や画面表示はこの同じ保存元から生成します。
	var file: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(records, "\t"))
	return true

func add_record(record: Dictionary) -> bool:
	records.push_front(record)
	return save_records()

func import_records(imported_records: Array) -> Dictionary:
	# CSV再インポート時に同じ試合を二重登録しないよう、安定したキーで照合します。
	var existing_keys: Dictionary = {}
	for record in records:
		if record is Dictionary:
			existing_keys[_record_key(record)] = true

	var added_count: int = 0
	var skipped_count: int = 0
	for imported_record in imported_records:
		if not (imported_record is Dictionary):
			continue
		var key: String = _record_key(imported_record)
		if existing_keys.has(key):
			skipped_count += 1
			continue
		records.push_front(imported_record)
		existing_keys[key] = true
		added_count += 1

	if added_count > 0 and not save_records():
		return {"ok": false, "added": 0, "skipped": skipped_count}
	return {"ok": true, "added": added_count, "skipped": skipped_count}

func replace_series_record(series_id: String, match_number: int, updated_record: Dictionary) -> bool:
	for index in range(records.size()):
		var record: Dictionary = records[index] as Dictionary
		if str(record.get("series_id", "")) == series_id and int(record.get("match_number", 0)) == match_number:
			records[index] = updated_record
			return save_records()

	return add_record(updated_record)

func clear_records() -> bool:
	records.clear()
	return save_records()

func _record_key(record: Dictionary) -> String:
	# competition_idがあればそれを優先し、古い履歴はシリーズ情報で近似キーを作ります。
	var competition_id: String = str(record.get("competition_id", ""))
	if not competition_id.is_empty():
		return "competition:%s" % competition_id
	return "%s:%s:%s:%s:%s" % [
		str(record.get("record_kind", "")),
		str(record.get("series_id", "")),
		str(record.get("court", "")),
		str(record.get("series_number", "")),
		str(record.get("match_number", ""))
	]

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
