const TEST_SHEET_NAME = '送信テスト';
const SERIES_RESULT_SHEET_NAME = '試合結果';
const SERIES_RESULT_ARCHIVE_SHEET_NAME = '試合結果archive';
const LEGACY_NEW_SERIES_RESULT_SHEET_NAME = '新・試合結果';
const MATCH_RESULT_ARCHIVE_SHEET_NAME = 'マッチ結果archive';
const HISTORY_ARCHIVE_SHEET_NAME = '対戦履歴archive';
const LEGACY_MATCH_RESULT_SHEET_NAME = 'マッチ結果';
const LEGACY_HISTORY_SHEET_NAME = '対戦履歴';
const TEAM_LIST_SHEET_NAME = 'チームリスト';
// Official timer settings sheet: A column = input item, B column = value.
const TIMER_SETTING_SHEET_NAME = 'timer_setting';
const LEGACY_TIMER_SETTING_SHEET_NAME = 'timer_settings';
const GROUP_PRELIM_SHEET_NAME = 'Sheet1';
const GROUP_PRELIM_TEMPLATE_SPREADSHEET_ID = '1PKAZgb8HZFww-P9CZTkzVqleAtIOFgkl8Ngk6lZwcTA';

const MATCH_HEADER_PREFIX = ['受信日時', 'イベント', '送信元', '送信時刻', 'record_id'];
const TEST_HEADER = ['受信日時', 'イベント', '送信元', '送信時刻', '記録種別', 'メッセージ', 'payload_json'];
const SERIES_RESULT_HEADER = ['日時', 'コート', '種別', 'チーム名', '対戦相手', '勝ち点', '違反数', '得点', '紫'];
const SERIES_RESULT_MANAGED_WIDTH = SERIES_RESULT_HEADER.length; // 試合結果はA〜Iのみ触ります。
const RECORD_KIND_INDEX = 1; // csv_columns の「記録種別」

function getApiKeys(props) {
  const all = props.getProperties();
  return Object.keys(all)
    .filter(function (name) { return /^API_KEY/i.test(name); })
    .map(function (name) { return String(all[name] || '').trim(); })
    .filter(Boolean);
}

function hasAnyApiKey(props) {
  return getApiKeys(props).length > 0;
}

function isValidApiKey(props, input) {
  const apiKey = normalizeApiKey(input);
  if (!apiKey) return false;
  return getApiKeys(props).map(normalizeApiKey).indexOf(apiKey) >= 0;
}

function normalizeApiKey(value) {
  return String(value || '').trim().toLowerCase();
}

function isTruthy(value) {
  const text = String(value || '').trim().toLowerCase();
  return text === '1' || text === 'true' || text === 'yes' || text === 'on';
}

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    const props = PropertiesService.getScriptProperties();
    const defaultSpreadsheetId = props.getProperty('SPREADSHEET_ID');

    if (!hasAnyApiKey(props)) return jsonResponse({ ok: false, error: 'API_KEY is missing' });
    if (!isValidApiKey(props, params.api_key)) return jsonResponse({ ok: false, error: 'invalid_api_key' });
    const action = String(params.action || '');
    if (action !== 'history' && action !== 'teams' && action !== 'timer_setting' && action !== 'sync_group_sheet' && action !== 'bootstrap') return jsonResponse({ ok: false, error: 'unknown_action' });

    const spreadsheetId = String(params.spreadsheet_id || defaultSpreadsheetId || '').trim();
    if (!spreadsheetId) return jsonResponse({ ok: false, error: 'SPREADSHEET_ID is missing' });

    const defaultSheetName = action === 'teams' ? TEAM_LIST_SHEET_NAME : action === 'timer_setting' ? TIMER_SETTING_SHEET_NAME : HISTORY_ARCHIVE_SHEET_NAME;
    const sheetName = String(params.sheet || params.sheet_name || defaultSheetName);
    const ss = SpreadsheetApp.openById(spreadsheetId);

    if (action === 'bootstrap') {
      const teamSheet = ss.getSheetByName(TEAM_LIST_SHEET_NAME) || ss.getSheetByName('チーム一覧');
      const timerSheet = getOrCreateTimerSettingSheet(ss, TIMER_SETTING_SHEET_NAME);
      const matchType = String(params.match_type || params.matchType || '').trim();
      const teamValues = teamSheet && teamSheet.getLastRow() >= 2 ? teamSheet.getDataRange().getValues() : [];
      const teams = readTeams(teamValues);
      const prioritized = prioritizeTeamsForMatchType(ss, teams, matchType);
      const timerSetting = timerSheet && timerSheet.getLastRow() >= 2
        ? readTimerSetting(timerSheet.getDataRange().getValues())
        : defaultTimerSetting('default');
      return jsonResponse({
        ok: true,
        spreadsheet_id: spreadsheetId,
        teams: prioritized.teams,
        priority_teams: prioritized.priorityTeams,
        team_sheet_name: teamSheet ? teamSheet.getName() : TEAM_LIST_SHEET_NAME,
        team_row_count: prioritized.teams.length,
        court_count: readCourtCount(teamValues),
        timer_setting: timerSetting,
        timer_sheet_name: timerSheet ? timerSheet.getName() : TIMER_SETTING_SHEET_NAME,
        timer_row_count: timerSheet ? Math.max(0, timerSheet.getLastRow() - 1) : 0
      });
    }

    if (action === 'sync_group_sheet') {
      const result = syncGroupPrelimSheet(ss, isTruthy(params.force_formula));
      return jsonResponse(Object.assign({
        ok: true,
        spreadsheet_id: spreadsheetId
      }, result));
    }

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
      const matchType = String(params.match_type || params.matchType || '').trim();
      const prioritized = prioritizeTeamsForMatchType(ss, teams, matchType);
      const courtCount = readCourtCount(values);
      return jsonResponse({
        ok: true,
        spreadsheet_id: spreadsheetId,
        sheet_name: sheet.getName(),
        teams: prioritized.teams,
        priority_teams: prioritized.priorityTeams,
        court_count: courtCount,
        row_count: prioritized.teams.length
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

  values.slice(1).some((row) => {
    const key = String(row[0] || '').trim().toLowerCase();
    const value = row[1];
    if (!key) {
      const hasModernInput =
        Object.prototype.hasOwnProperty.call(entries, '固定時間') ||
        Object.prototype.hasOwnProperty.call(entries, 'ランダム範囲') ||
        Object.prototype.hasOwnProperty.call(entries, 'ランダム間隔秒数');
      return hasModernInput;
    }
    if (!Object.prototype.hasOwnProperty.call(entries, key)) entries[key] = value;
    return false;
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
  if (/^\d{1,4}$/.test(text)) {
    const padded = text.padStart(4, '0');
    const minutes = Number(padded.slice(0, 2));
    const seconds = Number(padded.slice(2, 4));
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

function prioritizeTeamsForMatchType(ss, baseTeams, matchType) {
  const teams = Array.from(new Set((baseTeams || []).map(function (team) {
    return String(team || '').trim();
  }).filter(Boolean)));
  if (!isTournamentMatchType(matchType) || teams.length < 2) {
    return { teams: teams, priorityTeams: [] };
  }

  const sheet = ss.getSheetByName('決勝トーナメント');
  if (!sheet || sheet.getLastRow() < 1 || sheet.getLastColumn() < 1) {
    return { teams: teams, priorityTeams: [] };
  }

  const lookup = {};
  teams.forEach(function (team) {
    lookup[normalizeTeamName(team)] = team;
  });

  const seen = {};
  const priorityTeams = [];
  sheet.getDataRange().getDisplayValues().forEach(function (row) {
    row.forEach(function (cell) {
      const matched = lookup[normalizeTeamName(cell)];
      if (!matched || seen[matched]) return;
      seen[matched] = true;
      priorityTeams.push(matched);
    });
  });

  if (!priorityTeams.length) {
    return { teams: teams, priorityTeams: [] };
  }

  const prioritySet = {};
  priorityTeams.forEach(function (team) {
    prioritySet[team] = true;
  });

  return {
    teams: priorityTeams.concat(teams.filter(function (team) { return !prioritySet[team]; })),
    priorityTeams: priorityTeams
  };
}

function isTournamentMatchType(matchType) {
  const text = String(matchType || '').trim();
  return text === '決勝トーナメント' || text === '4位決定リーグ' || text === '優勝決定リーグ';
}

function normalizeTeamName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function readCourtCount(values) {
  if (!values || !values.length) return null;
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex] || [];
    for (let columnIndex = 0; columnIndex < row.length; columnIndex += 1) {
      if (String(row[columnIndex] || '').trim() !== 'コート数') continue;
      const raw = values[rowIndex + 1] && values[rowIndex + 1][columnIndex];
      const count = Number(String(raw || '').trim());
      if (!isFinite(count) || count < 1) return null;
      return Math.min(26, Math.floor(count));
    }
  }
  return null;
}

function doPost(e) {
  // 複数端末から同時送信された時に、ヘッダー確認と追記が割り込まれないようロックします。
  const lock = LockService.getScriptLock();
  let locked = false;

  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const props = PropertiesService.getScriptProperties();
    const spreadsheetId = props.getProperty('SPREADSHEET_ID');

    if (!hasAnyApiKey(props)) return jsonResponse({ ok: false, error: 'API_KEY is missing' });
    if (!spreadsheetId) return jsonResponse({ ok: false, error: 'SPREADSHEET_ID is missing' });
    if (!isValidApiKey(props, body.api_key)) return jsonResponse({ ok: false, error: 'invalid_api_key' });

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
    const sheets = ensureResultSheetStructure(ss);

    const seriesArchiveResult = appendFilteredRows(sheets.seriesArchiveSheet, records, eventName, body, csvColumns, '試合結果');
    const seriesResult = appendSeriesResultRows(sheets.seriesResultSheet, records, csvColumns);
    const matchArchiveResult = appendFilteredRows(sheets.matchArchiveSheet, records, eventName, body, csvColumns, 'マッチ');
    const historyArchiveResult = appendRows(sheets.historyArchiveSheet, records, eventName, body, csvColumns);
    // 通常送信では Sheet1 や決勝トーナメント系の表を自動更新しません。
    // システムが触るのは archive 追記と「試合結果」A〜I の追記だけに限定します。
    const groupPrelimResult = {
      skipped: true,
      reason: '通常送信ではSheet1を自動更新しません。必要な場合のみ管理操作で同期します。'
    };

    return jsonResponse({
      ok: true,
      spreadsheet_id: spreadsheetId,
      test_sheet_name: TEST_SHEET_NAME,
      series_archive_sheet_name: sheets.seriesArchiveSheet.getName(),
      series_archive_appended: seriesArchiveResult.appended,
      series_archive_duplicates: seriesArchiveResult.duplicates,
      series_result_sheet_name: sheets.seriesResultSheet.getName(),
      series_result_appended: seriesResult.appended,
      series_result_duplicates: seriesResult.duplicates,
      match_archive_sheet_name: sheets.matchArchiveSheet.getName(),
      match_archive_appended: matchArchiveResult.appended,
      match_archive_duplicates: matchArchiveResult.duplicates,
      history_archive_sheet_name: sheets.historyArchiveSheet.getName(),
      history_archive_appended: historyArchiveResult.appended,
      history_archive_duplicates: historyArchiveResult.duplicates,
      group_prelim_result: groupPrelimResult
    });
  } catch (err) {
    return jsonResponse({ ok: false, error: String(err), stack: err.stack });
  } finally {
    if (locked) {
      lock.releaseLock();
    }
  }
}

function syncGroupPrelimSheet(ss, forceFormula) {
  ensureResultSheetStructure(ss);
  const sourceSheet = ss.getSheetByName(SERIES_RESULT_SHEET_NAME);
  const targetSheet = ss.getSheetByName(GROUP_PRELIM_SHEET_NAME) || createEmptyGroupPrelimSheet(ss);

  const targetValues = targetSheet.getDataRange().getValues();
  const teamRows = collectGroupTeamRows(targetValues);
  const allRows = uniqueRowsFromTeamRows(teamRows).filter(function (rowNumber) {
    return rowNumber >= 3 && rowNumber <= 31;
  });
  installGroupResultFormulas(targetSheet, allRows, Boolean(forceFormula));

  if (!sourceSheet) {
    return {
      group_sheet_name: targetSheet.getName(),
      source_sheet_name: SERIES_RESULT_SHEET_NAME,
      updated_rows: allRows.length,
      records: 0,
      skipped_records: 0,
      warning: '試合結果シートがありません。Sheet1には参照数式のみ設定しました。'
    };
  }
  if (sourceSheet.getLastRow() < 2) {
    return {
      group_sheet_name: targetSheet.getName(),
      source_sheet_name: sourceSheet.getName(),
      updated_rows: allRows.length,
      records: 0,
      skipped_records: 0,
      warning: '試合結果にデータがありません。Sheet1は未入力表示になります。'
    };
  }

  const sourceValues = sourceSheet.getDataRange().getValues();
  const header = sourceValues[0].map(function (value) { return String(value || '').trim(); });
  const index = headerIndexMap(header);
  const required = ['チーム名', '勝ち点', '違反数', '得点', '紫'];
  const missing = required.filter(function (name) { return index[name] == null; });
  if (missing.length) {
    return {
      group_sheet_name: targetSheet.getName(),
      source_sheet_name: sourceSheet.getName(),
      updated_rows: allRows.length,
      records: 0,
      skipped_records: 0,
      warning: '試合結果シートに必要な列がありません: ' + missing.join(', ')
    };
  }

  let records = 0;
  let skipped = 0;

  for (let rowIndex = 1; rowIndex < sourceValues.length; rowIndex += 1) {
    const row = sourceValues[rowIndex];
    const teamName = String(row[index['チーム名']] || '').trim();
    if (!teamName) {
      skipped += 1;
      continue;
    }
    records += 1;
  }

  return {
    group_sheet_name: targetSheet.getName(),
    source_sheet_name: sourceSheet.getName(),
    updated_rows: allRows.length,
    records: records,
    skipped_records: skipped,
    force_formula: Boolean(forceFormula)
  };
}

function createEmptyGroupPrelimSheet(ss) {
  // 既存データ保護を優先し、テンプレートコピー後にセルを消す処理は行いません。
  // Sheet1 が無い場合だけ、最低限の空表を新規作成します。
  const sheet = ss.insertSheet(GROUP_PRELIM_SHEET_NAME);
  const headers = [
    '反映', 'No.', 'チーム名', '',
    '1勝点', '1違反', '1得点', '1紫',
    '2勝点', '2違反', '2得点', '2紫',
    '3勝点', '3違反', '3得点', '3紫',
    '合計勝点', '合計違反', '合計得点', '合計紫'
  ];
  sheet.getRange(2, 1, 1, headers.length).setValues([headers]);
  const body = [];
  for (let index = 1; index <= 29; index += 1) {
    const row = new Array(headers.length).fill('');
    row[0] = 'ok';
    row[1] = index;
    row[2] = '';
    body.push(row);
  }
  sheet.getRange(3, 1, body.length, headers.length).setValues(body);
  sheet.setFrozenRows(2);
  sheet.setFrozenColumns(3);
  sheet.getRange(2, 1, 1, headers.length).setFontWeight('bold');
  sheet.autoResizeColumns(1, headers.length);
  return sheet;
}

function syncGroupPrelimSheetFromDefault(forceFormula) {
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = String(props.getProperty('SPREADSHEET_ID') || '').trim();
  if (!spreadsheetId) return { ok: false, error: 'SPREADSHEET_ID is missing' };
  const ss = SpreadsheetApp.openById(spreadsheetId);
  return Object.assign({ ok: true, spreadsheet_id: spreadsheetId }, syncGroupPrelimSheet(ss, Boolean(forceFormula)));
}

function ensureResultSheetStructure(ss) {
  // 「試合結果」は運営側が列順や表示を手動調整するため、既存シートをarchive化・削除しません。
  // システム送信はヘッダー名で列を探して追記し、既存行や不要列には触れません。
  // 旧シートも現場で手動確認・復旧に使う可能性があるため、この関数では触りません。

  const seriesArchiveSheet = getOrCreateSheet(ss, SERIES_RESULT_ARCHIVE_SHEET_NAME);
  const matchArchiveSheet = getOrCreateSheet(ss, MATCH_RESULT_ARCHIVE_SHEET_NAME);
  const historyArchiveSheet = getOrCreateSheet(ss, HISTORY_ARCHIVE_SHEET_NAME);
  const seriesResultSheet = ss.getSheetByName(SERIES_RESULT_SHEET_NAME);
  if (!seriesResultSheet) {
    throw new Error('試合結果シートがありません。既存データ保護のためGASから自動作成しません。');
  }
  ensureSeriesResultHeader(seriesResultSheet);
  return {
    seriesArchiveSheet: seriesArchiveSheet,
    matchArchiveSheet: matchArchiveSheet,
    historyArchiveSheet: historyArchiveSheet,
    seriesResultSheet: seriesResultSheet
  };
}

function backfillSeriesResultFromLegacySheet(seriesResultSheet, legacySheet) {
  if (!legacySheet || legacySheet.getLastRow() < 2) return { appended: 0, duplicates: 0 };
  if (!hasExactHeader(legacySheet, SERIES_RESULT_HEADER)) return { appended: 0, duplicates: 0 };
  const values = legacySheet.getRange(2, 1, legacySheet.getLastRow() - 1, SERIES_RESULT_HEADER.length).getValues();
  const existingKeys = readSeriesResultKeys(seriesResultSheet);
  const rows = [];
  let duplicates = 0;
  values.forEach(function (row) {
    const normalized = normalizeRow(row, SERIES_RESULT_HEADER.length);
    if (!normalized.some(function (value) { return String(value || '').trim() !== ''; })) return;
    const key = seriesResultKey(normalized);
    if (!key || existingKeys.has(key)) {
      duplicates += 1;
      return;
    }
    existingKeys.add(key);
    rows.push(normalized);
  });
  if (rows.length) {
    writeSeriesResultRows(seriesResultSheet, rows);
  }
  return { appended: rows.length, duplicates: duplicates };
}

function backfillSeriesResultFromArchive(seriesResultSheet, seriesArchiveSheet) {
  if (!seriesArchiveSheet || seriesArchiveSheet.getLastRow() < 2) return { appended: 0, duplicates: 0 };
  const lastColumn = seriesArchiveSheet.getLastColumn();
  const values = seriesArchiveSheet.getRange(1, 1, seriesArchiveSheet.getLastRow(), lastColumn).getValues();
  const header = values[0].map(function (value) { return String(value || '').trim(); });
  const hasPrefix = MATCH_HEADER_PREFIX.every(function (name, index) { return header[index] === name; });
  const csvColumns = hasPrefix ? header.slice(MATCH_HEADER_PREFIX.length) : header;
  const csvStart = hasPrefix ? MATCH_HEADER_PREFIX.length : 0;
  const records = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const csvRow = values[rowIndex].slice(csvStart);
    if (getRecordKind(csvRow) !== '試合結果') continue;
    records.push({
      record_id: hasPrefix ? String(values[rowIndex][4] || '') : '',
      csv_row: csvRow
    });
  }
  return appendSeriesResultRows(seriesResultSheet, records, csvColumns);
}

function archiveLegacySheet(ss, activeName, archiveName, activeHeaderWidth) {
  // 既存シートを勝手にarchive化・コピー・削除・リネームしません。
  // archive系シートへの書き込みは、新規送信データの追記だけで行います。
  return;
}

function mergeSheetRowsIntoArchive(sourceSheet, archiveSheet) {
  const lastRow = sourceSheet.getLastRow();
  const lastColumn = sourceSheet.getLastColumn();
  if (lastRow < 1 || lastColumn < 1) return;
  const values = sourceSheet.getRange(1, 1, lastRow, lastColumn).getValues();
  if (values.length < 2) return;
  const header = values[0].map(function (value) { return String(value || ''); });
  ensureExactHeader(archiveSheet, header);
  const existingKeys = readArchiveRowKeys(archiveSheet, header.length);
  const rows = [];
  for (let rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
    const row = normalizeRow(values[rowIndex], header.length);
    if (!row.some(function (value) { return String(value || '').trim() !== ''; })) continue;
    const key = row.map(normalizeKeyValue).join('|');
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    rows.push(row);
  }
  if (rows.length) {
    archiveSheet.getRange(archiveSheet.getLastRow() + 1, 1, rows.length, header.length).setValues(rows);
  }
}

function readArchiveRowKeys(sheet, width) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();
  const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  return new Set(values.map(function (row) {
    return normalizeRow(row, width).map(normalizeKeyValue).join('|');
  }).filter(Boolean));
}

function headerIndexMap(header) {
  const index = {};
  header.forEach(function (name, columnIndex) {
    if (name && index[name] == null) index[name] = columnIndex;
  });
  return index;
}

function collectGroupTeamRows(values) {
  const rowsByTeam = {};
  for (let rowIndex = 0; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex] || [];
    const resultFlag = String(row[0] || '').trim();
    const number = String(row[1] || '').trim();
    const teamName = String(row[2] || '').trim();
    // A列が ok/no の本表だけを更新します。下部の順位抽出エリアは数式の展開先なので直接書き込みません。
    if (resultFlag !== 'ok' && resultFlag !== 'no') continue;
    if (!number || !teamName || teamName === 'チーム名') continue;
    if (!rowsByTeam[teamName]) rowsByTeam[teamName] = [];
    rowsByTeam[teamName].push(rowIndex + 1);
  }
  return rowsByTeam;
}

function uniqueRowsFromTeamRows(teamRows) {
  const seen = {};
  const rows = [];
  Object.keys(teamRows).forEach(function (teamName) {
    teamRows[teamName].forEach(function (rowNumber) {
      if (seen[rowNumber]) return;
      seen[rowNumber] = true;
      rows.push(rowNumber);
    });
  });
  return rows;
}

function clearGroupResultCells(sheet, rowNumbers) {
  // 現場で手動修正された値を消さないため、この関数は no-op にします。
  return;
}

function installGroupResultFormulas(sheet, rowNumbers, forceFormula) {
  rowNumbers.forEach(function (rowNumber) {
    const range = sheet.getRange(rowNumber, 5, 1, 16);
    const currentValues = range.getValues()[0];
    const currentFormulas = range.getFormulas()[0];
    const formulaRow = buildGroupResultFormulaRow(rowNumber);
    formulaRow.forEach(function (formula, columnIndex) {
      const currentValue = currentValues[columnIndex];
      const currentFormula = currentFormulas[columnIndex];
      // 空欄または既存の参照数式だけを更新します。手入力値は現場修正として保持します。
      if (currentFormula || currentValue === '' || currentValue == null) {
        sheet.getRange(rowNumber, 5 + columnIndex).setFormula(formula);
      }
    });
  });
}

function buildGroupResultFormulaRow(rowNumber) {
  const teamCell = '$C' + rowNumber;
  const sourceTeam = seriesResultFormulaColumn('チーム名');
  const columns = {
    points: seriesResultFormulaColumn('勝ち点'),
    violations: seriesResultFormulaColumn('違反数'),
    score: seriesResultFormulaColumn('得点'),
    purple: seriesResultFormulaColumn('紫')
  };
  const formulas = [];
  for (let gameIndex = 1; gameIndex <= 3; gameIndex += 1) {
    formulas.push(
      groupResultIndexFormula(columns.points, sourceTeam, teamCell, gameIndex),
      groupResultIndexFormula(columns.violations, sourceTeam, teamCell, gameIndex),
      groupResultIndexFormula(columns.score, sourceTeam, teamCell, gameIndex),
      groupResultIndexFormula(columns.purple, sourceTeam, teamCell, gameIndex)
    );
  }
  formulas.push(
    '=IF(COUNT(E' + rowNumber + ':P' + rowNumber + ')=0,"",SUM(E' + rowNumber + ',I' + rowNumber + ',M' + rowNumber + '))',
    '=IF(COUNT(E' + rowNumber + ':P' + rowNumber + ')=0,"",SUM(F' + rowNumber + ',J' + rowNumber + ',N' + rowNumber + '))',
    '=IF(COUNT(E' + rowNumber + ':P' + rowNumber + ')=0,"",SUM(G' + rowNumber + ',K' + rowNumber + ',O' + rowNumber + '))',
    '=IF(COUNT(E' + rowNumber + ':P' + rowNumber + ')=0,"",SUM(H' + rowNumber + ',L' + rowNumber + ',P' + rowNumber + '))'
  );
  return formulas;
}

function seriesResultFormulaColumn(headerName) {
  return 'INDEX(\'' + SERIES_RESULT_SHEET_NAME + '\'!$A:$ZZ,,MATCH("' + headerName + '",\'' + SERIES_RESULT_SHEET_NAME + '\'!$1:$1,0))';
}

function groupResultIndexFormula(valueRange, teamRange, teamCell, gameIndex) {
  return '=IFERROR(INDEX(FILTER(' + valueRange + ',' + teamRange + '=' + teamCell + '),' + gameIndex + '),"")';
}

function addGroupGame(teamStats, teamName, game) {
  if (!teamStats[teamName]) teamStats[teamName] = { games: [] };
  teamStats[teamName].games.push(game);
}

function buildGroupResultRow(games) {
  const output = [];
  const totals = { points: 0, violations: 0, score: 0, purple: 0 };
  for (let i = 0; i < 3; i += 1) {
    const game = games[i];
    if (game) {
      output.push(game.points, game.violations, game.score, game.purple);
      totals.points += game.points;
      totals.violations += game.violations;
      totals.score += game.score;
      totals.purple += game.purple;
    } else {
      output.push('', '', '', '');
    }
  }
  output.push(totals.points, totals.violations, totals.score, totals.purple);
  return output;
}

function toNumber(value) {
  const number = Number(String(value == null ? '' : value).replace(/[^\d.-]/g, ''));
  return isFinite(number) ? number : 0;
}

function appendSeriesResultRows(sheet, records, csvColumns) {
  const filtered = records.filter(function (record) { return getRecordKind(record.csv_row) === '試合結果'; });
  if (!filtered.length) return { appended: 0, duplicates: 0 };
  ensureSeriesResultHeader(sheet);
  const existingKeys = readSeriesResultKeys(sheet);
  const csvIndex = headerIndexMap(csvColumns.map(function (value) { return String(value || '').trim(); }));
  const rows = [];
  let appended = 0;
  let duplicates = 0;

  filtered.forEach(function (record) {
    const row = record.csv_row || [];
    const value = function (name) {
      const index = csvIndex[name];
      return index == null ? '' : row[index];
    };
    const teamA = String(value('チームA') || '').trim();
    const teamB = String(value('チームB') || '').trim();
    if (!teamA || !teamB) return;
    const aWins = toNumber(value('チームA勝数'));
    const bWins = toNumber(value('チームB勝数'));
    const resultSide = seriesResultWinnerSide({
      matchType: value('種別'),
      overallWinner: value('総合勝者'),
      teamA: teamA,
      teamB: teamB,
      aWins: aWins,
      bWins: bWins,
      aViolations: toNumber(value('チームA違反数')),
      bViolations: toNumber(value('チームB違反数')),
      aScore: toNumber(value('チームA得点')),
      bScore: toNumber(value('チームB得点')),
      aPurple: toNumber(value('チームA紫')),
      bPurple: toNumber(value('チームB紫'))
    });
    const aPoints = resultSide === 'a' ? 3 : resultSide === 'b' ? 0 : 1;
    const bPoints = resultSide === 'b' ? 3 : resultSide === 'a' ? 0 : 1;
    const common = {
      timestamp: value('日時'),
      court: value('コート'),
      matchType: value('種別')
    };
    const teamRows = [
      [common.timestamp, common.court, common.matchType, teamA, teamB, aPoints, toNumber(value('チームA違反数')), toNumber(value('チームA得点')), toNumber(value('チームA紫'))],
      [common.timestamp, common.court, common.matchType, teamB, teamA, bPoints, toNumber(value('チームB違反数')), toNumber(value('チームB得点')), toNumber(value('チームB紫'))]
    ];
    teamRows.forEach(function (newRow) {
      const key = seriesResultKey(newRow);
      if (existingKeys.has(key)) {
        duplicates += 1;
        return;
      }
      existingKeys.add(key);
      rows.push(newRow);
      appended += 1;
    });
  });

  if (rows.length) {
    writeSeriesResultRows(sheet, rows);
  }
  return { appended: appended, duplicates: duplicates };
}

function seriesResultWinnerSide(result) {
  const overallWinner = String(result.overallWinner || '').trim();
  if (overallWinner === result.teamA) return 'a';
  if (overallWinner === result.teamB) return 'b';
  if (overallWinner === '引き分け') return 'draw';
  if (result.aWins !== result.bWins) return result.aWins > result.bWins ? 'a' : 'b';

  const matchType = String(result.matchType || '').trim();
  const usesTieBreak = matchType === '決勝トーナメント' || matchType === '4位決定リーグ' || matchType === '優勝決定リーグ';
  if (!usesTieBreak) return 'draw';
  if (result.aViolations !== result.bViolations) return result.aViolations < result.bViolations ? 'a' : 'b';
  if (result.aScore !== result.bScore) return result.aScore < result.bScore ? 'a' : 'b';
  if (result.aPurple !== result.bPurple) return result.aPurple > result.bPurple ? 'a' : 'b';
  return 'draw';
}

function writeSeriesResultRows(sheet, canonicalRows) {
  const headerMap = ensureSeriesResultHeader(sheet);
  const startRow = nextDataAppendRow(sheet, SERIES_RESULT_HEADER, headerMap);
  SERIES_RESULT_HEADER.forEach(function (headerName, headerIndex) {
    const columnIndex = headerMap[headerName];
    if (columnIndex == null) return;
    if (columnIndex >= SERIES_RESULT_MANAGED_WIDTH) return;
    const values = canonicalRows.map(function (row) { return [row[headerIndex]]; });
    sheet.getRange(startRow, columnIndex + 1, values.length, 1).setValues(values);
  });
}

function nextDataAppendRow(sheet, headers, headerMap) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 2;
  const width = SERIES_RESULT_MANAGED_WIDTH;
  const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  let appendRow = 2;
  values.forEach(function (row, index) {
    const hasValue = headers.some(function (headerName) {
      const columnIndex = headerMap[headerName];
      const value = columnIndex == null ? '' : row[columnIndex];
      return String(value == null ? '' : value).trim() !== '';
    });
    if (hasValue) appendRow = index + 3;
  });
  return appendRow;
}

function readSeriesResultKeys(sheet) {
  const headerMap = ensureSeriesResultHeader(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();
  const width = SERIES_RESULT_MANAGED_WIDTH;
  const values = sheet.getRange(2, 1, lastRow - 1, width).getValues();
  return new Set(values.map(function (row) {
    return seriesResultKey(SERIES_RESULT_HEADER.map(function (headerName) {
      const columnIndex = headerMap[headerName];
      return columnIndex == null ? '' : row[columnIndex];
    }));
  }).filter(Boolean));
}

function maxHeaderColumnIndex(headerMap) {
  return Object.keys(headerMap).reduce(function (max, name) {
    const index = headerMap[name];
    return typeof index === 'number' && index > max ? index : max;
  }, -1);
}

function seriesResultKey(row) {
  const timestamp = String(row[0] || '').trim();
  const teamName = String(row[3] || '').trim();
  const opponent = String(row[4] || '').trim();
  if (!timestamp || !teamName || !opponent) return '';
  return [
    row[0], // 日時
    row[1], // コート
    row[2], // 種別
    row[3], // チーム名
    row[4]  // 対戦相手
  ].map(normalizeKeyValue).join('|');
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
  const existingValues = sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 20), 2).getValues();
  const existingEntries = {};
  existingValues.forEach((row) => {
    const key = String(row[0] || '').trim();
    if (!key || Object.prototype.hasOwnProperty.call(existingEntries, key)) return;
    existingEntries[key] = row[1];
  });
  const template = [
    ['入力項目', '数値'],
    ['固定時間', existingEntries['固定時間'] || ''],
    ['ランダム範囲', existingEntries['ランダム範囲'] || '1:00-2:00'],
    ['ランダム間隔秒数', existingEntries['ランダム間隔秒数'] || existingEntries['ランダム間隔'] || existingEntries.step_seconds || '1'],
    ['', ''],
    ['', ''],
    ['', ''],
    ['', ''],
    ['', ''],
    ['', ''],
    ['', ''],
    ['入力ルール', '時間は4桁の数字で入力します。2分は2:00、1分30秒は1:30です。'],
    ['入力例', '固定時間に2:00を入力すると2分固定。固定時間を空白にするとランダム範囲を使用します。'],
    ['', '全て空白の場合は初期数値が適用されます'],
    ['', ''],
    ['', ''],
    ['【例：試合時間を2分に固定する場合】', ''],
    ['固定時間', '2:00'],
    ['ランダム範囲', ''],
    ['ランダム間隔秒数', ''],
    ['', ''],
    ['【例：試合時間のランダム範囲を1分30秒〜2分で、5秒間隔に指定する場合】', ''],
    ['固定時間', ''],
    ['ランダム範囲', '1:30-2:00'],
    ['ランダム間隔秒数', '5'],
    ['', ''],
    ['【初期数値：ランダム範囲1分〜2分の1秒間隔】', ''],
    ['固定時間', ''],
    ['ランダム範囲', '1:00-2:00'],
    ['ランダム間隔秒数', '1']
  ];
  const width = 2;
  sheet.getRange(1, 2, Math.max(template.length, 30), 1).setNumberFormat('@');
  sheet.getRange(1, 1, template.length, width).setValues(template);
  sheet.getRange(1, 1, 1, width).setFontWeight('bold');
  sheet.getRange(2, 1, 3, 1).setFontWeight('bold');
  sheet.getRange(17, 1, 1, width).setFontWeight('bold');
  sheet.getRange(22, 1, 1, width).setFontWeight('bold');
  sheet.getRange(27, 1, 1, width).setFontWeight('bold');
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
  return appendRows(sheet, filtered, eventName, body, csvColumns, {
    dedupeByResult: recordKind === '試合結果'
  });
}

function getRecordKind(csvRow) {
  return String((csvRow || [])[RECORD_KIND_INDEX] || '');
}

function appendRows(sheet, records, eventName, body, csvColumns, options) {
  if (!records.length) {
    return { appended: 0, duplicates: 0 };
  }
  const settings = options || {};

  const header = csvColumns.length > 0 ? MATCH_HEADER_PREFIX.concat(csvColumns) : MATCH_HEADER_PREFIX.concat(['payload_json']);
  ensureExactHeader(sheet, header);

  const existingIds = readRecordIds(sheet, MATCH_HEADER_PREFIX.length);
  const existingResultKeys = settings.dedupeByResult ? readExistingResultKeys(sheet, csvColumns) : new Set();
  const rows = [];
  let appended = 0;
  let duplicates = 0;
  records.forEach((record) => {
    const recordId = String(record.record_id || '');
    if (recordId && existingIds.has(recordId)) {
      duplicates += 1;
      return;
    }
    const resultKey = settings.dedupeByResult ? resultRecordKey(record.csv_row, csvColumns) : '';
    if (resultKey && existingResultKeys.has(resultKey)) {
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
    if (resultKey) existingResultKeys.add(resultKey);
    appended += 1;
  });

  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, header.length).setValues(rows);
  }

  return { appended, duplicates };
}

function ensureSeriesResultHeader(sheet) {
  const width = SERIES_RESULT_MANAGED_WIDTH;
  const current = sheet.getRange(1, 1, 1, width).getValues()[0];
  const headerMap = {};
  current.forEach(function (value, index) {
    const name = String(value || '').trim();
    if (name && headerMap[name] == null) headerMap[name] = index;
  });

  const missingHeaders = SERIES_RESULT_HEADER.filter(function (name) {
    return headerMap[name] == null;
  });
  if (missingHeaders.length) {
    throw new Error('試合結果シートのA〜Iに必要な列がありません: ' + missingHeaders.join(', '));
  }

  return headerMap;
}

function ensureExactHeader(sheet, header) {
  // 既存のヘッダーや列順を勝手に上書きしません。
  // 空シートの場合だけ初期ヘッダーを作成します。
  const width = header.length;
  const current = sheet.getRange(1, 1, 1, width).getValues()[0];
  const hasAnyHeader = current.some(function (value) {
    return String(value || '').trim() !== '';
  });
  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, width).setValues([header]);
    sheet.getRange(1, 1, 1, width).setFontWeight('bold');
  }
}

function hasExactHeader(sheet, header) {
  const width = header.length;
  if (sheet.getLastColumn() < width) return false;
  const current = sheet.getRange(1, 1, 1, width).getValues()[0];
  return current.length === width && current.every(function (value, index) {
    return String(value || '') === String(header[index] || '');
  });
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

function readExistingResultKeys(sheet, csvColumns) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();
  const values = sheet.getRange(2, MATCH_HEADER_PREFIX.length + 1, lastRow - 1, csvColumns.length).getValues();
  return new Set(values.map(function (row) { return resultRecordKey(row, csvColumns); }).filter(Boolean));
}

function resultRecordKey(csvRow, csvColumns) {
  const index = headerIndexMap(csvColumns.map(function (value) { return String(value || '').trim(); }));
  const value = function (name) {
    const columnIndex = index[name];
    return columnIndex == null ? '' : normalizeKeyValue(csvRow[columnIndex]);
  };
  const kind = value('記録種別');
  if (kind && kind !== '試合結果') return '';
  if (!value('日時') || !value('チームA') || !value('チームB')) return '';
  return [
    value('日時'),
    value('記録種別'),
    value('種別'),
    value('コート'),
    value('試合番号'),
    value('チームA'),
    value('チームB'),
    value('チームA勝数'),
    value('チームA敗数'),
    value('チームAオレンジ'),
    value('チームA紫'),
    value('チームA得点'),
    value('チームA違反数'),
    value('チームB勝数'),
    value('チームB敗数'),
    value('チームBオレンジ'),
    value('チームB紫'),
    value('チームB得点'),
    value('チームB違反数'),
    value('引き分け数'),
    value('総合勝者'),
    value('結果')
  ].join('|');
}

function normalizeKeyValue(value) {
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  return String(value == null ? '' : value).trim();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
