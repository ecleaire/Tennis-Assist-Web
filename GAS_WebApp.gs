const MATCH_SHEET_NAME = 'match_records';
const DETAIL_SHEET_NAME = 'match_records_detail';
const TEST_SHEET_NAME = '送信テスト';

const MATCH_HEADER_PREFIX = ['受信日時', 'イベント', '送信元', '送信時刻', 'record_id'];
const TEST_HEADER = ['受信日時', 'イベント', '送信元', '送信時刻', '記録種別', 'メッセージ', 'payload_json'];

function doPost(e) {
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
    const isTest = eventName === 'test' || String(body.target_sheet || '') === TEST_SHEET_NAME;

    if (isTest) {
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
    const matchSheet = ss.getSheetByName(MATCH_SHEET_NAME) || ss.insertSheet(MATCH_SHEET_NAME);
    const matchResult = appendSingleRecord(matchSheet, body, eventName, csvColumns);

    const detailSheetName = String(body.detail_sheet || DETAIL_SHEET_NAME);
    const detailSheet = ss.getSheetByName(detailSheetName) || ss.insertSheet(detailSheetName);
    const detailResult = appendDetailRows(detailSheet, body, eventName, csvColumns);

    return jsonResponse({
      ok: true,
      record_id: matchResult.record_id,
      duplicate: matchResult.duplicate,
      spreadsheet_id: spreadsheetId,
      sheet_name: matchSheet.getName(),
      last_row: matchSheet.getLastRow(),
      detail_sheet_name: detailSheet.getName(),
      detail_appended: detailResult.appended,
      detail_duplicates: detailResult.duplicates,
      detail_last_row: detailSheet.getLastRow()
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

function appendSingleRecord(sheet, body, eventName, csvColumns) {
  const payload = body.payload || {};
  const recordId = String(body.record_id || payload.record_id || '');
  const csvRow = Array.isArray(body.csv_row) ? body.csv_row : [];
  const header = csvColumns.length > 0 ? MATCH_HEADER_PREFIX.concat(csvColumns) : MATCH_HEADER_PREFIX.concat(['payload_json']);
  ensureExactHeader(sheet, header);

  if (recordId && hasRecordId(sheet, recordId, MATCH_HEADER_PREFIX.length)) {
    return { record_id: recordId, duplicate: true };
  }

  sheet.appendRow([
    new Date(),
    eventName,
    body.source || '',
    body.sent_at || '',
    recordId
  ].concat(csvRow.length > 0 ? csvRow : [JSON.stringify(payload)]));

  return { record_id: recordId, duplicate: false };
}

function appendDetailRows(sheet, body, eventName, csvColumns) {
  const detailRows = Array.isArray(body.detail_rows) ? body.detail_rows : [];
  if (detailRows.length === 0) {
    return { appended: 0, duplicates: 0 };
  }

  const header = MATCH_HEADER_PREFIX.concat(csvColumns);
  ensureExactHeader(sheet, header);

  let appended = 0;
  let duplicates = 0;
  detailRows.forEach((detail) => {
    const recordId = String((detail && detail.record_id) || '');
    if (recordId && hasRecordId(sheet, recordId, MATCH_HEADER_PREFIX.length)) {
      duplicates += 1;
      return;
    }

    const csvRow = Array.isArray(detail.csv_row) ? detail.csv_row : [];
    sheet.appendRow([
      new Date(),
      eventName,
      body.source || '',
      body.sent_at || '',
      recordId
    ].concat(csvRow));
    appended += 1;
  });

  return { appended, duplicates };
}

function ensureExactHeader(sheet, header) {
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
