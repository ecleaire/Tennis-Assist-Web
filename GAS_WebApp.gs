const MATCH_SHEET_NAME = 'match_records';
const TEST_SHEET_NAME = '送信テスト';

const MATCH_HEADER_PREFIX = ['受信日時', 'イベント', '送信元', '送信時刻'];
const TEST_HEADER = ['受信日時', 'イベント', '送信元', '送信時刻', '記録種別', 'メッセージ', 'payload_json'];

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const props = PropertiesService.getScriptProperties();
    const apiKey = props.getProperty('API_KEY');
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');

    if (!apiKey) return jsonResponse({ ok: false, error: 'API_KEY is missing' });
    if (!spreadsheetId) return jsonResponse({ ok: false, error: 'SPREADSHEET_ID is missing' });
    if (body.api_key !== apiKey) return jsonResponse({ ok: false, error: 'invalid_api_key' });

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
    } else {
      const csvColumns = Array.isArray(body.csv_columns) ? body.csv_columns : [];
      const csvRow = Array.isArray(body.csv_row) ? body.csv_row : [];
      const header = csvColumns.length > 0 ? MATCH_HEADER_PREFIX.concat(csvColumns) : TEST_HEADER;
      ensureExactHeader(sheet, header);
      sheet.appendRow([
        new Date(),
        eventName,
        body.source || '',
        body.sent_at || ''
      ].concat(csvRow.length > 0 ? csvRow : [String((body.payload || {}).record_kind || ''), '', JSON.stringify(body.payload || {})]));
    }

    return jsonResponse({
      ok: true,
      spreadsheet_id: spreadsheetId,
      sheet_name: sheet.getName(),
      last_row: sheet.getLastRow()
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err), stack: err.stack });
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

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
