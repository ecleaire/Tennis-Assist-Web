import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../../GAS_WebApp.gs", import.meta.url), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${source}\nthis.verifyApi = { SERIES_RESULT_HEADER, seriesResultHeaderInfo, writeSeriesResultRows, readSeriesResultKeys, ensureExactHeader };`, context);

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

console.log("GAS schema verification passed: canonical, legacy 12-column, reordered, duplicate, and archive-extension cases.");
