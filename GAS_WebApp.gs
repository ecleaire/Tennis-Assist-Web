const TEST_SHEET_NAME = '送信テスト';
const SERIES_RESULT_SHEET_NAME = '試合結果';
const MATCH_RESULT_SHEET_NAME = 'マッチ結果';
const HISTORY_SHEET_NAME = '対戦履歴';
const TEAM_LIST_SHEET_NAME = 'チームリスト';
const TIMER_SETTING_SHEET_NAME = 'timer_settings';
const LEGACY_TIMER_SETTING_SHEET_NAME = 'timer_setting';

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
    if (action !== 'history' && action !== 'teams' && action !== 'timer_setting') return jsonResponse({ ok: false, error: 'unknown_action' });

    const spreadsheetId = String(params.spreadsheet_id || defaultSpreadsheetId || '').trim();
    if (!spreadsheetId) return jsonResponse({ ok: false, error: 'SPREADSHEET_ID is missing' });

    const defaultSheetName = action === 'teams' ? TEAM_LIST_SHEET_NAME : action === 'timer_setting' ? TIMER_SETTING_SHEET_NAME : HISTORY_SHEET_NAME;
    const sheetName = String(params.sheet || params.sheet_name || defaultSheetName);
    const ss = SpreadsheetApp.openById(spreadsheetId);
    const sheet = action === 'timer_setting'
      ? getOrCreateTimerSettingSheet(ss, sheetName)
      : ss.getSheetByName(sheetName) || (action === 'teams' ? ss.getSheetByName('チーム一覧') : null);

    if (action === 'timer_setting') {
      if (!sheet || sheet.getLastRow() < 2) {
        return jsonResponse({
          ok: true,
          spreadsheet_id: spreadsheetId,
          sheet_name: sheetName,
          timer_setting: defaultTimerSetting('default'),
          row_count: 0
        });
      }
      const setting = readTimerSetting(sheet.getDataRange().getValues());
      return jsonResponse({
        ok: true,
        spreadsheet_id: spreadsheetId,
        sheet_name: sheet.getName(),
        timer_setting: setting,
        row_count: sheet.getLastRow() - 1
      });
    }

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
      const teams = readTeams(values);
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

function defaultTimerSetting(source) {
  return {
    mode: 'random',
    min_seconds: 60,
    max_seconds: 120,
    step_seconds: 1,
    fixed_seconds: '',
    source: source || 'default'
  };
}

function readTimerSetting(values) {
  const setting = defaultTimerSetting('sheet');
  const entries = {};

  values.slice(1).forEach((row) => {
    const key = String(row[0] || '').trim().toLowerCase();
    if (!key) return;
    entries[key] = row[1];
  });

  const rawMode = String(entries.mode || entries['設定種別'] || entries['モード'] || '').trim().toLowerCase();
  if (rawMode === 'fixed' || rawMode === '固定') setting.mode = 'fixed';
  if (rawMode === 'random' || rawMode === 'ランダム') setting.mode = 'random';

  const randomRange = readTimerRange(entries['ランダム範囲'] || entries.random_range || entries.range);
  const minSeconds = readTimerSeconds(entries.min_seconds || entries.min || entries['最小秒数'] || entries['開始秒数']) || randomRange.min;
  const maxSeconds = readTimerSeconds(entries.max_seconds || entries.max || entries['最大秒数'] || entries['終了秒数']) || randomRange.max;
  const stepSeconds = readPositiveInteger(entries.step_seconds || entries.step || entries['間隔秒数'] || entries['ランダム間隔秒数']);
  const fixedSeconds = readTimerSeconds(entries.fixed_seconds || entries.fixed || entries['固定秒数'] || entries['固定時間']);

  if (minSeconds) setting.min_seconds = minSeconds;
  if (maxSeconds) setting.max_seconds = maxSeconds;
  if (stepSeconds) setting.step_seconds = stepSeconds;
  if (fixedSeconds) {
    setting.fixed_seconds = fixedSeconds;
    setting.mode = 'fixed';
  } else {
    setting.fixed_seconds = '';
    setting.mode = 'random';
  }

  if (setting.max_seconds < setting.min_seconds) {
    const tmp = setting.min_seconds;
    setting.min_seconds = setting.max_seconds;
    setting.max_seconds = tmp;
  }
  setting.step_seconds = Math.max(1, setting.step_seconds);

  return setting;
}

function readTimerRange(value) {
  const result = { min: null, max: null };
  if (value === null || value === undefined || value === '') return result;
  const text = String(value).trim();
  const parts = text.split(/[-〜~～]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    result.min = readTimerSeconds(parts[0]);
    result.max = readTimerSeconds(parts[1]);
  }
  return result;
}

function readTimerSeconds(value) {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  if (!text) return null;
  const clockMatch = text.match(/^(\d{1,2}):([0-5]\d)$/);
  if (clockMatch) return Number(clockMatch[1]) * 60 + Number(clockMatch[2]);
  if (/^\d{4}$/.test(text)) {
    const minutes = Number(text.slice(0, 2));
    const seconds = Number(text.slice(2, 4));
    if (seconds < 60) return minutes * 60 + seconds;
  }
  return readPositiveInteger(value);
}

function readPositiveInteger(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!isFinite(number) || number <= 0) return null;
  return Math.floor(number);
}

function readTeams(values) {
  if (!values || values.length < 2) return [];

  const header = values[0].map((value) => String(value || '').trim());
  const teamNameIndex = header.indexOf('チーム名');
  const nameIndex = teamNameIndex >= 0 ? teamNameIndex : 1; // チームリスト: A列=チーム数, B列=チーム名, C列=ゼッケン番号

  return Array.from(new Set(values.slice(1)
    .map((row) => String(row[nameIndex] || '').trim())
    .filter(Boolean)));
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

    locked = lock.tryLock(15000);
    if (!locked) {
      return jsonResponse({
        ok: false,
        error: 'lock_busy',
        message: '同時送信が集中しているため、書き込みできませんでした。アプリの履歴から再送してください。'
      });
    }

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

function getOrCreateTimerSettingSheet(ss, name) {
  const requestedName = name || TIMER_SETTING_SHEET_NAME;
  let sheet = ss.getSheetByName(requestedName);
  if (!sheet && requestedName === TIMER_SETTING_SHEET_NAME) {
    sheet = ss.getSheetByName(LEGACY_TIMER_SETTING_SHEET_NAME);
  }
  if (!sheet) {
    sheet = ss.insertSheet(requestedName);
  }
  ensureTimerSettingSheetTemplate(sheet);
  return sheet;
}

function ensureTimerSettingSheetTemplate(sheet) {
  const template = [
    ['入力項目', '数値'],
    ['ランダム範囲', '0100-0200'],
    ['固定時間', ''],
    ['ランダム間隔秒数', '1'],
    ['mode', ''],
    ['min_seconds', ''],
    ['max_seconds', ''],
    ['step_seconds', ''],
    ['fixed_seconds', ''],
    ['入力ルール', '時間は4桁の数字で入力します。2分は0200、1分30秒は0130です。'],
    ['入力例', '固定時間に0200を入力すると2分固定。固定時間を空白にするとランダム範囲を使用します。']
  ];
  const width = 2;
  const current = sheet.getRange(1, 1, template.length, width).getValues();
  const next = template.map((row, rowIndex) => row.map((value, columnIndex) => {
    const currentValue = current[rowIndex] && current[rowIndex][columnIndex];
    return currentValue === '' || currentValue === null ? value : currentValue;
  }));
  sheet.getRange(1, 1, next.length, width).setValues(next);
  sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#DFF2C7');
  sheet.autoResizeColumns(1, width);
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

  const existingIds = readRecordIds(sheet, MATCH_HEADER_PREFIX.length);
  const rows = [];
  let appended = 0;
  let duplicates = 0;
  records.forEach((record) => {
    const recordId = String(record.record_id || '');
    if (recordId && existingIds.has(recordId)) {
      duplicates += 1;
      return;
    }

    const row = [
      new Date(),
      eventName,
      body.source || '',
      body.sent_at || '',
      recordId
    ].concat(record.csv_row && record.csv_row.length > 0 ? record.csv_row : [JSON.stringify(body.payload || {})]);
    rows.push(normalizeRow(row, header.length));
    if (recordId) existingIds.add(recordId);
    appended += 1;
  });

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, header.length).setValues(rows);
  }

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

function normalizeRow(row, width) {
  const normalized = row.slice(0, width);
  while (normalized.length < width) normalized.push('');
  return normalized;
}

function readRecordIds(sheet, columnIndex) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();

  const values = sheet.getRange(2, columnIndex, lastRow - 1, 1).getValues();
  return new Set(values.map((row) => String(row[0] || '')).filter(Boolean));
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
