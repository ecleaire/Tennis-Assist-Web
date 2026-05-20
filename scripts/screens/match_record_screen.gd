extends Control

signal series_started(match_number: int)
signal match_saved_for_next_match(match_number: int)
signal series_completed
signal requested_ball_preparation(match_number: int)
signal requested_timer_return(match_number: int)
signal requested_match_restart(match_number: int)

const MatchRecordStore = preload("res://scripts/services/match_record_store.gd")

# 大会進行の基本設定です。試合数やチーム一覧の参照先はここで調整します。
const TEAM_LIST_PATH: String = "res://data/team_list_example.csv"
const USER_TEAM_LIST_PATH: String = "user://team_list.csv"
const SERIES_MATCH_COUNT: int = 3
const MATCH_TYPE_OFFICIAL: String = "公式試合"
const MATCH_TYPE_PRACTICE: String = "練習試合"
const RESULT_WIN: String = "勝ち"
const RESULT_LOSE: String = "負け"
const RESULT_DRAW: String = "引き分け"
const TARGET_TEAM_UNSELECTED: String = "対象チーム未選択"
const TARGET_TEAM_DRAW: String = "引き分け"
const RECORD_KIND_MATCH: String = "マッチ"
const RECORD_KIND_SERIES_RESULT: String = "試合結果"
const TEAM_STATS_PERIOD_TODAY: int = 0
const TEAM_STATS_PERIOD_WEEK: int = 1
const TEAM_STATS_PERIOD_MONTH: int = 2
const CSV_EXPORT_COLUMNS: PackedStringArray = [
	"日時",
	"記録種別",
	"種別",
	"対戦ID",
	"コート",
	"試合番号",
	"マッチ番号",
	"チームA",
	"チームB",
	"チームA勝数",
	"チームA敗数",
	"チームAオレンジ",
	"チームA紫",
	"チームA得点",
	"チームA違反数",
	"チームB勝数",
	"チームB敗数",
	"チームBオレンジ",
	"チームB紫",
	"チームB得点",
	"チームB違反数",
	"引き分け数",
	"総合勝者",
	"マッチ勝者",
	"結果",
	"終了カテゴリ",
	"終了理由",
	"対象チーム",
	"メモ"
]
const COLOR_WINNER: Color = Color("67e08a")
const COLOR_NORMAL: Color = Color("e7edf8")
const COLOR_SUBTLE: Color = Color("9fb0d2")
const COLOR_TABLE_WIN: Color = Color(0.18, 0.34, 0.24, 0.95)
const COLOR_TABLE_LOSE: Color = Color(0.34, 0.18, 0.20, 0.95)
const COLOR_TABLE_NEUTRAL: Color = Color(0.12, 0.17, 0.29, 0.92)
const COLOR_TABLE_HEADER: Color = Color(0.17, 0.22, 0.36, 0.98)
const AUTO_WINNER_SCORE: int = -4
const AUTO_LOSER_SCORE: int = 9

# ボール総数の基準です。ルール変更時はここを調整します。
const ORANGE_MAX: int = 9
const PURPLE_TOTAL: int = 2
const INTERMEDIATE_COLUMN_WIDTHS: Array[float] = [120.0, 320.0, 76.0, 76.0, 76.0, 76.0, 76.0, 76.0, 76.0, 76.0, 140.0]
const FINAL_COLUMN_WIDTHS: Array[float] = [250.0, 120.0, 120.0, 110.0, 110.0, 150.0, 140.0]

# 試合終了理由のカテゴリと選択肢です。ルール変更時はここを調整します。
const REASON_CATEGORY_SCORING: String = "【終了・その時点で採点】（通常の試合停止）"
const REASON_CATEGORY_PREMATCH: String = "【違反・自動敗北 / 失格】試合前・競技全般"
const REASON_CATEGORY_INMATCH: String = "【違反・自動敗北 / 失格】試合中の違反"

const END_REASONS_SCORING: PackedStringArray = [
	"時間切れでの終了(6.32.1)",
	"コールドルールの成立(6.32.4)",
	"偶発的な接触(6.28)",
	"ボールの過剰操作(6.30)",
	"両チーム合意による停止(6.32.9)"
]

const END_REASONS_PREMATCH: PackedStringArray = [
	"倫理規定違反(3.1〜3.10)",
	"車検（チェック）不合格(6.1.2)",
	"遅刻(6.10)",
	"不正なデータ入力(6.17)"
]

const END_REASONS_INMATCH: PackedStringArray = [
	"開始後10秒間の不動(6.20)",
	"両ロボットの撤去(6.21 / 6.32.10)",
	"分離パーツの違反(6.23)",
	"外部からの合図・入力(6.24)",
	"レッドゾーンへの接触(6.27)",
	"故意のロボット接触(6.28)",
	"相手陣地・ロボットへの接触(6.29 / 6.32.2)",
	"サイズ制限の超過(6.32.3)",
	"意図的なコールド誘発(6.32.4)",
	"人間による接触(6.32.5)",
	"両ロボットの脱走(6.32.6)",
	"ボールの破損(6.32.7)",
	"フィールド・設備の破損(6.32.8)",
	"無許可の移動・撤去(6.33)"
]

@onready var team_a_select: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/TeamSelectionPanel/TeamSelectionMargin/TeamSelectionLayout/SelectionRow/TeamASelect
@onready var scroll: ScrollContainer = $Scroll
@onready var tournament_layout: VBoxContainer = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout
@onready var team_selection_layout: VBoxContainer = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/TeamSelectionPanel/TeamSelectionMargin/TeamSelectionLayout
@onready var result_input_panel: PanelContainer = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel
@onready var team_b_select: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/TeamSelectionPanel/TeamSelectionMargin/TeamSelectionLayout/SelectionRow/TeamBSelect
@onready var start_series_button: Button = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/TeamSelectionPanel/TeamSelectionMargin/TeamSelectionLayout/SelectionRow/StartSeriesButton
@onready var reset_series_button: Button = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/TeamSelectionPanel/TeamSelectionMargin/TeamSelectionLayout/SelectionRow/ResetSeriesButton
@onready var current_series_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/TeamSelectionPanel/TeamSelectionMargin/TeamSelectionLayout/CurrentSeriesLabel
@onready var match_progress_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/TeamSelectionPanel/TeamSelectionMargin/TeamSelectionLayout/MatchProgressLabel
@onready var tournament_status_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/TeamSelectionPanel/TeamSelectionMargin/TeamSelectionLayout/TournamentStatusLabel
@onready var old_stats_flow: Control = $Scroll/Layout/StatsFlow
@onready var team_stats_select: OptionButton = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsHeader/TeamStatsSelect
@onready var team_stats_period_select: OptionButton = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsHeader/TeamStatsPeriodSelect
@onready var all_time_matches_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/AllTimeFlow/AllTimeMatchesPanel/AllTimeMatchesMargin/AllTimeMatchesLabel
@onready var all_time_record_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/AllTimeFlow/AllTimeRecordPanel/AllTimeRecordMargin/AllTimeRecordLabel
@onready var all_time_win_rate_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/AllTimeFlow/AllTimeWinRatePanel/AllTimeWinRateMargin/AllTimeWinRateLabel
@onready var all_time_violation_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/AllTimeFlow/AllTimePurpleRatePanel/AllTimePurpleRateMargin/AllTimePurpleRateLabel
@onready var weekly_matches_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/WeeklyFlow/WeeklyMatchesPanel/WeeklyMatchesMargin/WeeklyMatchesLabel
@onready var weekly_record_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/WeeklyFlow/WeeklyRecordPanel/WeeklyRecordMargin/WeeklyRecordLabel
@onready var weekly_win_rate_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/WeeklyFlow/WeeklyWinRatePanel/WeeklyWinRateMargin/WeeklyWinRateLabel
@onready var weekly_violation_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/WeeklyFlow/WeeklyPurpleRatePanel/WeeklyPurpleRateMargin/WeeklyPurpleRateLabel
@onready var all_time_total_matches_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/AllTimeFlow/AllTimeMatchesPanel/AllTimeMatchesMargin/AllTimeMatchesLabel
@onready var all_time_average_score_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/AllTimeFlow/AllTimeRecordPanel/AllTimeRecordMargin/AllTimeRecordLabel
@onready var weekly_total_matches_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/WeeklyFlow/WeeklyMatchesPanel/WeeklyMatchesMargin/WeeklyMatchesLabel
@onready var weekly_average_score_label: Label = $Scroll/Layout/TeamStatsPanel/TeamStatsMargin/TeamStatsLayout/TeamStatsValues/WeeklyFlow/WeeklyRecordPanel/WeeklyRecordMargin/WeeklyRecordLabel

@onready var match_title_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/MatchTitleLabel
@onready var match_teams_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/MatchTeamsLabel
@onready var reason_category_option: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ReasonRow/ReasonCategoryOption
@onready var target_team_option: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ReasonRow/TargetTeamOption
@onready var end_reason_option: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ReasonRow/EndReasonOption
@onready var winner_team_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ReasonRow/WinnerTeamLabel
@onready var winner_preview_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/WinnerPreviewLabel
@onready var team_a_name_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ScoreRow/ScoreContent/ScorePanels/TeamAPanel/TeamAMargin/TeamALayout/TeamANameLabel
@onready var team_a_orange: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ScoreRow/ScoreContent/ScorePanels/TeamAPanel/TeamAMargin/TeamALayout/TeamAOrange
@onready var team_a_purple: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ScoreRow/ScoreContent/ScorePanels/TeamAPanel/TeamAMargin/TeamALayout/TeamAPurple
@onready var team_a_score_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ScoreRow/ScoreContent/ScorePanels/TeamAPanel/TeamAMargin/TeamALayout/TeamAScoreLabel
@onready var team_b_name_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ScoreRow/ScoreContent/ScorePanels/TeamBPanel/TeamBMargin/TeamBLayout/TeamBNameLabel
@onready var team_b_orange: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ScoreRow/ScoreContent/ScorePanels/TeamBPanel/TeamBMargin/TeamBLayout/TeamBOrange
@onready var team_b_purple: OptionButton = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ScoreRow/ScoreContent/ScorePanels/TeamBPanel/TeamBMargin/TeamBLayout/TeamBPurple
@onready var team_b_score_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/ScoreRow/ScoreContent/ScorePanels/TeamBPanel/TeamBMargin/TeamBLayout/TeamBScoreLabel
@onready var save_match_button: Button = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/SaveMatchButton
@onready var tournament_save_status_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultInputPanel/ResultInputMargin/ResultInputLayout/TournamentSaveStatusLabel

@onready var intermediate_summary_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultBoards/IntermediatePanel/IntermediateMargin/IntermediateLayout/IntermediateSummaryLabel
@onready var intermediate_header: VBoxContainer = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultBoards/IntermediatePanel/IntermediateMargin/IntermediateLayout/IntermediateHeader
@onready var intermediate_list: VBoxContainer = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultBoards/IntermediatePanel/IntermediateMargin/IntermediateLayout/IntermediateList
@onready var final_summary_label: Label = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultBoards/FinalPanel/FinalMargin/FinalLayout/FinalSummaryLabel
@onready var final_header: VBoxContainer = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultBoards/FinalPanel/FinalMargin/FinalLayout/FinalHeader
@onready var final_list: VBoxContainer = $Scroll/Layout/TournamentPanel/TournamentMargin/TournamentLayout/ResultBoards/FinalPanel/FinalMargin/FinalLayout/FinalList

@onready var history_panel: PanelContainer = $Scroll/Layout/HistoryPanel
@onready var history_header: HBoxContainer = $Scroll/Layout/HistoryPanel/HistoryMargin/HistoryLayout/HistoryHeader
@onready var filter_option: OptionButton = $Scroll/Layout/HistoryPanel/HistoryMargin/HistoryLayout/HistoryHeader/FilterOption
@onready var history_list: VBoxContainer = $Scroll/Layout/HistoryPanel/HistoryMargin/HistoryLayout/HistoryScroll/HistoryList
var store: RefCounted = MatchRecordStore.new()
var team_list: Array[String] = []
var active_series: Dictionary = {}
var flow_tools_panel: PanelContainer
var flow_tools_status_label: Label
var back_to_balls_button: Button
var back_to_timer_button: Button
var restart_match_button: Button
var reinput_result_button: Button
var team_editor_toggle_button: Button
var court_select: OptionButton
var history_toggle_button: Button
var history_export_button: Button
var history_team_select: OptionButton
var history_clear_button: Button
var history_status_label: Label
var team_editor_panel: PanelContainer
var team_editor_text: TextEdit
var team_editor_status_label: Label
var team_editor_load_button: Button
var team_editor_save_button: Button
var team_editor_cancel_button: Button
var team_editor_reset_button: Button
var team_editor_file_dialog: FileDialog
var team_editor_web_file_callback: JavaScriptObject
var save_confirm_dialog: ConfirmationDialog
var action_confirm_dialog: ConfirmationDialog
var pending_confirm_action: String = ""
var pending_confirm_match_number: int = 0
var final_agreement_panel: PanelContainer
var final_agreement_label: Label
var team_a_agree_button: Button
var team_b_agree_button: Button
var finalize_series_button: Button
var agreement_confirm_dialog: ConfirmationDialog
var pending_agreement_team: String = ""
var editing_match_number: int = 0
var team_a_agreed: bool = false
var team_b_agreed: bool = false
var series_finalized: bool = false

# 紫ボールのA/B自動補完で、相互シグナルがループしないようにするフラグです。
var is_syncing_ball_options: bool = false

func _ready() -> void:
	_create_flow_tools()
	_create_court_selector()
	_create_history_tools()
	_create_team_editor()
	_create_save_confirm_dialog()
	_create_action_confirm_dialog()
	_create_agreement_confirm_dialog()
	_create_final_agreement_panel()
	_setup_static_options()
	_setup_ball_count_options()
	_connect_signals()
	store.load_records()
	team_list = _load_team_list()
	_populate_team_selects()
	_populate_team_stats_select()
	_setup_team_stats_period_select()
	_build_intermediate_header()
	_build_final_header()
	_reset_series_state()
	_refresh_history()
	_update_score_labels()
	old_stats_flow.visible = false
	history_panel.visible = false

func _create_flow_tools() -> void:
	flow_tools_panel = PanelContainer.new()
	flow_tools_panel.name = "FlowToolsPanel"
	flow_tools_panel.visible = false
	flow_tools_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 14)
	flow_tools_panel.add_child(margin)

	var layout: VBoxContainer = VBoxContainer.new()
	layout.add_theme_constant_override("separation", 10)
	margin.add_child(layout)

	flow_tools_status_label = Label.new()
	flow_tools_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	flow_tools_status_label.add_theme_font_size_override("font_size", 18)
	layout.add_child(flow_tools_status_label)

	var row: HFlowContainer = HFlowContainer.new()
	row.alignment = FlowContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("h_separation", 10)
	row.add_theme_constant_override("v_separation", 10)
	layout.add_child(row)

	back_to_balls_button = _create_flow_button("ボール配置に戻る")
	back_to_timer_button = _create_flow_button("タイマーに戻る")
	restart_match_button = _create_flow_button("このマッチをやり直す")
	reinput_result_button = _create_flow_button("結果を再入力")
	row.add_child(back_to_balls_button)
	row.add_child(back_to_timer_button)
	row.add_child(restart_match_button)
	row.add_child(reinput_result_button)

	tournament_layout.add_child(flow_tools_panel)
	tournament_layout.move_child(flow_tools_panel, 1)

func _create_flow_button(text_value: String) -> Button:
	var button: Button = Button.new()
	button.text = text_value
	button.custom_minimum_size = Vector2(190, 46)
	return button

func _create_court_selector() -> void:
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	team_selection_layout.add_child(row)

	var label: Label = Label.new()
	label.text = "コート"
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.custom_minimum_size = Vector2(80, 44)
	row.add_child(label)

	court_select = OptionButton.new()
	court_select.custom_minimum_size = Vector2(180, 44)
	for code_number in range(65, 91):
		court_select.add_item("%sコート" % String.chr(code_number))
	court_select.select(0)
	row.add_child(court_select)

func _create_history_tools() -> void:
	history_toggle_button = _create_flow_button("対戦履歴閲覧")
	team_selection_layout.add_child(history_toggle_button)

	history_team_select = OptionButton.new()
	history_team_select.custom_minimum_size = Vector2(190, 44)
	history_header.add_child(history_team_select)

	history_export_button = Button.new()
	history_export_button.text = "CSVエクスポート"
	history_export_button.custom_minimum_size = Vector2(180, 44)
	history_header.add_child(history_export_button)

	history_clear_button = Button.new()
	history_clear_button.text = "履歴削除"
	history_clear_button.custom_minimum_size = Vector2(150, 44)
	history_header.add_child(history_clear_button)

	history_status_label = Label.new()
	history_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	history_status_label.text = ""
	var history_layout: VBoxContainer = $Scroll/Layout/HistoryPanel/HistoryMargin/HistoryLayout
	history_layout.add_child(history_status_label)

func _create_team_editor() -> void:
	team_editor_toggle_button = Button.new()
	team_editor_toggle_button.text = "チームリスト編集"
	team_editor_toggle_button.custom_minimum_size = Vector2(190, 44)
	team_selection_layout.add_child(team_editor_toggle_button)

	team_editor_panel = PanelContainer.new()
	team_editor_panel.name = "TeamEditorPanel"
	team_editor_panel.visible = false
	team_editor_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	team_selection_layout.add_child(team_editor_panel)

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_bottom", 14)
	team_editor_panel.add_child(margin)

	var layout: VBoxContainer = VBoxContainer.new()
	layout.add_theme_constant_override("separation", 10)
	margin.add_child(layout)

	team_editor_text = TextEdit.new()
	team_editor_text.custom_minimum_size = Vector2(0, 220)
	team_editor_text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	team_editor_text.placeholder_text = "1行に1チーム名"
	layout.add_child(team_editor_text)

	var button_row: HFlowContainer = HFlowContainer.new()
	button_row.add_theme_constant_override("h_separation", 10)
	button_row.add_theme_constant_override("v_separation", 10)
	layout.add_child(button_row)

	team_editor_load_button = _create_flow_button("ファイル読込")
	team_editor_save_button = _create_flow_button("保存して反映")
	team_editor_cancel_button = _create_flow_button("閉じる")
	team_editor_reset_button = _create_flow_button("初期リストに戻す")
	button_row.add_child(team_editor_load_button)
	button_row.add_child(team_editor_save_button)
	button_row.add_child(team_editor_cancel_button)
	button_row.add_child(team_editor_reset_button)

	team_editor_status_label = Label.new()
	team_editor_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	layout.add_child(team_editor_status_label)

	team_editor_file_dialog = FileDialog.new()
	team_editor_file_dialog.title = "チームリストを読み込み"
	team_editor_file_dialog.file_mode = FileDialog.FILE_MODE_OPEN_FILE
	team_editor_file_dialog.access = FileDialog.ACCESS_FILESYSTEM
	team_editor_file_dialog.filters = PackedStringArray(["*.csv ; CSV", "*.txt ; Text"])
	add_child(team_editor_file_dialog)

	if Engine.has_singleton("JavaScriptBridge"):
		team_editor_web_file_callback = JavaScriptBridge.create_callback(_on_web_team_list_file_loaded)
		var window = JavaScriptBridge.get_interface("window")
		if window != null and team_editor_web_file_callback != null:
			window.wroTeamListFileLoaded = team_editor_web_file_callback

func _create_save_confirm_dialog() -> void:
	save_confirm_dialog = ConfirmationDialog.new()
	save_confirm_dialog.title = "保存前確認"
	save_confirm_dialog.confirmed.connect(_save_current_match)
	add_child(save_confirm_dialog)
	save_confirm_dialog.get_ok_button().text = "保存する"
	save_confirm_dialog.get_cancel_button().text = "戻る"

func _create_action_confirm_dialog() -> void:
	action_confirm_dialog = ConfirmationDialog.new()
	action_confirm_dialog.title = "操作確認"
	action_confirm_dialog.confirmed.connect(_perform_pending_confirm_action)
	add_child(action_confirm_dialog)
	action_confirm_dialog.get_ok_button().text = "実行する"
	action_confirm_dialog.get_cancel_button().text = "キャンセル"

func _create_agreement_confirm_dialog() -> void:
	agreement_confirm_dialog = ConfirmationDialog.new()
	agreement_confirm_dialog.title = "代表同意前の最終確認"
	agreement_confirm_dialog.confirmed.connect(_confirm_pending_team_agreement)
	add_child(agreement_confirm_dialog)
	agreement_confirm_dialog.get_ok_button().text = "同意する"
	agreement_confirm_dialog.get_cancel_button().text = "戻る"

func _create_final_agreement_panel() -> void:
	final_agreement_panel = PanelContainer.new()
	final_agreement_panel.name = "FinalAgreementPanel"
	final_agreement_panel.visible = false
	final_agreement_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_bottom", 16)
	final_agreement_panel.add_child(margin)

	var layout: VBoxContainer = VBoxContainer.new()
	layout.add_theme_constant_override("separation", 12)
	margin.add_child(layout)

	var title: Label = Label.new()
	title.text = "最終確認・代表同意"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 22)
	layout.add_child(title)

	final_agreement_label = Label.new()
	final_agreement_label.text = "第3マッチまでの結果を確認し、各チーム代表が同意してください。"
	final_agreement_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	final_agreement_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	final_agreement_label.custom_minimum_size = Vector2(0, 34)
	layout.add_child(final_agreement_label)

	var agree_row: HFlowContainer = HFlowContainer.new()
	agree_row.alignment = FlowContainer.ALIGNMENT_CENTER
	agree_row.add_theme_constant_override("h_separation", 12)
	agree_row.add_theme_constant_override("v_separation", 10)
	layout.add_child(agree_row)

	team_a_agree_button = _create_flow_button("チームA代表 同意")
	team_b_agree_button = _create_flow_button("チームB代表 同意")
	finalize_series_button = _create_flow_button("試合結果を確定")
	finalize_series_button.disabled = true
	agree_row.add_child(team_a_agree_button)
	agree_row.add_child(team_b_agree_button)
	agree_row.add_child(finalize_series_button)

	tournament_layout.add_child(final_agreement_panel)

func _setup_static_options() -> void:
	# 保存済み履歴の表示フィルターです。
	filter_option.clear()
	filter_option.add_item("すべて")
	filter_option.add_item(MATCH_TYPE_PRACTICE)
	filter_option.add_item(MATCH_TYPE_OFFICIAL)
	filter_option.select(0)

	_setup_reason_category_options()
	_refresh_end_reason_options()
	_refresh_target_team_visibility()

func _setup_reason_category_options() -> void:
	reason_category_option.clear()
	reason_category_option.add_item(REASON_CATEGORY_SCORING)
	reason_category_option.add_item(REASON_CATEGORY_INMATCH)
	reason_category_option.add_item(REASON_CATEGORY_PREMATCH)
	reason_category_option.select(0)

func _refresh_end_reason_options() -> void:
	end_reason_option.clear()
	for reason in _current_reason_list():
		end_reason_option.add_item(reason)
	if end_reason_option.item_count > 0:
		end_reason_option.select(0)

func _current_reason_list() -> PackedStringArray:
	match _selected_reason_category():
		REASON_CATEGORY_PREMATCH:
			return END_REASONS_PREMATCH
		REASON_CATEGORY_INMATCH:
			return END_REASONS_INMATCH
		_:
			return END_REASONS_SCORING

func _selected_reason_category() -> String:
	if reason_category_option.item_count == 0 or reason_category_option.selected < 0:
		return REASON_CATEGORY_SCORING
	return reason_category_option.get_item_text(reason_category_option.selected)

func _is_violation_category() -> bool:
	return _is_auto_defeat_reason(_selected_reason_category(), "")

func _refresh_target_team_visibility() -> void:
	var show_violation_team: bool = _is_violation_category()
	winner_team_label.visible = show_violation_team
	target_team_option.visible = show_violation_team
	target_team_option.clear()

	if show_violation_team:
		winner_team_label.text = "③ 違反したチーム"
		target_team_option.add_item(TARGET_TEAM_UNSELECTED)
		if not active_series.is_empty():
			target_team_option.add_item(str(active_series.get("team_a", "")))
			target_team_option.add_item(str(active_series.get("team_b", "")))
		target_team_option.select(0)
	else:
		target_team_option.add_item(TARGET_TEAM_DRAW)
		target_team_option.select(0)

func _selected_target_team_text() -> String:
	if target_team_option.item_count == 0 or target_team_option.selected < 0:
		return TARGET_TEAM_UNSELECTED
	return target_team_option.get_item_text(target_team_option.selected)

func _connect_signals() -> void:
	start_series_button.pressed.connect(_start_series)
	reset_series_button.pressed.connect(_request_reset_series_state)
	save_match_button.pressed.connect(_request_save_current_match)
	back_to_balls_button.pressed.connect(_request_back_to_balls)
	back_to_timer_button.pressed.connect(_request_back_to_timer)
	restart_match_button.pressed.connect(_restart_current_match)
	reinput_result_button.pressed.connect(_reinput_current_match_result)
	history_toggle_button.pressed.connect(_toggle_history_panel)
	history_export_button.pressed.connect(_export_all_history_csv)
	history_team_select.item_selected.connect(_refresh_history)
	history_clear_button.pressed.connect(_request_clear_all_history)
	team_editor_toggle_button.pressed.connect(_toggle_team_editor)
	team_editor_load_button.pressed.connect(_open_team_list_file_dialog)
	team_editor_save_button.pressed.connect(_save_team_editor)
	team_editor_cancel_button.pressed.connect(_hide_team_editor)
	team_editor_reset_button.pressed.connect(_reset_team_editor_to_default)
	team_editor_file_dialog.file_selected.connect(_load_team_list_file)
	team_a_agree_button.pressed.connect(_on_team_a_agreed)
	team_b_agree_button.pressed.connect(_on_team_b_agreed)
	finalize_series_button.pressed.connect(_finalize_series_result)
	filter_option.item_selected.connect(_refresh_history)
	team_stats_select.item_selected.connect(_refresh_history)
	team_stats_period_select.item_selected.connect(_refresh_history)
	reason_category_option.item_selected.connect(_on_reason_category_selected)
	target_team_option.item_selected.connect(_on_target_team_selected)
	team_a_orange.item_selected.connect(_on_team_a_orange_selected)
	team_a_purple.item_selected.connect(_on_team_a_purple_selected)
	team_b_orange.item_selected.connect(_on_team_b_orange_selected)
	team_b_purple.item_selected.connect(_on_team_b_purple_selected)

func _request_confirm_action(title_text: String, body_text: String, action_name: String, match_number: int = 0) -> void:
	pending_confirm_action = action_name
	pending_confirm_match_number = match_number
	action_confirm_dialog.title = title_text
	action_confirm_dialog.dialog_text = body_text
	action_confirm_dialog.popup_centered(Vector2i(640, 340))

func _perform_pending_confirm_action() -> void:
	var action_name: String = pending_confirm_action
	var match_number: int = pending_confirm_match_number
	pending_confirm_action = ""
	pending_confirm_match_number = 0
	match action_name:
		"reset_series":
			_reset_series_state()
		"restart_match":
			_restart_current_match_now()
		"reinput_result":
			_reinput_current_match_result_now()
		"edit_match":
			_load_match_for_edit_now(match_number)
		"clear_history":
			_clear_all_history_now()

func _load_team_list() -> Array[String]:
	# CSVは「番号,チーム名」の想定です。読み込めない場合は仮チーム名を使います。
	var path: String = USER_TEAM_LIST_PATH if FileAccess.file_exists(USER_TEAM_LIST_PATH) else TEAM_LIST_PATH
	var loaded: Array[String] = _load_team_list_from_path(path)
	if loaded.is_empty():
		loaded.assign(["ALFA", "BRAVO", "CHARLIE", "DELTA"])
	return loaded

func _load_team_list_from_path(path: String) -> Array[String]:
	if not FileAccess.file_exists(path):
		return []

	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		return []

	return _team_list_from_text(file.get_as_text())

func _save_team_list_to_user() -> bool:
	var file: FileAccess = FileAccess.open(USER_TEAM_LIST_PATH, FileAccess.WRITE)
	if file == null:
		return false

	file.store_string("チーム番号,チーム名\n")
	for i in range(team_list.size()):
		file.store_string("%d,%s\n" % [i + 1, _csv_escape(team_list[i])])
	return true

func _parse_csv_line(line: String) -> PackedStringArray:
	var columns: PackedStringArray = []
	var current: String = ""
	var in_quotes: bool = false
	var i: int = 0
	while i < line.length():
		var character: String = line.substr(i, 1)
		if character == "\"":
			if in_quotes and i + 1 < line.length() and line.substr(i + 1, 1) == "\"":
				current += "\""
				i += 1
			else:
				in_quotes = not in_quotes
		elif character == "," and not in_quotes:
			columns.append(current)
			current = ""
		else:
			current += character
		i += 1
	columns.append(current)
	return columns

func _csv_escape(value: String) -> String:
	if value.contains(",") or value.contains("\"") or value.contains("\n") or value.contains("\r"):
		return "\"%s\"" % value.replace("\"", "\"\"")
	return value

func _csv_line(values: PackedStringArray) -> String:
	var escaped: PackedStringArray = []
	for value in values:
		escaped.append(_csv_escape(value))
	return ",".join(escaped)

func _toggle_history_panel() -> void:
	history_panel.visible = not history_panel.visible
	if history_panel.visible:
		_refresh_history()
		_update_history_status_count()
		call_deferred("_scroll_to_control", history_panel)

func _update_history_status_count() -> void:
	var all_records: Array = store.get_filtered_records("all")
	var filtered_records: Array = _history_records_for_current_filters()
	var selected_team: String = _selected_history_team()
	var team_text: String = "全チーム" if selected_team.is_empty() else selected_team
	history_status_label.text = "表示 %d件 / 全履歴 %d件 / 対象: %s。CSVは全履歴を出力します。" % [filtered_records.size(), all_records.size(), team_text]

func _request_clear_all_history() -> void:
	var all_records: Array = store.get_filtered_records("all")
	if all_records.is_empty():
		history_status_label.text = "削除できる履歴はありません。"
		return
	_request_confirm_action(
		"この端末の履歴を全削除",
		"この端末・このブラウザに保存された対戦履歴 %d件を削除します。\n公開版サーバーや他端末の履歴には影響しません。\nこの操作は元に戻せません。削除しますか？" % all_records.size(),
		"clear_history"
	)

func _clear_all_history_now() -> void:
	if not store.clear_records():
		history_status_label.text = "履歴の削除に失敗しました。"
		return
	history_panel.visible = true
	_refresh_history()
	history_status_label.text = "この端末の対戦履歴をすべて削除しました。"

func _history_records_for_current_filters() -> Array:
	var records_for_type: Array = store.get_filtered_records(_current_filter_key())
	var selected_team: String = _selected_history_team()
	if selected_team.is_empty():
		return records_for_type
	var filtered: Array = []
	for record in records_for_type:
		if _record_involves_team(record, selected_team):
			filtered.append(record)
	return filtered

func _selected_history_team() -> String:
	if history_team_select == null or history_team_select.item_count == 0 or history_team_select.selected <= 0:
		return ""
	return history_team_select.get_item_text(history_team_select.selected)

func _record_involves_team(record: Variant, team_name: String) -> bool:
	return record is Dictionary and (str(record.get("team_a", "")) == team_name or str(record.get("team_b", "")) == team_name)

func _export_all_history_csv() -> void:
	var all_records: Array = store.get_filtered_records("all")
	if all_records.is_empty():
		history_panel.visible = true
		history_status_label.text = "エクスポートできる対戦履歴がまだありません。"
		return

	var export_records: Array = all_records.duplicate(true)
	export_records.reverse()
	var csv_text: String = _build_match_history_csv(export_records)
	var filename: String = "wro_match_history_%s.csv" % _timestamp_for_filename()
	var status_text: String = ""

	if OS.has_feature("web") and Engine.has_singleton("JavaScriptBridge"):
		_download_csv_web(filename, csv_text)
		status_text = "%s をダウンロードしました。ExcelやGoogleスプレッドシートに読み込めます。" % filename
	else:
		var saved_path: String = _save_csv_native(filename, csv_text)
		if saved_path.is_empty():
			status_text = "CSVの保存に失敗しました。"
		else:
			status_text = "CSVを保存しました: %s" % saved_path

	history_panel.visible = true
	_refresh_history()
	history_status_label.text = status_text
	call_deferred("_scroll_to_control", history_panel)

func _build_match_history_csv(records: Array) -> String:
	var lines: PackedStringArray = [_csv_line(CSV_EXPORT_COLUMNS)]
	for record in records:
		if record is Dictionary:
			lines.append(_csv_line(_record_to_csv_row(record)))
	return "\r\n".join(lines)

func _record_to_csv_row(record: Dictionary) -> PackedStringArray:
	var team_a_name: String = str(record.get("team_a", ""))
	var team_b_name: String = str(record.get("team_b", ""))
	var team_a_violations: int = int(record.get("team_a_violations", _violation_count_for_record(record, team_a_name)))
	var team_b_violations: int = int(record.get("team_b_violations", _violation_count_for_record(record, team_b_name)))
	var is_series_result: bool = str(record.get("record_kind", RECORD_KIND_MATCH)) == RECORD_KIND_SERIES_RESULT
	return PackedStringArray([
		str(record.get("timestamp", "")),
		str(record.get("record_kind", RECORD_KIND_MATCH)),
		str(record.get("match_type", "")),
		str(record.get("series_id", "")),
		str(record.get("court", "")),
		_record_competition_id(record),
		_record_match_number_text(record),
		team_a_name,
		team_b_name,
		_optional_int_text(record, "team_a_wins"),
		_optional_int_text(record, "team_a_losses"),
		str(int(record.get("team_a_orange", 0))),
		str(int(record.get("team_a_purple", 0))),
		str(int(record.get("team_a_score", 0))),
		str(team_a_violations),
		_optional_int_text(record, "team_b_wins"),
		_optional_int_text(record, "team_b_losses"),
		str(int(record.get("team_b_orange", 0))),
		str(int(record.get("team_b_purple", 0))),
		str(int(record.get("team_b_score", 0))),
		str(team_b_violations),
		_optional_int_text(record, "draws"),
		str(record.get("overall_winner", "")),
		"" if is_series_result else str(record.get("winner", "")),
		str(record.get("result", "")) if is_series_result else "",
		str(record.get("reason_category", "")),
		str(record.get("end_reason", "")),
		str(record.get("target_team", "")),
		str(record.get("notes", ""))
	])

func _optional_int_text(record: Dictionary, key: String) -> String:
	if not record.has(key):
		return ""
	return str(int(record.get(key, 0)))

func _record_match_number_text(record: Dictionary) -> String:
	if str(record.get("record_kind", RECORD_KIND_MATCH)) == RECORD_KIND_SERIES_RESULT:
		return ""
	if not record.has("match_number"):
		return ""
	return str(int(record.get("match_number", 0)))

func _record_competition_id(record: Dictionary) -> String:
	if record.has("competition_id"):
		return str(record.get("competition_id", ""))
	var court_code: String = _court_code_from_name(str(record.get("court", "Aコート")))
	var series_number: int = int(record.get("series_number", 1))
	if str(record.get("record_kind", RECORD_KIND_MATCH)) == RECORD_KIND_SERIES_RESULT:
		return "%s_%02d_RESULT" % [court_code, series_number]
	return "%s_%02d_%d" % [court_code, series_number, int(record.get("match_number", 0))]

func _court_code_from_name(court_name: String) -> String:
	var trimmed: String = court_name.strip_edges()
	if trimmed.is_empty():
		return "A"
	return trimmed.substr(0, 1).to_upper()

func _save_csv_native(filename: String, csv_text: String) -> String:
	var path: String = "user://%s" % filename
	var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		return ""

	file.store_buffer(("\uFEFF" + csv_text).to_utf8_buffer())
	return ProjectSettings.globalize_path(path)

func _download_csv_web(filename: String, csv_text: String) -> void:
	var payload: PackedByteArray = ("\uFEFF" + csv_text).to_utf8_buffer()
	var base64_text: String = Marshalls.raw_to_base64(payload)
	var command: String = """
(function () {
	const b64 = '%s';
	const filename = '%s';
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}());
""" % [base64_text, filename]
	JavaScriptBridge.eval(command, true)

func _timestamp_for_filename() -> String:
	var now: Dictionary = Time.get_datetime_dict_from_system()
	return "%04d%02d%02d_%02d%02d%02d" % [
		now.year,
		now.month,
		now.day,
		now.hour,
		now.minute,
		now.second
	]

func _toggle_team_editor() -> void:
	team_editor_panel.visible = not team_editor_panel.visible
	if team_editor_panel.visible:
		_refresh_team_editor_text()
		team_editor_status_label.text = ""

func _hide_team_editor() -> void:
	team_editor_panel.visible = false

func _refresh_team_editor_text() -> void:
	team_editor_text.text = "\n".join(team_list)

func _open_team_list_file_dialog() -> void:
	if not active_series.is_empty():
		team_editor_status_label.text = "対戦中はチームリストを読み込めません。"
		return
	if OS.has_feature("web") and team_editor_web_file_callback != null and Engine.has_singleton("JavaScriptBridge"):
		_open_web_team_list_file_picker()
	else:
		team_editor_file_dialog.popup_centered_ratio(0.7)

func _open_web_team_list_file_picker() -> void:
	var command: String = """
(function () {
	const oldInput = document.getElementById('wro-team-list-file-input');
	if (oldInput) {
		oldInput.remove();
	}

	const input = document.createElement('input');
	input.id = 'wro-team-list-file-input';
	input.type = 'file';
	input.accept = '.csv,.txt,text/csv,text/plain';
	input.style.display = 'none';
	input.onchange = function (event) {
		const file = event.target.files && event.target.files[0];
		if (!file) {
			input.remove();
			return;
		}

		const reader = new FileReader();
		reader.onload = function () {
			if (window.wroTeamListFileLoaded) {
				window.wroTeamListFileLoaded(String(reader.result || ''), file.name || '');
			}
			input.remove();
		};
		reader.onerror = function () {
			if (window.wroTeamListFileLoaded) {
				window.wroTeamListFileLoaded('', file.name || '', 'read_error');
			}
			input.remove();
		};
		reader.readAsText(file);
	};

	document.body.appendChild(input);
	input.click();
}());
"""
	JavaScriptBridge.eval(command, true)

func _load_team_list_file(path: String) -> void:
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		team_editor_status_label.text = "ファイルを読み込めませんでした。"
		return

	_apply_loaded_team_list_text(file.get_as_text(), path.get_file())

func _on_web_team_list_file_loaded(args: Array) -> void:
	if args.size() >= 3 and str(args[2]) == "read_error":
		team_editor_status_label.text = "ファイルを読み込めませんでした。"
		return
	if args.is_empty():
		team_editor_status_label.text = "ファイルを読み込めませんでした。"
		return

	var file_name: String = str(args[1]) if args.size() >= 2 else "選択ファイル"
	_apply_loaded_team_list_text(str(args[0]), file_name)

func _apply_loaded_team_list_text(text: String, source_name: String) -> void:
	var parsed: Array[String] = _team_list_from_text(text)
	if parsed.size() < 2:
		team_editor_status_label.text = "2チーム以上のCSV/TXTを選んでください。"
		return

	team_editor_text.text = "\n".join(parsed)
	team_editor_status_label.text = "%s から%dチームを読み込みました。確認して「保存して反映」を押してください。" % [source_name, parsed.size()]

func _save_team_editor() -> void:
	if not active_series.is_empty():
		team_editor_status_label.text = "対戦中はチームリストを変更できません。"
		return

	var parsed: Array[String] = _team_list_from_editor_text(team_editor_text.text)
	if parsed.size() < 2:
		team_editor_status_label.text = "2チーム以上入力してください。"
		return

	team_list = parsed
	if not _save_team_list_to_user():
		team_editor_status_label.text = "チームリストを保存できませんでした。"
		return

	_apply_team_list_change()
	team_editor_status_label.text = "%dチームを保存しました。" % team_list.size()

func _reset_team_editor_to_default() -> void:
	if not active_series.is_empty():
		team_editor_status_label.text = "対戦中はチームリストを変更できません。"
		return

	var default_team_list: Array[String] = _load_team_list_from_path(TEAM_LIST_PATH)
	if default_team_list.size() < 2:
		team_editor_status_label.text = "初期リストを読み込めませんでした。"
		return

	team_list = default_team_list
	if not _save_team_list_to_user():
		team_editor_status_label.text = "チームリストを保存できませんでした。"
		return

	_apply_team_list_change()
	team_editor_status_label.text = "初期リストに戻しました。"

func _team_list_from_text(text: String) -> Array[String]:
	var parsed: Array[String] = []
	var seen: Dictionary = {}
	var line_index: int = 0
	var lines: PackedStringArray = text.split("\n", false)
	for line in lines:
		var team_name: String = line.strip_edges()
		if team_name.is_empty():
			continue

		if line_index == 0 and _looks_like_team_list_header(team_name):
			line_index += 1
			continue

		var csv_columns: PackedStringArray = _parse_csv_line(team_name)
		if csv_columns.size() >= 2:
			team_name = csv_columns[1].strip_edges()
		if team_name.is_empty() or seen.has(team_name):
			line_index += 1
			continue
		seen[team_name] = true
		parsed.append(team_name)
		line_index += 1
	return parsed

func _team_list_from_editor_text(text: String) -> Array[String]:
	return _team_list_from_text(text)

func _looks_like_team_list_header(line: String) -> bool:
	var normalized: String = line.to_lower()
	return normalized.contains("team") or normalized.contains("チーム")

func _apply_team_list_change() -> void:
	_populate_team_selects()
	_populate_team_stats_select()
	_refresh_target_team_visibility()
	_refresh_history()
	_refresh_team_editor_text()

func _populate_team_selects() -> void:
	# チーム選択欄をチーム一覧から作り直します。
	team_a_select.clear()
	team_b_select.clear()
	for team_name in team_list:
		team_a_select.add_item(team_name)
		team_b_select.add_item(team_name)
	if team_a_select.item_count > 0:
		team_a_select.select(0)
	if team_b_select.item_count > 1:
		team_b_select.select(1)
	elif team_b_select.item_count > 0:
		team_b_select.select(0)

func _populate_team_stats_select() -> void:
	team_stats_select.clear()
	team_stats_select.add_item("チームを選択")
	for team_name in team_list:
		team_stats_select.add_item(team_name)
	team_stats_select.select(0)
	_populate_history_team_select()

func _populate_history_team_select() -> void:
	if history_team_select == null:
		return
	var previous_team: String = _selected_history_team()
	history_team_select.clear()
	history_team_select.add_item("全チーム")
	for team_name in team_list:
		history_team_select.add_item(team_name)
	var selected_index: int = 0
	for index in range(history_team_select.item_count):
		if history_team_select.get_item_text(index) == previous_team:
			selected_index = index
			break
	history_team_select.select(selected_index)

func _setup_team_stats_period_select() -> void:
	team_stats_period_select.clear()
	team_stats_period_select.add_item("本日")
	team_stats_period_select.add_item("今週")
	team_stats_period_select.add_item("今月")
	team_stats_period_select.select(TEAM_STATS_PERIOD_WEEK)

func _start_series() -> void:
	if team_a_select.selected < 0 or team_b_select.selected < 0:
		tournament_status_label.text = "対戦するチームを選んでください。"
		return

	var team_a_name: String = team_a_select.get_item_text(team_a_select.selected)
	var team_b_name: String = team_b_select.get_item_text(team_b_select.selected)
	if team_a_name == team_b_name:
		tournament_status_label.text = "同じチーム同士では開始できません。"
		return

	active_series = {
		"series_id": "%s__%s__%s" % [team_a_name, team_b_name, _timestamp_string().replace(" ", "_").replace(":", "-")],
		"series_number": _next_series_number(),
		"court": _selected_court_name(),
		"team_a": team_a_name,
		"team_b": team_b_name,
		"records": []
	}
	editing_match_number = 0
	team_a_agreed = false
	team_b_agreed = false
	series_finalized = false
	final_agreement_panel.visible = false
	_reset_match_inputs()
	_refresh_series_ui()
	_show_flow_tools("第%dマッチ進行中" % _next_match_number())
	series_started.emit(_next_match_number())
	tournament_status_label.text = "%s 第%d試合を開始しました。第1マッチを入力してください。" % [active_series.get("court", "Aコート"), int(active_series.get("series_number", 1))]
	_sync_series_control_locks()

func _selected_court_name() -> String:
	if court_select == null or court_select.item_count == 0 or court_select.selected < 0:
		return "Aコート"
	return court_select.get_item_text(court_select.selected)

func _next_series_number() -> int:
	var selected_court: String = _selected_court_name()
	var series_ids: Dictionary = {}
	for record in store.get_filtered_records("all"):
		if not (record is Dictionary):
			continue
		if str(record.get("court", "Aコート")) != selected_court:
			continue
		var series_id: String = str(record.get("series_id", ""))
		if series_id.is_empty():
			continue
		series_ids[series_id] = true
	return series_ids.size() + 1

func _request_reset_series_state() -> void:
	if active_series.is_empty():
		_reset_series_state()
		return
	_request_confirm_action(
		"対戦カードをリセット",
		"現在の対戦カードをリセットしますか？\n入力中のマッチ内容と進行状態は破棄されます。",
		"reset_series"
	)

func _reset_series_state(status_message: String = "", save_status_message: String = "") -> void:
	active_series.clear()
	editing_match_number = 0
	team_a_agreed = false
	team_b_agreed = false
	series_finalized = false
	pending_agreement_team = ""
	final_agreement_panel.visible = false
	_hide_flow_tools()
	_reset_match_inputs()
	current_series_label.text = "対戦カード: 未選択"
	match_progress_label.text = "進行状況: 対戦を開始してください"
	match_title_label.text = "第1マッチ リザルト入力"
	match_teams_label.text = "対戦カード未選択"
	team_a_name_label.text = "チームA"
	team_b_name_label.text = "チームB"
	tournament_status_label.text = status_message if not status_message.is_empty() else "チーム一覧を読み込んでいます。"
	tournament_save_status_label.text = save_status_message if not save_status_message.is_empty() else "まずは対戦カードを開始してください。"
	_clear_target_team_options()
	_refresh_target_team_visibility()
	_update_winner_preview()
	_build_intermediate_placeholder()
	_build_final_placeholder()
	_sync_series_control_locks()

func _sync_series_control_locks() -> void:
	var locked: bool = not active_series.is_empty()
	team_a_select.disabled = locked
	team_b_select.disabled = locked
	if court_select != null:
		court_select.disabled = locked
	start_series_button.disabled = locked
	if team_editor_toggle_button != null:
		team_editor_toggle_button.disabled = locked

func _clear_target_team_options() -> void:
	target_team_option.clear()
	target_team_option.add_item(TARGET_TEAM_UNSELECTED)
	target_team_option.select(0)

func _reset_match_inputs() -> void:
	# 入力欄を初期状態に戻します。紫は合計2個になるように初期化します。
	is_syncing_ball_options = true
	_select_option_value(team_a_orange, 0)
	_select_option_value(team_b_orange, 0)
	_select_option_value(team_a_purple, 0)
	_select_option_value(team_b_purple, PURPLE_TOTAL)
	is_syncing_ball_options = false
	reason_category_option.select(0)
	_refresh_end_reason_options()
	_refresh_target_team_visibility()
	_update_score_labels()

func _refresh_series_ui() -> void:
	if active_series.is_empty():
		return

	var team_a_name: String = active_series.get("team_a", "")
	var team_b_name: String = active_series.get("team_b", "")
	var next_match_number: int = _current_input_match_number()

	current_series_label.text = "対戦カード: %s vs %s / %s 第%d試合" % [
		team_a_name,
		team_b_name,
		active_series.get("court", "Aコート"),
		int(active_series.get("series_number", 1))
	]
	match_progress_label.text = "進行状況: 第%dマッチ / 全%dマッチ" % [mini(next_match_number, SERIES_MATCH_COUNT), SERIES_MATCH_COUNT]
	match_title_label.text = "第%dマッチ リザルト入力" % mini(next_match_number, SERIES_MATCH_COUNT)
	match_teams_label.text = "%s vs %s" % [team_a_name, team_b_name]
	team_a_name_label.text = team_a_name
	team_b_name_label.text = team_b_name

	_refresh_target_team_visibility()
	_update_winner_preview()

	_build_intermediate_board()
	_build_final_board()

func _request_save_current_match() -> void:
	if active_series.is_empty():
		tournament_save_status_label.text = "対戦カードを開始してから保存してください。"
		return
	if _series_is_finished() and editing_match_number == 0:
		tournament_save_status_label.text = "全3マッチ入力済みです。修正したいマッチの再入力ボタンを押してください。"
		return
	if not _validate_match_result_selection():
		return

	var record: Dictionary = _build_series_record()
	save_confirm_dialog.dialog_text = _build_save_confirmation_text(record)
	save_confirm_dialog.popup_centered(Vector2i(720, 420))

func _save_current_match() -> void:
	if active_series.is_empty():
		tournament_save_status_label.text = "対戦カードを開始してから保存してください。"
		return
	if _series_is_finished() and editing_match_number == 0:
		tournament_save_status_label.text = "全3マッチ入力済みです。修正したいマッチの再入力ボタンを押してください。"
		return

	if not _validate_match_result_selection():
		return

	var record: Dictionary = _build_series_record()
	var is_editing_existing: bool = editing_match_number > 0
	var save_ok: bool = store.replace_series_record(str(active_series.get("series_id", "")), editing_match_number, record) if is_editing_existing else store.add_record(record)
	if not save_ok:
		tournament_save_status_label.text = "試合結果を保存できませんでした。"
		return

	var records: Array = active_series.get("records", [])
	if is_editing_existing:
		_replace_active_series_record(editing_match_number, record)
		editing_match_number = 0
		_reset_final_agreement()
	else:
		records.append(record)
		active_series["records"] = records

	_refresh_history()
	_refresh_series_ui()
	_reset_match_inputs()
	var should_finish_series: bool = _series_is_finished()

	if should_finish_series:
		tournament_save_status_label.text = "第%dマッチを保存しました。代表同意後に結果を確定します。" % int(record.get("match_number", 0))
		tournament_status_label.text = "最終結果を確認してください。"
		_hide_flow_tools()
		_show_final_agreement_panel()
	else:
		tournament_save_status_label.text = "第%dマッチを保存しました。次のマッチを入力できます。" % int(record.get("match_number", 0))
		tournament_status_label.text = "中間結果を更新しました。"
		_show_flow_tools("第%dマッチ進行中" % _next_match_number())

	if not should_finish_series:
		match_saved_for_next_match.emit(_next_match_number())

func _build_save_confirmation_text(record: Dictionary) -> String:
	return "この内容で保存しますか？\n\n%s 第%d試合 第%dマッチ\n%s vs %s\n終了理由: %s\n勝者: %s\n%s: オレンジ%d / 紫%d / 得点%d\n%s: オレンジ%d / 紫%d / 得点%d" % [
		String(record.get("court", "Aコート")),
		int(record.get("series_number", 1)),
		int(record.get("match_number", 0)),
		String(record.get("team_a", "")),
		String(record.get("team_b", "")),
		String(record.get("end_reason", "")),
		String(record.get("winner", "")),
		String(record.get("team_a", "")),
		int(record.get("team_a_orange", 0)),
		int(record.get("team_a_purple", 0)),
		int(record.get("team_a_score", 0)),
		String(record.get("team_b", "")),
		int(record.get("team_b_orange", 0)),
		int(record.get("team_b_purple", 0)),
		int(record.get("team_b_score", 0))
	]

func focus_result_entry_after_match() -> void:
	if active_series.is_empty() or _series_is_finished():
		return
	_show_flow_tools("試合終了 / 第%dマッチ結果入力待ち" % _next_match_number())
	tournament_save_status_label.text = "試合結果を入力して、保存前確認を行ってください。"
	await get_tree().process_frame
	_scroll_to_control(result_input_panel)

func _request_back_to_balls() -> void:
	if active_series.is_empty() or _series_is_finished():
		return
	requested_ball_preparation.emit(_next_match_number())

func _request_back_to_timer() -> void:
	if active_series.is_empty() or _series_is_finished():
		return
	requested_timer_return.emit(_next_match_number())

func _restart_current_match() -> void:
	if active_series.is_empty() or _series_is_finished():
		return
	_request_confirm_action(
		"このマッチをやり直す",
		"現在入力中のマッチ内容を破棄して、ボール配置からやり直しますか？",
		"restart_match"
	)

func _restart_current_match_now() -> void:
	if active_series.is_empty() or _series_is_finished():
		return
	_reset_match_inputs()
	_show_flow_tools("第%dマッチをやり直し中" % _next_match_number())
	tournament_save_status_label.text = "このマッチをやり直します。ボール配置から再開します。"
	requested_match_restart.emit(_next_match_number())

func _reinput_current_match_result() -> void:
	if active_series.is_empty() or _series_is_finished():
		return
	_request_confirm_action(
		"結果を再入力",
		"現在入力中のスコアと終了理由をクリアして、結果入力欄に戻りますか？",
		"reinput_result"
	)

func _reinput_current_match_result_now() -> void:
	if active_series.is_empty() or _series_is_finished():
		return
	_reset_match_inputs()
	_show_flow_tools("第%dマッチ結果を再入力中" % _next_match_number())
	tournament_save_status_label.text = "試合結果とボール数を再入力できます。"
	_scroll_to_control(result_input_panel)

func _load_match_for_edit(match_number: int) -> void:
	_request_confirm_action(
		"保存済みマッチを再入力",
		"第%dマッチの保存済み結果を入力欄に読み込みます。\n現在入力中の内容は置き換わります。" % match_number,
		"edit_match",
		match_number
	)

func _load_match_for_edit_now(match_number: int) -> void:
	var records: Array = active_series.get("records", [])
	for record in records:
		if int(record.get("match_number", 0)) != match_number:
			continue
		editing_match_number = match_number
		_refresh_series_ui()
		_select_option_text(reason_category_option, str(record.get("reason_category", REASON_CATEGORY_SCORING)))
		_refresh_end_reason_options()
		_select_option_text(end_reason_option, str(record.get("end_reason", "")))
		_refresh_target_team_visibility()
		if _is_auto_defeat_reason(str(record.get("reason_category", "")), str(record.get("end_reason", ""))):
			_select_option_text(target_team_option, str(record.get("target_team", TARGET_TEAM_UNSELECTED)))
		_select_option_value(team_a_orange, int(record.get("team_a_orange", 0)))
		_select_option_value(team_a_purple, int(record.get("team_a_purple", 0)))
		_select_option_value(team_b_orange, int(record.get("team_b_orange", 0)))
		_select_option_value(team_b_purple, int(record.get("team_b_purple", 0)))
		_update_score_labels()
		_update_winner_preview()
		_show_flow_tools("第%dマッチを修正中" % match_number)
		tournament_save_status_label.text = "保存すると第%dマッチの結果を上書きします。" % match_number
		_scroll_to_control(result_input_panel)
		return

func _select_option_text(option: OptionButton, value: String) -> void:
	for index in range(option.item_count):
		if option.get_item_text(index) == value:
			option.select(index)
			return
	if option.item_count > 0:
		option.select(0)

func _show_flow_tools(status_text: String) -> void:
	flow_tools_panel.visible = true
	flow_tools_status_label.text = status_text

func _hide_flow_tools() -> void:
	flow_tools_panel.visible = false

func _replace_active_series_record(match_number: int, updated_record: Dictionary) -> void:
	var records: Array = active_series.get("records", [])
	for index in range(records.size()):
		var record: Dictionary = records[index] as Dictionary
		if int(record.get("match_number", 0)) == match_number:
			records[index] = updated_record
			active_series["records"] = records
			return
	records.append(updated_record)
	active_series["records"] = records

func _reset_final_agreement() -> void:
	team_a_agreed = false
	team_b_agreed = false
	series_finalized = false
	_update_final_agreement_panel()

func _show_final_agreement_panel() -> void:
	final_agreement_panel.visible = true
	_update_final_agreement_panel()
	_scroll_to_control(final_agreement_panel)

func _update_final_agreement_panel() -> void:
	if final_agreement_panel == null:
		return
	var team_a_name: String = str(active_series.get("team_a", "チームA"))
	var team_b_name: String = str(active_series.get("team_b", "チームB"))
	team_a_agree_button.text = "%s代表 同意%s" % [team_a_name, "済" if team_a_agreed else ""]
	team_b_agree_button.text = "%s代表 同意%s" % [team_b_name, "済" if team_b_agreed else ""]
	team_a_agree_button.disabled = series_finalized
	team_b_agree_button.disabled = series_finalized
	finalize_series_button.disabled = series_finalized or not (team_a_agreed and team_b_agreed)
	final_agreement_label.text = "各チーム代表が結果を確認して同意してください。結果を修正した場合、同意はリセットされます。"

func _on_team_a_agreed() -> void:
	_request_team_agreement("team_a")

func _on_team_b_agreed() -> void:
	_request_team_agreement("team_b")

func _request_team_agreement(team_key: String) -> void:
	if not _series_is_finished():
		tournament_save_status_label.text = "第3マッチまで保存してから同意してください。"
		return
	pending_agreement_team = team_key
	var team_name: String = str(active_series.get("team_a", "チームA")) if team_key == "team_a" else str(active_series.get("team_b", "チームB"))
	agreement_confirm_dialog.title = "%s代表 同意確認" % team_name
	agreement_confirm_dialog.dialog_text = _build_agreement_confirmation_text(team_name)
	agreement_confirm_dialog.popup_centered(Vector2i(820, 620))

func _confirm_pending_team_agreement() -> void:
	match pending_agreement_team:
		"team_a":
			team_a_agreed = true
		"team_b":
			team_b_agreed = true
	pending_agreement_team = ""
	_update_final_agreement_panel()

func _build_agreement_confirmation_text(team_name: String) -> String:
	var lines: PackedStringArray = []
	lines.append("%s代表として、以下の1〜3マッチ結果を確認してください。" % team_name)
	lines.append("")
	lines.append("%s 第%d試合 / %s vs %s" % [
		active_series.get("court", "Aコート"),
		int(active_series.get("series_number", 1)),
		active_series.get("team_a", "チームA"),
		active_series.get("team_b", "チームB")
	])
	lines.append("")
	var records: Array = active_series.get("records", [])
	for record in records:
		lines.append("第%dマッチ: 勝者 %s / A 得点%d (橙%d 紫%d) / B 得点%d (橙%d 紫%d) / %s" % [
			int(record.get("match_number", 0)),
			str(record.get("winner", "")),
			int(record.get("team_a_score", 0)),
			int(record.get("team_a_orange", 0)),
			int(record.get("team_a_purple", 0)),
			int(record.get("team_b_score", 0)),
			int(record.get("team_b_orange", 0)),
			int(record.get("team_b_purple", 0)),
			str(record.get("end_reason", ""))
		])
	lines.append("")
	lines.append(_final_summary_text(_series_summary()))
	lines.append("")
	lines.append("内容が正しければ「同意する」を押してください。")
	return "\n".join(lines)

func _finalize_series_result() -> void:
	if not (team_a_agreed and team_b_agreed):
		tournament_save_status_label.text = "両チーム代表の同意が必要です。"
		return
	series_finalized = true
	finalize_series_button.disabled = true
	var result_record: Dictionary = _build_series_result_record()
	if not store.add_record(result_record):
		series_finalized = false
		_update_final_agreement_panel()
		tournament_save_status_label.text = "試合結果を保存できませんでした。"
		return
	_refresh_history()
	var finished_message: String = "試合が終了しました。お疲れさまでした。"
	series_completed.emit()
	_reset_series_state(finished_message, "両チーム代表の同意を確認し、試合結果を確定しました。")

func _build_series_result_record() -> Dictionary:
	var summary: Dictionary = _series_summary()
	var team_a_name: String = str(active_series.get("team_a", ""))
	var team_b_name: String = str(active_series.get("team_b", ""))
	var team_a_wins: int = int(summary.get("team_a_wins", 0))
	var team_b_wins: int = int(summary.get("team_b_wins", 0))
	var draws: int = int(summary.get("draws", 0))
	var winner_key: String = _overall_winner_key(summary)
	var overall_winner: String = TARGET_TEAM_DRAW
	if winner_key == "team_a":
		overall_winner = team_a_name
	elif winner_key == "team_b":
		overall_winner = team_b_name

	return {
		"timestamp": _timestamp_string(),
		"record_kind": RECORD_KIND_SERIES_RESULT,
		"team_a": team_a_name,
		"team_b": team_b_name,
		"series_id": active_series.get("series_id", ""),
		"series_number": int(active_series.get("series_number", 1)),
		"court": active_series.get("court", "Aコート"),
		"competition_id": "%s_%02d_RESULT" % [_court_code_from_name(str(active_series.get("court", "Aコート"))), int(active_series.get("series_number", 1))],
		"match_number": 0,
		"match_type": MATCH_TYPE_PRACTICE,
		"team_a_wins": team_a_wins,
		"team_a_losses": team_b_wins,
		"team_b_wins": team_b_wins,
		"team_b_losses": team_a_wins,
		"draws": draws,
		"overall_winner": overall_winner,
		"winner": "",
		"result": "%s %d勝%d敗 / %s %d勝%d敗 / 引き分け%d" % [team_a_name, team_a_wins, team_b_wins, team_b_name, team_b_wins, team_a_wins, draws],
		"team_a_orange": int(summary.get("team_a_orange", 0)),
		"team_a_purple": int(summary.get("team_a_purple", 0)),
		"team_a_score": int(summary.get("team_a_score", 0)),
		"team_a_violations": int(summary.get("team_a_violations", 0)),
		"team_b_orange": int(summary.get("team_b_orange", 0)),
		"team_b_purple": int(summary.get("team_b_purple", 0)),
		"team_b_score": int(summary.get("team_b_score", 0)),
		"team_b_violations": int(summary.get("team_b_violations", 0)),
		"reason_category": "",
		"end_reason": "3マッチ終了・代表同意済み",
		"target_team": overall_winner,
		"notes": _final_summary_text(summary)
	}

func _scroll_to_control(target: Control) -> void:
	var target_y: int = int(target.global_position.y - scroll.global_position.y + scroll.scroll_vertical) - 18
	scroll.scroll_vertical = maxi(0, target_y)

func _build_series_record() -> Dictionary:
	var team_a_name: String = active_series.get("team_a", "")
	var team_b_name: String = active_series.get("team_b", "")
	var team_a_orange_count: int = _selected_option_value(team_a_orange)
	var team_a_purple_count: int = _selected_option_value(team_a_purple)
	var team_b_orange_count: int = _selected_option_value(team_b_orange)
	var team_b_purple_count: int = _selected_option_value(team_b_purple)
	var reason_category: String = _selected_reason_category()
	var end_reason: String = end_reason_option.get_item_text(end_reason_option.selected)
	var selected_target_team: String = _selected_target_team_text()
	var score_bundle: Dictionary = _resolved_match_scores(
		team_a_name,
		team_b_name,
		selected_target_team,
		reason_category,
		end_reason,
		team_a_orange_count,
		team_a_purple_count,
		team_b_orange_count,
		team_b_purple_count
	)
	var team_a_score: int = int(score_bundle.get("team_a_score", 0))
	var team_b_score: int = int(score_bundle.get("team_b_score", 0))
	var result_text: String = _result_text_for_scores(team_a_score, team_b_score)
	var winner_name: String = _winner_name_for_result(result_text)
	var target_team: String = selected_target_team if _is_auto_defeat_reason(reason_category, end_reason) else winner_name

	return {
		"timestamp": _timestamp_string(),
		"record_kind": RECORD_KIND_MATCH,
		"team_a": team_a_name,
		"team_b": team_b_name,
		"series_id": active_series.get("series_id", ""),
		"series_number": int(active_series.get("series_number", 1)),
		"court": active_series.get("court", "Aコート"),
		"competition_id": "%s_%02d_%d" % [
			_court_code_from_name(str(active_series.get("court", "Aコート"))),
			int(active_series.get("series_number", 1)),
			_current_input_match_number()
		],
		"match_number": _current_input_match_number(),
		"match_type": MATCH_TYPE_PRACTICE,
		"result": result_text,
		"winner": winner_name,
		"target_team": target_team,
		"reason_category": reason_category,
		"end_reason": end_reason,
		"team_a_orange": team_a_orange_count,
		"team_a_purple": team_a_purple_count,
		"team_b_orange": team_b_orange_count,
		"team_b_purple": team_b_purple_count,
		"team_a_score": team_a_score,
		"team_b_score": team_b_score,
		"notes": "シリーズ進行記録"
	}

func _result_text_for_scores(team_a_score: int, team_b_score: int) -> String:
	if team_a_score < team_b_score:
		return RESULT_WIN
	if team_b_score < team_a_score:
		return RESULT_LOSE
	return RESULT_DRAW

func _winner_name_for_result(result_text: String) -> String:
	match result_text:
		RESULT_WIN:
			return active_series.get("team_a", "")
		RESULT_LOSE:
			return active_series.get("team_b", "")
		_:
			return TARGET_TEAM_DRAW

func _calculate_score(orange_count: int, purple_count: int) -> int:
	return orange_count - purple_count * 2

func _resolved_match_scores(team_a_name: String, team_b_name: String, target_team: String, reason_category: String, end_reason: String, team_a_orange_count: int, team_a_purple_count: int, team_b_orange_count: int, team_b_purple_count: int) -> Dictionary:
	if _is_auto_defeat_reason(reason_category, end_reason):
		if target_team == team_a_name:
			return {
				"team_a_score": AUTO_LOSER_SCORE,
				"team_b_score": AUTO_WINNER_SCORE
			}
		if target_team == team_b_name:
			return {
				"team_a_score": AUTO_WINNER_SCORE,
				"team_b_score": AUTO_LOSER_SCORE
			}

	return {
		"team_a_score": _calculate_score(team_a_orange_count, team_a_purple_count),
		"team_b_score": _calculate_score(team_b_orange_count, team_b_purple_count)
	}

func _validate_match_result_selection() -> bool:
	var reason_category: String = _selected_reason_category()
	if _is_auto_defeat_reason(reason_category, ""):
		var selected_target: String = _selected_target_team_text()
		if selected_target == TARGET_TEAM_UNSELECTED or selected_target == TARGET_TEAM_DRAW:
			tournament_save_status_label.text = "違反したチームを選択してください。"
			return false
	return true


func _is_auto_defeat_reason(reason_category: String, _end_reason: String) -> bool:
	return reason_category == REASON_CATEGORY_PREMATCH or reason_category == REASON_CATEGORY_INMATCH

func _setup_ball_count_options() -> void:
	# ボール数の選択肢はここで一括調整します。
	# オレンジは中央球が残る場合があるため、A/Bを完全自動合計にはしません。
	_fill_option_range(team_a_orange, ORANGE_MAX)
	_fill_option_range(team_b_orange, ORANGE_MAX)
	_fill_option_range(team_a_purple, PURPLE_TOTAL)
	_fill_option_range(team_b_purple, PURPLE_TOTAL)
	_reset_match_inputs()

func _fill_option_range(option: OptionButton, max_value: int) -> void:
	option.clear()
	for value in range(max_value + 1):
		option.add_item(str(value))

func _selected_option_value(option: OptionButton) -> int:
	if option.selected < 0:
		return 0
	return int(option.get_item_text(option.selected))

func _select_option_value(option: OptionButton, value: int) -> void:
	for index in range(option.item_count):
		if int(option.get_item_text(index)) == value:
			option.select(index)
			return
	if option.item_count > 0:
		option.select(0)

func _sync_purple_from_a() -> void:
	# 紫ボールは合計2個なので、片側を選んだら反対側を自動補完します。
	var team_a_value: int = _selected_option_value(team_a_purple)
	_select_option_value(team_b_purple, PURPLE_TOTAL - team_a_value)

func _sync_purple_from_b() -> void:
	var team_b_value: int = _selected_option_value(team_b_purple)
	_select_option_value(team_a_purple, PURPLE_TOTAL - team_b_value)

func _on_team_a_orange_selected(_index: int) -> void:
	_update_score_labels()
	_update_winner_preview()

func _on_team_b_orange_selected(_index: int) -> void:
	_update_score_labels()
	_update_winner_preview()

func _on_team_a_purple_selected(_index: int) -> void:
	if is_syncing_ball_options:
		return
	is_syncing_ball_options = true
	_sync_purple_from_a()
	is_syncing_ball_options = false
	_update_score_labels()
	_update_winner_preview()

func _on_team_b_purple_selected(_index: int) -> void:
	if is_syncing_ball_options:
		return
	is_syncing_ball_options = true
	_sync_purple_from_b()
	is_syncing_ball_options = false
	_update_score_labels()
	_update_winner_preview()

func _on_target_team_selected(_index: int) -> void:
	_update_winner_preview()

func _on_reason_category_selected(_index: int) -> void:
	_refresh_end_reason_options()
	_refresh_target_team_visibility()
	_update_winner_preview()

func _update_score_labels() -> void:
	# 得点は低い方が有利です。表示用の計算式は _calculate_score に集約しています。
	team_a_score_label.text = "得点: %d" % _calculate_score(_selected_option_value(team_a_orange), _selected_option_value(team_a_purple))
	team_b_score_label.text = "得点: %d" % _calculate_score(_selected_option_value(team_b_orange), _selected_option_value(team_b_purple))

func _update_winner_preview() -> void:
	var selected_text: String = "未選択"
	if target_team_option.item_count > 0 and target_team_option.selected >= 0:
		selected_text = target_team_option.get_item_text(target_team_option.selected)

	var team_a_name: String = active_series.get("team_a", "チームA")
	var team_b_name: String = active_series.get("team_b", "チームB")
	var has_series: bool = not active_series.is_empty()

	if has_series and not _is_violation_category():
		var team_a_score_now: int = _calculate_score(_selected_option_value(team_a_orange), _selected_option_value(team_a_purple))
		var team_b_score_now: int = _calculate_score(_selected_option_value(team_b_orange), _selected_option_value(team_b_purple))
		var result_now: String = _result_text_for_scores(team_a_score_now, team_b_score_now)
		var winner_now: String = _winner_name_for_result(result_now)
		winner_preview_label.text = "勝利チーム: %s" % winner_now
		winner_preview_label.add_theme_color_override("font_color", COLOR_WINNER if winner_now != TARGET_TEAM_DRAW else COLOR_NORMAL)
		team_a_name_label.add_theme_color_override("font_color", COLOR_WINNER if winner_now == team_a_name else COLOR_NORMAL)
		team_b_name_label.add_theme_color_override("font_color", COLOR_WINNER if winner_now == team_b_name else COLOR_NORMAL)
		team_a_score_label.add_theme_color_override("font_color", COLOR_WINNER if winner_now == team_a_name else COLOR_NORMAL)
		team_b_score_label.add_theme_color_override("font_color", COLOR_WINNER if winner_now == team_b_name else COLOR_NORMAL)
		return

	if has_series and _is_violation_category() and selected_text != TARGET_TEAM_UNSELECTED:
		var violation_winner: String = team_b_name if selected_text == team_a_name else team_a_name
		winner_preview_label.text = "違反: %s / 勝利チーム: %s" % [selected_text, violation_winner]
		winner_preview_label.add_theme_color_override("font_color", COLOR_WINNER)
		team_a_name_label.add_theme_color_override("font_color", COLOR_WINNER if violation_winner == team_a_name else COLOR_NORMAL)
		team_b_name_label.add_theme_color_override("font_color", COLOR_WINNER if violation_winner == team_b_name else COLOR_NORMAL)
		team_a_score_label.add_theme_color_override("font_color", COLOR_WINNER if violation_winner == team_a_name else COLOR_NORMAL)
		team_b_score_label.add_theme_color_override("font_color", COLOR_WINNER if violation_winner == team_b_name else COLOR_NORMAL)
		return

	winner_preview_label.text = "勝利チーム: 未選択"
	winner_preview_label.add_theme_color_override("font_color", COLOR_SUBTLE)
	team_a_name_label.add_theme_color_override("font_color", COLOR_NORMAL)
	team_b_name_label.add_theme_color_override("font_color", COLOR_NORMAL)
	team_a_score_label.add_theme_color_override("font_color", COLOR_NORMAL)
	team_b_score_label.add_theme_color_override("font_color", COLOR_NORMAL)

func _build_intermediate_header() -> void:
	_clear_children(intermediate_header)
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override("separation", 0)
	row.add_child(_table_header_cell("マッチ", INTERMEDIATE_COLUMN_WIDTHS[0]))
	row.add_child(_table_header_cell("理由", INTERMEDIATE_COLUMN_WIDTHS[1]))
	row.add_child(_table_header_cell("A橙", INTERMEDIATE_COLUMN_WIDTHS[2]))
	row.add_child(_table_header_cell("A紫", INTERMEDIATE_COLUMN_WIDTHS[3]))
	row.add_child(_table_header_cell("A得点", INTERMEDIATE_COLUMN_WIDTHS[4]))
	row.add_child(_table_header_cell("A違反", INTERMEDIATE_COLUMN_WIDTHS[5]))
	row.add_child(_table_header_cell("B橙", INTERMEDIATE_COLUMN_WIDTHS[6]))
	row.add_child(_table_header_cell("B紫", INTERMEDIATE_COLUMN_WIDTHS[7]))
	row.add_child(_table_header_cell("B得点", INTERMEDIATE_COLUMN_WIDTHS[8]))
	row.add_child(_table_header_cell("B違反", INTERMEDIATE_COLUMN_WIDTHS[9]))
	row.add_child(_table_header_cell("勝者", INTERMEDIATE_COLUMN_WIDTHS[10]))
	intermediate_header.add_child(row)

func _build_final_header() -> void:
	_clear_children(final_header)
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override("separation", 0)
	row.add_child(_table_header_cell("チーム", FINAL_COLUMN_WIDTHS[0]))
	row.add_child(_table_header_cell("勝利数", FINAL_COLUMN_WIDTHS[1]))
	row.add_child(_table_header_cell("総オレンジ", FINAL_COLUMN_WIDTHS[2]))
	row.add_child(_table_header_cell("総紫", FINAL_COLUMN_WIDTHS[3]))
	row.add_child(_table_header_cell("違反数", FINAL_COLUMN_WIDTHS[4]))
	row.add_child(_table_header_cell("総スコア", FINAL_COLUMN_WIDTHS[5]))
	row.add_child(_table_header_cell("状態", FINAL_COLUMN_WIDTHS[6]))
	final_header.add_child(row)

func _build_intermediate_placeholder() -> void:
	_clear_children(intermediate_list)
	intermediate_summary_label.text = "第1マッチの保存後に中間結果が表示されます。"
	intermediate_list.add_child(_empty_label("まだ保存されたマッチはありません。"))

func _build_final_placeholder() -> void:
	_clear_children(final_list)
	final_summary_label.text = "3マッチ終了後、最終結果を確認できます。"
	final_list.add_child(_empty_label("最終結果はまだありません。"))

func _build_intermediate_board() -> void:
	_clear_children(intermediate_list)
	var records: Array = active_series.get("records", [])
	if records.is_empty():
		_build_intermediate_placeholder()
		return

	intermediate_summary_label.text = "現在の中間結果です。各マッチは再入力できます。"
	var team_a_name: String = active_series.get("team_a", "チームA")
	var team_b_name: String = active_series.get("team_b", "チームB")
	for record in records:
		var row: HBoxContainer = HBoxContainer.new()
		row.add_theme_constant_override("separation", 0)
		var winner_name: String = str(record.get("winner", "-"))
		var reason_text: String = "%s / %s" % [str(record.get("reason_category", "")), str(record.get("end_reason", "-"))]
		var a_color: Color = COLOR_TABLE_NEUTRAL
		var b_color: Color = COLOR_TABLE_NEUTRAL
		if winner_name == team_a_name:
			a_color = COLOR_TABLE_WIN
			b_color = COLOR_TABLE_LOSE
		elif winner_name == team_b_name:
			a_color = COLOR_TABLE_LOSE
			b_color = COLOR_TABLE_WIN

		var team_a_violation_count: int = _violation_count_for_record(record, team_a_name)
		var team_b_violation_count: int = _violation_count_for_record(record, team_b_name)
		row.add_child(_table_value_cell("第%dマッチ" % int(record.get("match_number", 0)), INTERMEDIATE_COLUMN_WIDTHS[0]))
		row.add_child(_table_value_cell(reason_text, INTERMEDIATE_COLUMN_WIDTHS[1], HORIZONTAL_ALIGNMENT_LEFT, true))
		row.add_child(_table_value_cell(str(record.get("team_a_orange", 0)), INTERMEDIATE_COLUMN_WIDTHS[2], HORIZONTAL_ALIGNMENT_CENTER, false, a_color))
		row.add_child(_table_value_cell(str(record.get("team_a_purple", 0)), INTERMEDIATE_COLUMN_WIDTHS[3], HORIZONTAL_ALIGNMENT_CENTER, false, a_color))
		row.add_child(_table_value_cell(str(record.get("team_a_score", 0)), INTERMEDIATE_COLUMN_WIDTHS[4], HORIZONTAL_ALIGNMENT_CENTER, false, a_color))
		row.add_child(_table_value_cell(str(team_a_violation_count), INTERMEDIATE_COLUMN_WIDTHS[5], HORIZONTAL_ALIGNMENT_CENTER, false, a_color))
		row.add_child(_table_value_cell(str(record.get("team_b_orange", 0)), INTERMEDIATE_COLUMN_WIDTHS[6], HORIZONTAL_ALIGNMENT_CENTER, false, b_color))
		row.add_child(_table_value_cell(str(record.get("team_b_purple", 0)), INTERMEDIATE_COLUMN_WIDTHS[7], HORIZONTAL_ALIGNMENT_CENTER, false, b_color))
		row.add_child(_table_value_cell(str(record.get("team_b_score", 0)), INTERMEDIATE_COLUMN_WIDTHS[8], HORIZONTAL_ALIGNMENT_CENTER, false, b_color))
		row.add_child(_table_value_cell(str(team_b_violation_count), INTERMEDIATE_COLUMN_WIDTHS[9], HORIZONTAL_ALIGNMENT_CENTER, false, b_color))
		row.add_child(_table_value_cell(winner_name, INTERMEDIATE_COLUMN_WIDTHS[10], HORIZONTAL_ALIGNMENT_CENTER, false, COLOR_TABLE_WIN))
		intermediate_list.add_child(row)
		intermediate_list.add_child(_edit_match_button_row(int(record.get("match_number", 0))))

func _build_final_board() -> void:
	_clear_children(final_list)
	var records: Array = active_series.get("records", [])
	if records.is_empty():
		_build_final_placeholder()
		return

	var summary: Dictionary = _series_summary()
	final_list.add_child(_final_row(
		active_series.get("team_a", "チームA"),
		int(summary.get("team_a_wins", 0)),
		int(summary.get("team_a_orange", 0)),
		int(summary.get("team_a_purple", 0)),
		int(summary.get("team_a_violations", 0)),
		int(summary.get("team_a_score", 0)),
		_team_state_text(true, summary)
	))
	final_list.add_child(_final_row(
		active_series.get("team_b", "チームB"),
		int(summary.get("team_b_wins", 0)),
		int(summary.get("team_b_orange", 0)),
		int(summary.get("team_b_purple", 0)),
		int(summary.get("team_b_violations", 0)),
		int(summary.get("team_b_score", 0)),
		_team_state_text(false, summary)
	))
	final_summary_label.text = _final_summary_text(summary)

func _final_row(team_name: String, wins: int, orange_count: int, purple_count: int, violation_count: int, total_score: int, state_text: String) -> HBoxContainer:
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override("separation", 0)
	var row_color: Color = COLOR_TABLE_NEUTRAL
	if state_text == "勝ち":
		row_color = COLOR_TABLE_WIN
	elif state_text == "負け":
		row_color = COLOR_TABLE_LOSE
	row.add_child(_table_value_cell(team_name, FINAL_COLUMN_WIDTHS[0], HORIZONTAL_ALIGNMENT_LEFT, false, row_color))
	row.add_child(_table_value_cell(str(wins), FINAL_COLUMN_WIDTHS[1], HORIZONTAL_ALIGNMENT_CENTER, false, row_color))
	row.add_child(_table_value_cell(str(orange_count), FINAL_COLUMN_WIDTHS[2], HORIZONTAL_ALIGNMENT_CENTER, false, row_color))
	row.add_child(_table_value_cell(str(purple_count), FINAL_COLUMN_WIDTHS[3], HORIZONTAL_ALIGNMENT_CENTER, false, row_color))
	row.add_child(_table_value_cell(str(violation_count), FINAL_COLUMN_WIDTHS[4], HORIZONTAL_ALIGNMENT_CENTER, false, row_color))
	row.add_child(_table_value_cell(str(total_score), FINAL_COLUMN_WIDTHS[5], HORIZONTAL_ALIGNMENT_CENTER, false, row_color))
	row.add_child(_table_value_cell(state_text, FINAL_COLUMN_WIDTHS[6], HORIZONTAL_ALIGNMENT_CENTER, false, row_color))
	return row

func _violation_count_for_record(record: Dictionary, team_name: String) -> int:
	var reason_category: String = str(record.get("reason_category", ""))
	if not _is_auto_defeat_reason(reason_category, str(record.get("end_reason", ""))):
		return 0
	return 1 if str(record.get("target_team", "")) == team_name else 0

func _edit_match_button_row(match_number: int) -> HBoxContainer:
	var row: HBoxContainer = HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_END
	var button: Button = Button.new()
	button.text = "第%dマッチを再入力" % match_number
	button.custom_minimum_size = Vector2(180, 38)
	button.pressed.connect(_load_match_for_edit.bind(match_number))
	row.add_child(button)
	return row

func _series_summary() -> Dictionary:
	# 3マッチ分の勝敗、ボール数、違反数を最終結果表用に集計します。
	var summary: Dictionary = {
		"team_a_wins": 0,
		"team_b_wins": 0,
		"draws": 0,
		"team_a_orange": 0,
		"team_a_purple": 0,
		"team_b_orange": 0,
		"team_b_purple": 0,
		"team_a_score": 0,
		"team_b_score": 0,
		"team_a_violations": 0,
		"team_b_violations": 0
	}
	var records: Array = active_series.get("records", [])
	var team_a_name: String = str(active_series.get("team_a", ""))
	var team_b_name: String = str(active_series.get("team_b", ""))
	for record in records:
		summary["team_a_orange"] = int(summary["team_a_orange"]) + int(record.get("team_a_orange", 0))
		summary["team_a_purple"] = int(summary["team_a_purple"]) + int(record.get("team_a_purple", 0))
		summary["team_b_orange"] = int(summary["team_b_orange"]) + int(record.get("team_b_orange", 0))
		summary["team_b_purple"] = int(summary["team_b_purple"]) + int(record.get("team_b_purple", 0))
		summary["team_a_score"] = int(summary["team_a_score"]) + int(record.get("team_a_score", 0))
		summary["team_b_score"] = int(summary["team_b_score"]) + int(record.get("team_b_score", 0))
		summary["team_a_violations"] = int(summary["team_a_violations"]) + _violation_count_for_record(record, team_a_name)
		summary["team_b_violations"] = int(summary["team_b_violations"]) + _violation_count_for_record(record, team_b_name)
		match str(record.get("result", RESULT_DRAW)):
			RESULT_WIN:
				summary["team_a_wins"] = int(summary["team_a_wins"]) + 1
			RESULT_LOSE:
				summary["team_b_wins"] = int(summary["team_b_wins"]) + 1
			_:
				summary["draws"] = int(summary["draws"]) + 1
	return summary

func _team_state_text(is_team_a: bool, summary: Dictionary) -> String:
	var winner_key: String = _overall_winner_key(summary)
	if winner_key == "draw":
		return "引き分け"
	if is_team_a and winner_key == "team_a":
		return "勝ち"
	if not is_team_a and winner_key == "team_b":
		return "勝ち"
	return "集計中" if not _series_is_finished() else "負け"

func _final_summary_text(summary: Dictionary) -> String:
	var winner_key: String = _overall_winner_key(summary)
	if not _series_is_finished():
		return "途中集計: 勝利マッチ数 %d - %d / 引き分け %d" % [
			int(summary.get("team_a_wins", 0)),
			int(summary.get("team_b_wins", 0)),
			int(summary.get("draws", 0))
		]
	if winner_key == "team_a":
		return "総合結果: [勝利マッチ数] %s の勝ち" % active_series.get("team_a", "チームA")
	if winner_key == "team_b":
		return "総合結果: [勝利マッチ数] %s の勝ち" % active_series.get("team_b", "チームB")
	return "総合結果: 引き分け"

func _overall_winner_key(summary: Dictionary) -> String:
	# ルールに合わせ、ゲーム全体は勝利マッチ数を最優先にします。
	var team_a_wins: int = int(summary.get("team_a_wins", 0))
	var team_b_wins: int = int(summary.get("team_b_wins", 0))
	if team_a_wins > team_b_wins:
		return "team_a"
	if team_b_wins > team_a_wins:
		return "team_b"

	# 勝利数が同じ場合は、得点が低い方を優先します。
	var team_a_score: int = int(summary.get("team_a_score", 0))
	var team_b_score: int = int(summary.get("team_b_score", 0))
	if team_a_score < team_b_score:
		return "team_a"
	if team_b_score < team_a_score:
		return "team_b"
	return "draw"

func _series_is_finished() -> bool:
	var records: Array = active_series.get("records", [])
	return records.size() >= SERIES_MATCH_COUNT

func _next_match_number() -> int:
	return active_series.get("records", []).size() + 1

func _current_input_match_number() -> int:
	if editing_match_number > 0:
		return editing_match_number
	return _next_match_number()

func _refresh_history(_index: int = -1) -> void:
	# 保存済み履歴はフィルター後にカードとして再生成します。
	_clear_children(history_list)

	var filtered_records: Array = _history_records_for_current_filters()
	_refresh_team_statistics_cards(store.get_filtered_records("all"))
	if history_status_label != null and history_panel.visible:
		_update_history_status_count()

	if filtered_records.is_empty():
		history_list.add_child(_empty_label("この条件の記録はまだありません。"))
		return

	for record in filtered_records:
		history_list.add_child(_build_history_card(record))

func _refresh_team_statistics(source_records: Array) -> void:
	var selected_team: String = _selected_team_stats_team()
	if selected_team.is_empty():
		all_time_win_rate_label.text = "全期間 勝率\n-"
		all_time_total_matches_label.text = "全期間 試合数\n-"
		all_time_average_score_label.text = "全期間 平均得点\n-"
		weekly_win_rate_label.text = "今週 勝率\n-"
		weekly_total_matches_label.text = "今週 試合数\n-"
		weekly_average_score_label.text = "今週 平均得点\n-"
		return

	var all_time_records: Array = _records_for_team(source_records, selected_team)
	var weekly_records: Array = []
	for record in all_time_records:
		if _is_record_in_current_week(record):
			weekly_records.append(record)

	_apply_team_stat_labels(all_time_win_rate_label, all_time_total_matches_label, all_time_average_score_label, "全期間", _team_statistics_for_records(all_time_records, selected_team))
	_apply_team_stat_labels(weekly_win_rate_label, weekly_total_matches_label, weekly_average_score_label, "今週", _team_statistics_for_records(weekly_records, selected_team))

func _refresh_team_statistics_cards(source_records: Array) -> void:
	var selected_team: String = _selected_team_stats_team()
	var period_label: String = _selected_team_stats_period_label()
	if selected_team.is_empty():
		all_time_matches_label.text = "全期間 試合数\n-"
		all_time_record_label.text = "全期間 勝敗\n-"
		all_time_win_rate_label.text = "全期間 勝率\n-"
		all_time_violation_label.text = "全期間 違反数\n-"
		weekly_matches_label.text = "%s 試合数\n-" % period_label
		weekly_record_label.text = "%s 勝敗\n-" % period_label
		weekly_win_rate_label.text = "%s 勝率\n-" % period_label
		weekly_violation_label.text = "%s 違反数\n-" % period_label
		return

	var all_time_records: Array = _records_for_team(source_records, selected_team)
	var period_records: Array = []
	for record in all_time_records:
		if _is_record_in_selected_stats_period(record):
			period_records.append(record)

	_apply_team_stat_cards(all_time_matches_label, all_time_record_label, all_time_win_rate_label, all_time_violation_label, "全期間", _team_statistics_cards_for_records(all_time_records, selected_team))
	_apply_team_stat_cards(weekly_matches_label, weekly_record_label, weekly_win_rate_label, weekly_violation_label, period_label, _team_statistics_cards_for_records(period_records, selected_team))

func _selected_team_stats_team() -> String:
	if team_stats_select.item_count == 0 or team_stats_select.selected <= 0:
		return ""
	return team_stats_select.get_item_text(team_stats_select.selected)

func _selected_team_stats_period_label() -> String:
	match team_stats_period_select.selected:
		TEAM_STATS_PERIOD_TODAY:
			return "本日"
		TEAM_STATS_PERIOD_MONTH:
			return "今月"
		_:
			return "今週"

func _records_for_team(source_records: Array, team_name: String) -> Array:
	var filtered: Array = []
	for record in source_records:
		if not _is_match_record(record):
			continue
		if str(record.get("team_a", "")) == team_name or str(record.get("team_b", "")) == team_name:
			filtered.append(record)
	return filtered

func _is_match_record(record: Variant) -> bool:
	return record is Dictionary and str(record.get("record_kind", RECORD_KIND_MATCH)) != RECORD_KIND_SERIES_RESULT

func _team_statistics_for_records(source_records: Array, team_name: String) -> Dictionary:
	var total_matches: int = source_records.size()
	if total_matches == 0:
		return {"win_rate": 0.0, "total_matches": 0, "average_score": 0.0}

	var wins: int = 0
	var score_total: float = 0.0
	for record in source_records:
		if str(record.get("winner", "")) == team_name:
			wins += 1
		score_total += float(_score_for_team(record, team_name))

	return {
		"win_rate": (float(wins) / float(total_matches)) * 100.0,
		"total_matches": total_matches,
		"average_score": score_total / float(total_matches)
	}

func _score_for_team(record: Dictionary, team_name: String) -> int:
	if str(record.get("team_a", "")) == team_name:
		return int(record.get("team_a_score", 0))
	return int(record.get("team_b_score", 0))

func _apply_team_stat_labels(win_rate_target: Label, total_target: Label, average_target: Label, prefix: String, stats: Dictionary) -> void:
	win_rate_target.text = "%s 勝率\n%.1f%%" % [prefix, stats.get("win_rate", 0.0)]
	total_target.text = "%s 試合数\n%d" % [prefix, stats.get("total_matches", 0)]
	average_target.text = "%s 平均得点\n%.1f" % [prefix, stats.get("average_score", 0.0)]

func _team_statistics_cards_for_records(source_records: Array, team_name: String) -> Dictionary:
	var total_matches: int = source_records.size()
	if total_matches == 0:
		return {"wins": 0, "losses": 0, "draws": 0, "win_rate": 0.0, "total_matches": 0, "violations": 0}

	var wins: int = 0
	var draws: int = 0
	var violations: int = 0
	for record in source_records:
		var winner_name: String = str(record.get("winner", ""))
		if winner_name == team_name:
			wins += 1
		elif winner_name == TARGET_TEAM_DRAW:
			draws += 1
		violations += _violation_count_for_record(record, team_name)

	var losses: int = total_matches - wins - draws
	return {
		"wins": wins,
		"losses": losses,
		"draws": draws,
		"win_rate": (float(wins) / float(total_matches)) * 100.0,
		"total_matches": total_matches,
		"violations": violations
	}

func _apply_team_stat_cards(matches_target: Label, record_target: Label, win_rate_target: Label, violation_target: Label, prefix: String, stats: Dictionary) -> void:
	var wins: int = int(stats.get("wins", 0))
	var losses: int = int(stats.get("losses", 0))
	var draws: int = int(stats.get("draws", 0))
	matches_target.text = "%s 試合数\n%d" % [prefix, int(stats.get("total_matches", 0))]
	record_target.text = "%s 勝敗\n%d勝 %d敗 %d分" % [prefix, wins, losses, draws]
	win_rate_target.text = "%s 勝率\n%.1f%%" % [prefix, float(stats.get("win_rate", 0.0))]
	violation_target.text = "%s 違反数\n%d" % [prefix, int(stats.get("violations", 0))]

func _is_record_in_selected_stats_period(record: Dictionary) -> bool:
	match team_stats_period_select.selected:
		TEAM_STATS_PERIOD_TODAY:
			return _is_record_in_current_day(record)
		TEAM_STATS_PERIOD_MONTH:
			return _is_record_in_current_month(record)
		_:
			return _is_record_in_current_week(record)

func _record_unix_time(record: Dictionary) -> float:
	var timestamp_text: String = str(record.get("timestamp", ""))
	if timestamp_text.length() < 19:
		return -1.0
	return Time.get_unix_time_from_datetime_string(timestamp_text.replace(" ", "T"))

func _is_record_in_current_day(record: Dictionary) -> bool:
	var current_datetime: Dictionary = Time.get_datetime_dict_from_system()
	var day_start: float = Time.get_unix_time_from_datetime_string("%04d-%02d-%02dT00:00:00" % [current_datetime.year, current_datetime.month, current_datetime.day])
	var record_unix: float = _record_unix_time(record)
	return record_unix >= day_start and record_unix < day_start + 86400.0

func _is_record_in_current_week(record: Dictionary) -> bool:
	var current_datetime: Dictionary = Time.get_datetime_dict_from_system()
	var weekday: int = int(current_datetime.get("weekday", 1))
	var days_from_monday: int = (weekday + 6) % 7
	var current_midnight: float = Time.get_unix_time_from_datetime_string("%04d-%02d-%02dT00:00:00" % [current_datetime.year, current_datetime.month, current_datetime.day])
	var week_start: float = current_midnight - float(days_from_monday * 86400)
	var week_end: float = week_start + float(7 * 86400)
	var record_unix: float = _record_unix_time(record)
	return record_unix >= week_start and record_unix < week_end

func _is_record_in_current_month(record: Dictionary) -> bool:
	var current_datetime: Dictionary = Time.get_datetime_dict_from_system()
	var month_start: float = Time.get_unix_time_from_datetime_string("%04d-%02d-01T00:00:00" % [current_datetime.year, current_datetime.month])
	var next_year: int = int(current_datetime.year)
	var next_month: int = int(current_datetime.month) + 1
	if next_month > 12:
		next_month = 1
		next_year += 1
	var month_end: float = Time.get_unix_time_from_datetime_string("%04d-%02d-01T00:00:00" % [next_year, next_month])
	var record_unix: float = _record_unix_time(record)
	return record_unix >= month_start and record_unix < month_end

func _build_history_card(record: Dictionary) -> PanelContainer:
	var card: PanelContainer = PanelContainer.new()
	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 16)
	margin.add_theme_constant_override("margin_top", 16)
	margin.add_theme_constant_override("margin_right", 16)
	margin.add_theme_constant_override("margin_bottom", 16)
	card.add_child(margin)

	var body: VBoxContainer = VBoxContainer.new()
	body.add_theme_constant_override("separation", 8)
	margin.add_child(body)

	if str(record.get("record_kind", RECORD_KIND_MATCH)) == RECORD_KIND_SERIES_RESULT:
		return _build_series_result_history_card(card, body, record)

	var title: Label = Label.new()
	title.add_theme_font_size_override("font_size", 22)
	title.text = "%s vs %s / %s 第%s試合" % [
		record.get("team_a", "-"),
		record.get("team_b", "-"),
		record.get("court", "Aコート"),
		str(int(record.get("series_number", 0)))
	]
	body.add_child(title)

	var detail: Label = Label.new()
	detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	var reason_text: String = "%s / %s" % [str(record.get("reason_category", "")), str(record.get("end_reason", "未設定"))]
	var winner_text: String = str(record.get("winner", "-"))
	var match_label: String = ""
	if record.has("match_number"):
		match_label = " | 第%dマッチ" % int(record.get("match_number", 0))
	detail.text = "%s | %s%s\n終了理由: %s\nA 橙%d 紫%d 得点%d / B 橙%d 紫%d 得点%d / 勝者 %s" % [
		record.get("timestamp", "-"),
		record.get("match_type", "-"),
		match_label,
		reason_text,
		int(record.get("team_a_orange", 0)),
		int(record.get("team_a_purple", 0)),
		int(record.get("team_a_score", 0)),
		int(record.get("team_b_orange", 0)),
		int(record.get("team_b_purple", 0)),
		int(record.get("team_b_score", 0)),
		winner_text
	]
	body.add_child(detail)

	return card

func _build_series_result_history_card(card: PanelContainer, body: VBoxContainer, record: Dictionary) -> PanelContainer:
	var title: Label = Label.new()
	title.add_theme_font_size_override("font_size", 22)
	title.text = "試合結果: %s vs %s / %s 第%s試合" % [
		record.get("team_a", "-"),
		record.get("team_b", "-"),
		record.get("court", "Aコート"),
		str(int(record.get("series_number", 0)))
	]
	body.add_child(title)

	var detail: Label = Label.new()
	detail.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	detail.text = "%s | %s\n%s\n総合勝者: %s\n%s %d勝%d敗 / %s %d勝%d敗 / 引き分け%d" % [
		record.get("timestamp", "-"),
		record.get("match_type", "-"),
		record.get("notes", ""),
		record.get("overall_winner", record.get("winner", "-")),
		record.get("team_a", "-"),
		int(record.get("team_a_wins", 0)),
		int(record.get("team_a_losses", 0)),
		record.get("team_b", "-"),
		int(record.get("team_b_wins", 0)),
		int(record.get("team_b_losses", 0)),
		int(record.get("draws", 0))
	]
	body.add_child(detail)
	return card

func _current_filter_key() -> String:
	match filter_option.selected:
		1:
			return MATCH_TYPE_PRACTICE
		2:
			return MATCH_TYPE_OFFICIAL
		_:
			return "all"

func _header_label(text: String) -> Label:
	var label: Label = Label.new()
	label.add_theme_font_size_override("font_size", 18)
	label.text = text
	return label

func _table_header_cell(text: String, width: float) -> PanelContainer:
	var panel: PanelContainer = PanelContainer.new()
	panel.custom_minimum_size = Vector2(width, 54)
	panel.add_theme_stylebox_override("panel", _table_style(COLOR_TABLE_HEADER))

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)

	var label: Label = Label.new()
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 18)
	label.text = text
	margin.add_child(label)
	return panel

func _table_value_cell(text: String, width: float, alignment: HorizontalAlignment = HORIZONTAL_ALIGNMENT_CENTER, wrap: bool = false, background_color: Color = COLOR_TABLE_NEUTRAL) -> PanelContainer:
	var panel: PanelContainer = PanelContainer.new()
	panel.custom_minimum_size = Vector2(width, 52)
	panel.add_theme_stylebox_override("panel", _table_style(background_color))

	var margin: MarginContainer = MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 10)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 10)
	panel.add_child(margin)

	var label: Label = Label.new()
	label.horizontal_alignment = alignment
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART if wrap else TextServer.AUTOWRAP_OFF
	label.text = text
	margin.add_child(label)
	return panel

func _table_style(background_color: Color) -> StyleBoxFlat:
	var style: StyleBoxFlat = StyleBoxFlat.new()
	style.bg_color = background_color
	style.border_color = Color(0.23, 0.34, 0.56, 1.0)
	style.set_border_width_all(1)
	style.corner_radius_top_left = 0
	style.corner_radius_top_right = 0
	style.corner_radius_bottom_right = 0
	style.corner_radius_bottom_left = 0
	return style

func _value_label(text: String) -> Label:
	var label: Label = Label.new()
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.text = text
	return label

func _empty_label(text: String) -> Label:
	var label: Label = Label.new()
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	label.text = text
	return label

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()

func _timestamp_string() -> String:
	var now: Dictionary = Time.get_datetime_dict_from_system()
	return "%04d-%02d-%02d %02d:%02d:%02d" % [
		now.year,
		now.month,
		now.day,
		now.hour,
		now.minute,
		now.second
	]
