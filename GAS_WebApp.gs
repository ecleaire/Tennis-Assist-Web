const TEST_SHEET_NAME = '送信テスト';
const SERIES_RESULT_SHEET_NAME = '試合結果';
const MATCH_RESULT_SHEET_NAME = 'マッチ結果';
const HISTORY_SHEET_NAME = '対戦履歴';

const MATCH_HEADER_PREFIX = ['受信日時', 'イベント', '送信元', '送信時刻', 'record_id'];
const TEST_HEADER = ['受信日時', 'イベント', '送信元', '送信時刻', '記録種別', 'メッセージ', 'payload_json'];
const RECORD_KIND_INDEX = 1; // csv_columns の「記録種別」

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty('API_KEY');
    const defaultSpreadsheetId = props.getProperty('SPREADSHEET_ID');

    if (!apiKey) return jsonResponse({ ok: false, error: 'API_KEY is missing' });
    if (params.api_key !== apiKey) return jsonResponse({ ok: false, error: 'invalid_api_key' });
    const action = String(params.action || '');
    if (action !== 'history' && action !== 'teams') return jsonResponse({ ok: false, error: 'unknown_action' });

    const spreadsheetId = String(params.spreadsheet_id || defaultSpreadsheetId || '').trim();
    if (!spreadsheetId) return jsonResponse({ ok: false, error: 'SPREADSHEET_ID is missing' });

    const sheetName = String(params.sheet || (action === 'teams' ? 'チーム一覧' : HISTORY_SHEET_NAME));
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = ss.getSheetByName(sheetName) || (action === 'teams' ? ss.getSheets()[0] : null);
    if (!sheet || sheet.getLastRow() < 2) {
      return jsonResponse({ ok: true, spreadsheet_id: spreadsheetId, sheet_name: sheetName, csv_columns: [], csv_rows: [], teams: [] });
    }

    const values = sheet.getDataRange().getValues();
    const header = values[0].map((value) => String(value || ''));
    const hasPrefix = MATCH_HEADER_PREFIX.every((name, index) => header[index] === name);
    const startColumn = hasPrefix ? MATCH_HEADER_PREFIX.length : 0;
    const csvColumns = header.slice(startColumn);
    const csvRows = values.slice(1)
      .map((row) => row.slice(startColumn).map((value) => value instanceof Date ? Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss') : String(value || '')))
      .filter((row) => row.some((value) => String(value || '').trim() !== ''));

    if (action === 'teams') {
      const nameIndex = Math.max(0, header.indexOf('チーム名'));
      const teams = values.slice(1).map((row) => String(row[nameIndex] || '').trim()).filter(Boolean);
      return jsonResponse({
        ok: true,
        spreadsheet_id: spreadsheetId,
        sheet_name: sheet.getName(),
        teams: Array.from(new Set(teams)),
        row_count: teams.length
      });
    }

    return jsonResponse({
      ok: true,
      spreadsheet_id: spreadsheetId,
      sheet_name: sheet.getName(),
      csv_columns: csvColumns,
      csv_rows: csvRows,
      row_count: csvRows.length
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err), stack: err.stack });
  }
}

function doPost(e) {
  // 複数端末から同時送信された時に、ヘッダー確認と追記が割り込まれないようロックします。
  const lock = LockService.getScriptLock();
  let locked = false;

  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty('API_KEY');
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');

    if (!apiKey) return jsonResponse({ ok: false, error: 'API_KEY is missing' });
    if (!spreadsheetId) return jsonResponse({ ok: false, error: 'SPREADSHEET_ID is missing' });
    if (body.api_key !== apiKey) return jsonResponse({ ok: false, error: 'invalid_api_key' });

    lock.waitLock(10000);
    locked = true;

    const ss = SpreadsheetApp.openById(spreadsheetId);
    const eventName = String(body.event || '');
    const isTest = eventName === 'test' || eventName === 'connection_test' || String(body.target_sheet || '') === TEST_SHEET_NAME;

    if (isTest) {
      // 送信テストは本番履歴に混ぜず、専用シートへ追記します。
      const testSheet = ss.getSheetByName(TEST_SHEET_NAME) || ss.insertSheet(TEST_SHEET_NAME);
      appendTestRow(testSheet, body, eventName);
      return jsonResponse({
        ok: true,
        spreadsheet_id: spreadsheetId,
        sheet_name: testSheet.getName(),
        last_row: testSheet.getLastRow()
      });
    }

    const csvColumns = Array.isArray(body.csv_columns) ? body.csv_columns : [];
    const records = collectRecords(body);

    const seriesResultSheet = getOrCreateSheet(ss, SERIES_RESULT_SHEET_NAME);
    const matchResultSheet = getOrCreateSheet(ss, MATCH_RESULT_SHEET_NAME);
    const historySheet = getOrCreateSheet(ss, HISTORY_SHEET_NAME);

    const seriesResult = appendFilteredRows(seriesResultSheet, records, eventName, body, csvColumns, '試合結果');
    const matchResult = appendFilteredRows(matchResultSheet, records, eventName, body, csvColumns, 'マッチ');
    const historyResult = appendRows(historySheet, records, eventName, body, csvColumns);

    return jsonResponse({
      ok: true,
      spreadsheet_id: spreadsheetId,
      test_sheet_name: TEST_SHEET_NAME,
      series_result_sheet_name: seriesResultSheet.getName(),
      series_result_appended: seriesResult.appended,
      series_result_duplicates: seriesResult.duplicates,
      match_result_sheet_name: matchResultSheet.getName(),
      match_result_appended: matchResult.appended,
      match_result_duplicates: matchResult.duplicates,
      history_sheet_name: historySheet.getName(),
      history_appended: historyResult.appended,
      history_duplicates: historyResult.duplicates
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err), stack: err.stack });
  } finally {
    if (locked) {
      lock.releaseLock();
    }
  }
}

function appendTestRow(sheet, body, eventName) {
  ensureExactHeader(sheet, TEST_HEADER);
  const payload = body.payload || {};
  sheet.appendRow([
    new Date(),
    eventName,
    body.source || '',
    body.sent_at || '',
    payload.record_kind || '',
    payload.message || '',
    JSON.stringify(payload)
  ]);
}

function getOrCreateSheet(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function collectRecords(body) {
  const records = [];
  const detailRows = Array.isArray(body.detail_rows) ? body.detail_rows : [];

  detailRows.forEach((detail) => {
    const csvRow = Array.isArray(detail && detail.csv_row) ? detail.csv_row : [];
    records.push({
      record_id: String((detail && detail.record_id) || ''),
      csv_row: csvRow
    });
  });

  const csvRow = Array.isArray(body.csv_row) ? body.csv_row : [];
  const bodyRecordId = String(body.record_id || (body.payload && (body.payload.record_id || body.payload.recordId)) || '');
  const alreadyIncluded = records.some((record) => record.record_id && record.record_id === bodyRecordId);
  if (csvRow.length > 0 && !alreadyIncluded) {
    records.push({
      record_id: bodyRecordId,
      csv_row: csvRow
    });
  }

  if (records.length === 0) {
    records.push({
      record_id: bodyRecordId,
      csv_row: [JSON.stringify(body.payload || {})]
    });
  }

  return records;
}

function appendFilteredRows(sheet, records, eventName, body, csvColumns, recordKind) {
  const filtered = records.filter((record) => getRecordKind(record.csv_row) === recordKind);
  return appendRows(sheet, filtered, eventName, body, csvColumns);
}

function getRecordKind(csvRow) {
  return String((csvRow || [])[RECORD_KIND_INDEX] || '');
}

function appendRows(sheet, records, eventName, body, csvColumns) {
  if (!records.length) {
    return { appended: 0, duplicates: 0 };
  }

  const header = csvColumns.length > 0 ? MATCH_HEADER_PREFIX.concat(csvColumns) : MATCH_HEADER_PREFIX.concat(['payload_json']);
  ensureExactHeader(sheet, header);

  let appended = 0;
  let duplicates = 0;
  records.forEach((record) => {
    const recordId = String(record.record_id || '');
    if (recordId && hasRecordId(sheet, recordId, MATCH_HEADER_PREFIX.length)) {
      duplicates += 1;
      return;
    }

    sheet.appendRow([
      new Date(),
      eventName,
      body.source || '',
      body.sent_at || '',
      recordId
    ].concat(record.csv_row && record.csv_row.length > 0 ? record.csv_row : [JSON.stringify(body.payload || {})]));
    appended += 1;
  });

  return { appended, duplicates };
}

function ensureExactHeader(sheet, header) {
  // 列ずれ防止のため、アプリから送られたCSV列順にヘッダーを揃えます。
  const width = header.length;
  const current = sheet.getRange(1, 1, 1, width).getValues()[0];
  const differs = current.length !== width || current.some((value, index) => String(value || '') !== String(header[index] || ''));
  if (differs) {
    sheet.getRange(1, 1, 1, width).setValues([header]);
    sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#DFF2C7');
  }
}

function hasRecordId(sheet, recordId, columnIndex) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  const values = sheet.getRange(2, columnIndex, lastRow - 1, 1).getValues();
  return values.some((row) => String(row[0] || '') === recordId);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
