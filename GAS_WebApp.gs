const MATCH_SHEET_NAME = 'match_records';
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
    const sheetName = isTest ? TEST_SHEET_NAME : MATCH_SHEET_NAME;
    const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);

    if (isTest) {
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

      return jsonResponse({
        ok: true,
        spreadsheet_id: spreadsheetId,
        sheet_name: sheet.getName(),
        last_row: sheet.getLastRow()
      });
    }

    const payload = body.payload || {};
    const recordId = String(body.record_id || payload.record_id || '');
    const csvColumns = Array.isArray(body.csv_columns) ? body.csv_columns : [];
    const csvRow = Array.isArray(body.csv_row) ? body.csv_row : [];
    const header = csvColumns.length > 0 ? MATCH_HEADER_PREFIX.concat(csvColumns) : MATCH_HEADER_PREFIX.concat(['payload_json']);
    ensureExactHeader(sheet, header);

    if (recordId && hasRecordId(sheet, recordId, MATCH_HEADER_PREFIX.length)) {
      return jsonResponse({
        ok: true,
        duplicate: true,
        record_id: recordId,
        spreadsheet_id: spreadsheetId,
        sheet_name: sheet.getName(),
        last_row: sheet.getLastRow()
      });
    }

    sheet.appendRow([
      new Date(),
      eventName,
      body.source || '',
      body.sent_at || '',
      recordId
    ].concat(csvRow.length > 0 ? csvRow : [JSON.stringify(payload)]));

    return jsonResponse({
      ok: true,
      record_id: recordId,
      spreadsheet_id: spreadsheetId,
      sheet_name: sheet.getName(),
      last_row: sheet.getLastRow()
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err), stack: err.stack });
  } finally {
    if (locked) {
      lock.releaseLock();
    }
  }
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
