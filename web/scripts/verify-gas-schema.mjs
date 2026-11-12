import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../GAS_WebApp.gs", import.meta.url), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${source}\nthis.verifyApi = { SERIES_RESULT_HEADER, seriesResultHeaderInfo, writeSeriesResultRows, readSeriesResultKeys, ensureExactHeader, validateFinalizedSeriesSubmission, collectFinalizedSeriesRecords, normalizeFinalizedSeriesRecords, isRankingViolationCsv };`, context);

class MockRange {
  constructor(sheet, row, column, rows = 1, columns = 1) {
    Object.assign(this, { sheet, row, column, rows, columns });
  }

  getValues() {
    return Array.from({ length: this.rows }, (_, rowOffset) =>
      Array.from({ length: this.columns }, (_, columnOffset) =>
        this.sheet.value(this.row + rowOffset, this.column + columnOffset)));
  }

  setValues(values) {
    if (values.length !== this.rows || values.some((row) => row.length !== this.columns)) throw new Error("Invalid mock range size");
    values.forEach((row, rowOffset) => row.forEach((value, columnOffset) => {
      this.sheet.set(this.row + rowOffset, this.column + columnOffset, value);
    }));
    this.sheet.writes.push({ row: this.row, column: this.column, rows: this.rows, columns: this.columns, values });
    return this;
  }

  setValue(value) {
    return this.setValues([[value]]);
  }

  setFontWeight() {
    return this;
  }
}

class MockSheet {
  constructor(rows) {
    this.rows = rows.map((row) => [...row]);
    this.writes = [];
  }

  value(row, column) {
    return this.rows[row - 1]?.[column - 1] ?? "";
  }

  set(row, column, value) {
    while (this.rows.length < row) this.rows.push([]);
    while (this.rows[row - 1].length < column) this.rows[row - 1].push("");
    this.rows[row - 1][column - 1] = value;
  }

  getRange(row, column, rows = 1, columns = 1) {
    return new MockRange(this, row, column, rows, columns);
  }

  getLastColumn() {
    return this.rows.reduce((max, row) => Math.max(max, row.length), 0);
  }

  getLastRow() {
    let last = 0;
    this.rows.forEach((row, index) => {
      if (row.some((value) => String(value ?? "").trim() !== "")) last = index + 1;
    });
    return last;
  }
}

const api = context.verifyApi;
const canonicalRow = ["2026-07-18 10:00:00", "Aコート", "予選", "ALFA", "BRAVO", 3, 0, -2, 1];

const canonical = new MockSheet([api.SERIES_RESULT_HEADER]);
api.writeSeriesResultRows(canonical, [canonicalRow]);
if (canonical.writes.length !== 1 || canonical.writes[0].columns !== 9) throw new Error("Canonical layout should use one batch write.");
if (canonical.value(2, 6) !== 3 || canonical.value(2, 9) !== 1) throw new Error("Canonical layout write failed.");

const legacyHeader = ["日時", "コート", "種別", "チーム名", "対戦相手", "勝ち点", "勝数", "敗数", "オレンジ", "紫", "得点", "違反数"];
const legacyExisting = ["2026-07-18 09:00:00", "Aコート", "予選", "OLD", "TEAM", 1, 0, 0, 8, 0, 8, 0];
const legacy = new MockSheet([legacyHeader, legacyExisting, ["", "", "", "", "", "", "manual", "keep", "these"]]);
api.writeSeriesResultRows(legacy, [canonicalRow]);
if (legacy.writes.length !== 2) throw new Error(`Legacy layout should use two batch writes, got ${legacy.writes.length}.`);
if (legacy.value(3, 7) !== "manual" || legacy.value(3, 8) !== "keep" || legacy.value(3, 9) !== "these") throw new Error("Unmanaged legacy columns were modified.");
if (legacy.value(3, 10) !== 1 || legacy.value(3, 11) !== -2 || legacy.value(3, 12) !== 0) throw new Error("Legacy mapped columns were not written.");
if (!api.readSeriesResultKeys(legacy).has("2026-07-18 10:00:00|Aコート|予選|ALFA|BRAVO")) throw new Error("Legacy dedupe key was not detected.");

const reorderedHeader = ["メモ", "紫", "日時", "対戦相手", "得点", "コート", "勝ち点", "チーム名", "種別", "違反数", "手動列"];
const reordered = new MockSheet([reorderedHeader, ["keep-existing"]]);
api.writeSeriesResultRows(reordered, [canonicalRow]);
if (reordered.value(2, 1) !== "keep-existing" || reordered.value(2, 11) !== "") throw new Error("Reordered layout touched unmanaged columns.");
if (reordered.value(2, 2) !== 1 || reordered.value(2, 3) !== canonicalRow[0] || reordered.value(2, 8) !== "ALFA") throw new Error("Reordered layout mapping failed.");

const duplicate = new MockSheet([[...api.SERIES_RESULT_HEADER, "日時"]]);
let duplicateRejected = false;
try {
  api.seriesResultHeaderInfo(duplicate);
} catch (error) {
  duplicateRejected = String(error).includes("同名");
}
if (!duplicateRejected) throw new Error("Duplicate managed headers must be rejected.");

const archiveHeader = Array.from({ length: 37 }, (_, index) => `H${index + 1}`);
const archive = new MockSheet([archiveHeader.slice(0, 34)]);
api.ensureExactHeader(archive, archiveHeader);
if (archive.value(1, 35) !== "H35" || archive.value(1, 37) !== "H37") throw new Error("Trailing archive headers were not extended.");
if (archive.rows[0].slice(0, 34).some((value, index) => value !== archiveHeader[index])) throw new Error("Existing archive headers were changed.");

const appSource = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const submissionColumns = vm.runInNewContext(appSource.match(/const csvColumns = (\[[\s\S]*?\]) as const;/)[1]);
const scoringCategory = "【終了・その時点で採点】（通常の試合停止）";
const violationCategory = "【違反・自動敗北 / 失格】試合中の違反";
const submissionRow = (kind, matchNumber, overrides = {}) => {
  const final = kind === "試合結果";
  const values = {
    "日時": "2026-07-18 10:00:00",
    "記録種別": kind,
    "種別": "予選",
    "対戦ID": kind === "試合結果" ? "A_01_RESULT" : `A_01_${matchNumber}`,
    "コート": "Aコート",
    "試合番号": "1",
    "マッチ番号": String(matchNumber),
    "チームA": "ALFA",
    "チームB": "BRAVO",
    "チームA違反数": "0",
    "チームB違反数": "0",
    "終了カテゴリ": scoringCategory,
    "終了理由": final ? "3マッチ終了・代表同意済み" : "時間切れでの終了(6.32.1)",
    "対象チーム": "ALFA",
    "チームAオレンジ": final ? "9" : "3", "チームA紫": final ? "6" : "2",
    "チームBオレンジ": final ? "18" : "6", "チームB紫": "0",
    "チームA得点": final ? "-3" : "-1", "チームB得点": final ? "18" : "6",
    "マッチ勝者": final ? "" : "ALFA", "総合勝者": final ? "ALFA" : "", "結果": "勝ち",
    "チームA勝数": final ? "3" : "", "チームA敗数": final ? "0" : "",
    "チームB勝数": final ? "0" : "", "チームB敗数": final ? "3" : "", "引き分け数": final ? "0" : "",
    "チームA同意": final ? "TRUE" : "FALSE", "チームB同意": final ? "TRUE" : "FALSE",
    "完了マッチ数": final ? "3" : "", "最終確定": final ? "TRUE" : "FALSE",
    ...overrides,
  };
  return submissionColumns.map((name) => values[name] ?? "");
};
const finalizedSubmission = {
  event: "series_result",
  target_sheet: "試合結果",
  detail_sheet: "対戦履歴",
  source_device_role: "Aコート用",
  record_id: "test_series_result",
  payload: {
    recordId: "test_series_result", seriesId: "test_series", seriesNumber: 1, matchNumber: 0,
    timestamp: "2026-07-18 10:00:00", matchType: "予選", competitionId: "A_01_RESULT",
    teamA: "ALFA", teamB: "BRAVO", teamAWins: 3, teamALosses: 0, teamBWins: 0, teamBLosses: 3, draws: 0,
    teamAOrange: 9, teamAPurple: 6, teamBOrange: 18, teamBPurple: 0,
    teamAScore: -3, teamBScore: 18, teamAViolations: 0, teamBViolations: 0,
    overallWinner: "ALFA", result: "勝ち", targetTeam: "ALFA", reasonCategory: scoringCategory,
    recordKind: "試合結果",
    teamAAgreed: true,
    teamBAgreed: true,
    completedMatchCount: 3,
    finalized: true,
    endReason: "3マッチ終了・代表同意済み",
    court: "Aコート",
  },
  csv_columns: submissionColumns,
  csv_row: submissionRow("試合結果", 0),
  detail_rows: [
    { record_id: "test_series_match_1", csv_row: submissionRow("マッチ", 1) },
    { record_id: "test_series_match_2", csv_row: submissionRow("マッチ", 2) },
    { record_id: "test_series_match_3", csv_row: submissionRow("マッチ", 3) },
    { record_id: "test_series_result", csv_row: submissionRow("試合結果", 0) },
  ],
};
if (!api.validateFinalizedSeriesSubmission(finalizedSubmission).ok) throw new Error("A finalized three-match submission must be accepted.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, target_sheet: "送信テスト" }).ok) throw new Error("A production result must not be routed to the test sheet.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, csv_columns: [...submissionColumns].reverse() }).ok) throw new Error("A different archive column order must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, payload: { ...finalizedSubmission.payload, teamBAgreed: false } }).ok) throw new Error("A submission without both agreements must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, detail_rows: finalizedSubmission.detail_rows.slice(0, 3) }).ok) throw new Error("A submission without all four detail rows must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, event: "match_result" }).ok) throw new Error("A non-series event must be rejected.");

const wrongCourtRows = finalizedSubmission.detail_rows.map((detail, index) => index === 1
  ? { csv_row: submissionRow("マッチ", 2, { "コート": "Bコート" }) }
  : detail);
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, detail_rows: wrongCourtRows }).ok) throw new Error("Mixed courts must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, source_device_role: "Bコート用" }).ok) throw new Error("A device-role/court mismatch must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, payload: { ...finalizedSubmission.payload, court: "Bコート" } }).ok) throw new Error("A payload/CSV court mismatch must be rejected.");
for (const overrides of [
  { "対戦ID": "A_01_3" }, { "チームA紫": "1" }, { "チームA得点": "5" },
  { "マッチ勝者": "BRAVO" }, { "チームB違反数": "1" }, { "日時": "=1+1" },
]) {
  const detailRows = finalizedSubmission.detail_rows.slice();
  detailRows[1] = { ...detailRows[1], csv_row: submissionRow("マッチ", 2, overrides) };
  if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, detail_rows: detailRows }).ok) {
    throw new Error(`An inconsistent match must be rejected: ${JSON.stringify(overrides)}`);
  }
}
const wrongTotal = submissionRow("試合結果", 0, { "チームA得点": "20" });
if (api.validateFinalizedSeriesSubmission({
  ...finalizedSubmission, csv_row: wrongTotal, payload: { ...finalizedSubmission.payload, teamAScore: 20 },
  detail_rows: [...finalizedSubmission.detail_rows.slice(0, 3), { record_id: "test_series_result", csv_row: wrongTotal }],
}).ok) throw new Error("A final total must match the three details even when both copies and the payload agree.");
if (api.validateFinalizedSeriesSubmission({
  ...finalizedSubmission, csv_row: wrongTotal,
}).ok) throw new Error("The two copies of the final row must match.");

let spreadsheetOpened = false;
context.PropertiesService = { getScriptProperties: () => ({
  getProperties: () => ({ API_KEY: "fixture-key" }),
  getProperty: () => "fixture-spreadsheet",
}) };
context.LockService = { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) };
context.ContentService = { MimeType: { JSON: "application/json" }, createTextOutput: (text) => ({
  setMimeType: () => JSON.parse(text),
}) };
context.SpreadsheetApp = { openById: () => { spreadsheetOpened = true; throw new Error("Unexpected spreadsheet access"); } };
context.invalidSubmission = { ...finalizedSubmission, api_key: "fixture-key", csv_row: wrongTotal };
const invalidResponse = vm.runInContext("doPost({ postData: { contents: JSON.stringify(invalidSubmission) } })", context);
if (spreadsheetOpened || invalidResponse.ok !== false || invalidResponse.error !== "incomplete_series_result") {
  throw new Error("An inconsistent submission must be rejected before opening the spreadsheet.");
}

const violationSubmission = {
  ...finalizedSubmission,
  detail_rows: [
    { csv_row: submissionRow("マッチ", 1, { "チームA違反数": "1", "終了カテゴリ": violationCategory, "終了理由": "両ロボットの撤去(6.21 / 6.32.10)", "対象チーム": "ALFA" }) },
    { csv_row: submissionRow("マッチ", 2, { "終了カテゴリ": violationCategory, "終了理由": "分離パーツの違反(6.23)", "対象チーム": "BRAVO" }) },
    { csv_row: submissionRow("マッチ", 3) },
    { csv_row: submissionRow("試合結果", 0, { "チームA違反数": "1", "チームB違反数": "0", "終了理由": "3マッチ終了・代表同意済み" }) },
  ],
};
const normalizedRecords = api.collectFinalizedSeriesRecords(violationSubmission);
const normalized = api.normalizeFinalizedSeriesRecords(normalizedRecords, submissionColumns);
const violationAt = (record, header) => record.csv_row[submissionColumns.indexOf(header)];
if (violationAt(normalizedRecords[0], "チームA違反数") !== "0") throw new Error("Robot-removal automatic loss must not add a ranking violation.");
if (violationAt(normalizedRecords[1], "チームB違反数") !== "1") throw new Error("The actual violating team must receive the violation.");
if (violationAt(normalizedRecords[3], "チームA違反数") !== "0" || violationAt(normalizedRecords[3], "チームB違反数") !== "1") throw new Error("Final violation totals must be rebuilt from the three matches.");
if (normalized.changedRows !== 3) throw new Error(`Expected three corrected rows, got ${normalized.changedRows}.`);

const appendixViolationCases = [
  ["倫理規定違反(3.1-3.10)", true], ["車検（チェック）不合格(6.1.2)", true], ["遅刻(6.10)", true],
  ["不正なデータ入力(6.17)", true], ["開始後10秒間の不動(6.20)", false],
  ["両ロボットの撤去(6.21 / 6.32.10)", false], ["分離パーツの違反(6.23)", true],
  ["外部からの合図・入力(6.24)", true], ["レッドゾーンへの接触(6.27)", true],
  ["故意のロボット接触(6.28)", true], ["相手陣地・ロボットへの接触(6.29 / 6.32.2)", true],
  ["サイズ制限の超過(6.32.3)", true], ["意図的なコールド誘発(6.32.4)", false],
  ["人間による接触(6.32.5)", true], ["両ロボットの脱走(6.32.6)", true],
  ["ボールの破損(6.32.7)", true], ["フィールド・設備の破損(6.32.8)", true],
  ["無許可の移動・撤去(6.33)", true], ["未知の終了理由", false],
];
for (const [reason, expected] of appendixViolationCases) {
  const actual = api.isRankingViolationCsv(violationCategory, reason);
  if (actual !== expected) throw new Error(`Appendix violation mismatch for ${reason}: expected ${expected}, got ${actual}.`);
}
if (api.isRankingViolationCsv(scoringCategory, "故意のロボット接触(6.28)")) throw new Error("A scoring-category row must not add a violation.");

console.log("GAS schema verification passed: layouts, identity/court gates, and all appendix violation classifications.");
