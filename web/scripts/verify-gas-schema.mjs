import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../GAS_WebApp.gs", import.meta.url), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${source}\nthis.verifyApi = { SERIES_RESULT_HEADER, seriesResultHeaderInfo, writeSeriesResultRows, readSeriesResultKeys, ensureExactHeader, validateFinalizedSeriesSubmission, collectFinalizedSeriesRecords, normalizeFinalizedSeriesRecords };`, context);

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

const submissionColumns = [
  "日時", "記録種別", "種別", "対戦ID", "コート", "試合番号", "マッチ番号", "チームA", "チームB",
  "チームA違反数", "チームB違反数", "終了カテゴリ", "終了理由", "対象チーム",
];
const scoringCategory = "【終了・その時点で採点】（通常の試合停止）";
const violationCategory = "【違反・自動敗北 / 失格】試合中の違反";
const submissionRow = (kind, matchNumber, overrides = {}) => {
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
    "終了理由": "時間切れでの終了(6.32.1)",
    "対象チーム": "ALFA",
    ...overrides,
  };
  return submissionColumns.map((name) => values[name]);
};
const finalizedSubmission = {
  event: "series_result",
  source_device_role: "Aコート用",
  payload: {
    recordKind: "試合結果",
    teamAAgreed: true,
    teamBAgreed: true,
    completedMatchCount: 3,
    finalized: true,
    endReason: "3マッチ終了・代表同意済み",
    court: "Aコート",
  },
  csv_columns: submissionColumns,
  detail_rows: [
    { csv_row: submissionRow("マッチ", 1) },
    { csv_row: submissionRow("マッチ", 2) },
    { csv_row: submissionRow("マッチ", 3) },
    { csv_row: submissionRow("試合結果", 0) },
  ],
};
if (!api.validateFinalizedSeriesSubmission(finalizedSubmission).ok) throw new Error("A finalized three-match submission must be accepted.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, payload: { ...finalizedSubmission.payload, teamBAgreed: false } }).ok) throw new Error("A submission without both agreements must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, detail_rows: finalizedSubmission.detail_rows.slice(0, 3) }).ok) throw new Error("A submission without all four detail rows must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, event: "match_result" }).ok) throw new Error("A non-series event must be rejected.");

const wrongCourtRows = finalizedSubmission.detail_rows.map((detail, index) => index === 1
  ? { csv_row: submissionRow("マッチ", 2, { "コート": "Bコート" }) }
  : detail);
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, detail_rows: wrongCourtRows }).ok) throw new Error("Mixed courts must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, source_device_role: "Bコート用" }).ok) throw new Error("A device-role/court mismatch must be rejected.");
if (api.validateFinalizedSeriesSubmission({ ...finalizedSubmission, payload: { ...finalizedSubmission.payload, court: "Bコート" } }).ok) throw new Error("A payload/CSV court mismatch must be rejected.");

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

console.log("GAS schema verification passed: layouts, finalized-series identity/court gates, and server-side violation normalization.");
