var APP_TITLE = 'WRO 大会編成・進行管理';
var TEAM_SHEET = 'チームリスト';
var RESULT_SHEET = '試合結果';
var PRELIMINARY_RESULT_SHEET = '予選リーグ_結果';
var SETUP_SHEET = '大会編成';
var TIME_ZONE = 'Asia/Tokyo';
var DEFAULT_SPREADSHEET_ID = '185jPLjc-nBri49aOr-CVw1baUI1qaxqjgcWLRS2-oxo';
var GAS_MANAGEMENT_SPREADSHEET_ID = '1PKAZgb8HZFww-P9CZTkzVqleAtIOFgkl8Ngk6lZwcTA';
var GAS_MANAGEMENT_SHEET = 'GAS管理';
var EDITOR_SESSION_TTL_SECONDS = 1800;
var MAX_PAYLOAD_BYTES = 500000;
var MAX_SCHEDULE_ROWS = 1000;
var DEFAULT_TEAMS = ['サクラユリ', 'ハイパーGGG', 'ささみ　にんじん　マヨネーズ', '未来LABO', 'Team S', '榎本と榎本'];
var BRACKET_DEFAULTS = { layoutDirection: 'left-to-right', orientation: 'horizontal', wrapMode: 'auto', fontSize: 21, boxWidth: 160, boxHeight: 170, boxBorderWidth: 3, lineWidth: 3, showMatchId: false, matchInfoFontSize: 12, matchInfoPosition: 'left', bottomUpStyle: 'classic', classicSeedWidth: 112, classicSeedHeight: 320, classicMatchWidth: 154, classicMatchHeight: 88, classicChampionWidth: 980, classicChampionHeight: 110, classicRoundGap: 74, classicBackground: '#cfe8f8' };
var SCHEDULE_DISPLAY_DEFAULTS = {
  fontSize: 18,
  rowPadding: 12,
  columns: {
    phase: { visible: true, fontSize: 18, width: 180 },
    startTime: { visible: true, fontSize: 18, width: 110 },
    endTime: { visible: true, fontSize: 18, width: 110 },
    court: { visible: true, fontSize: 18, width: 110 },
    team1: { visible: true, fontSize: 18, width: 240 },
    team2: { visible: true, fontSize: 18, width: 240 }
  }
};
var RANKING_POLICY_DEFAULTS = {
  preliminary: [{ key: 'points', direction: 'desc' }, { key: 'violations', direction: 'asc' }, { key: 'score', direction: 'asc' }, { key: 'purple', direction: 'desc' }],
  tournament: [{ key: 'points', direction: 'desc' }, { key: 'violations', direction: 'asc' }, { key: 'score', direction: 'asc' }, { key: 'purple', direction: 'desc' }]
};

// メインアプリの管理者アカウントと同じ接続先。別名も同じ大会へまとめる。
var ADMIN_TARGETS = {
  hyogo: { label: 'WRO兵庫', spreadsheetId: '1pxTMvdcpTMFeSfroOeTyh2hziLgfAvLxe0Nh79sMk_0', gasUrl: 'https://script.google.com/macros/s/AKfycbw0wWKqqar4adDt9SXKmQdO82twKvUjomcrfYGvb7_2mi1cP5rVW7QR62Ijuc5uNpJRgQ/exec' },
  mie: { label: 'WRO三重', spreadsheetId: DEFAULT_SPREADSHEET_ID, gasUrl: 'https://script.google.com/macros/s/AKfycbx6OkFR799hYZ3DaYWxfluCTuDKf6sE34HtVuzMHTfJQd5Hs0YcQujZiVxtEOxzvN5-/exec' },
  mie_judge: { alias: 'mie' },
  judge: { label: 'WRO共有確認用', spreadsheetId: '1BTByUtO5IAdwdTYCMNhFUtqeRy2yIWpAnCZRQw_b0HU', gasUrl: 'https://script.google.com/macros/s/AKfycbyniW9kgzwtMI0i5X5ZtDlnqGz1yaeuHnXZZ7s67fIS54tdzg1U__sZUzLDoLqUY8lt/exec' },
  train: { label: '審判練習', spreadsheetId: '1Bh5FpSOjkTRRV9feZ90dLXl86v3UNsG896DfhSPHst0', gasUrl: 'https://script.google.com/macros/s/AKfycbxd1h_jzSECSjtQIxKvoX-joGUEy2yHcJYc2nQ14-YHze9OpqXrfy9JsEg_6gi03KpA/exec' },
  practice: { alias: 'train' },
  rsam: { label: '自分', spreadsheetId: '1PKAZgb8HZFww-P9CZTkzVqleAtIOFgkl8Ngk6lZwcTA', gasUrl: 'https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec' },
  gas: { alias: 'rsam' },
  wrorsam: { alias: 'rsam' },
  shukugawa: { label: '夙川', spreadsheetId: '1tOyTdp7DD1lFZr5XsYnB3Zc4JEM9rGeMoH_6B43Yeg4', gasUrl: 'https://script.google.com/macros/s/AKfycbwZjAa77dzxEWivtFkZIWGzDdhynAFBjmn3zjdte_KO1eDbhLR0xidIv1mNTvCwwLfIzQ/exec' }
};

function doGet(event) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.viewerMode = Boolean(event && event.parameter && event.parameter.viewer);
  template.viewerToken = event && event.parameter ? normalizeValue_(event.parameter.viewer) : '';
  template.viewerSignature = event && event.parameter ? normalizeValue_(event.parameter.sig) : '';
  var output = template.evaluate().setTitle(template.viewerMode ? APP_TITLE + ' 表示専用' : APP_TITLE);
  if (template.viewerMode) output.setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  return output;
}

function include(filename) { return HtmlService.createHtmlOutputFromFile(filename).getContent(); }

function authorizeEditor(editorKey) {
  try {
    var target = resolveAdminTarget_(editorKey);
    var spreadsheet = SpreadsheetApp.openById(target.spreadsheetId);
    var isMaster = normalizeKey_(editorKey) === 'rsam';
    var sessionToken = createEditorSession_(target, isMaster);
    if (isMaster) appendMasterAudit_('ログイン', target.label);
    return { success: true, canEdit: true, editorKeyRequired: true, accountLabel: target.label, spreadsheetName: spreadsheet.getName(), gasUrl: target.gasUrl || '', sessionToken: sessionToken, sessionExpiresIn: EDITOR_SESSION_TTL_SECONDS, message: target.label + 'へ接続しました。' };
  } catch (error) { return createErrorResponse_(error); }
}

function getCompetitionState(editorKey) {
  try {
    return buildCompetitionState_(openContext_(editorKey), false);
  } catch (error) { return createErrorResponse_(error); }
}

function getAllViewerAccess(editorKey) {
  try {
    var context = openContext_(editorKey);
    if (!context.isMaster) throw new Error('全アカウントの表示専用URLはMASTER（rsam）のみ発行できます。');
    var management = SpreadsheetApp.openById(GAS_MANAGEMENT_SPREADSHEET_ID).getSheetByName(GAS_MANAGEMENT_SHEET);
    if (!management || management.getLastRow() < 2) throw new Error('GAS管理からアカウント一覧を取得できません。');
    var values = management.getRange(1, 1, Math.min(management.getLastRow(), 200), management.getLastColumn()).getDisplayValues();
    var headers = createHeaderMap_(values[0].map(normalizeValue_));
    var labelColumn = headers['ユーザー'];
    var spreadsheetColumn = headers['スプレッドシートURL'];
    if (labelColumn === undefined || spreadsheetColumn === undefined) throw new Error('GAS管理のユーザー列またはスプレッドシートURL列を確認してください。');
    var serviceUrl = ScriptApp.getService().getUrl();
    var seen = {};
    var accounts = [];
    for (var index = 1; index < values.length; index += 1) {
      var spreadsheetId = extractSpreadsheetId_(values[index][spreadsheetColumn]);
      if (!spreadsheetId || seen[spreadsheetId]) continue;
      seen[spreadsheetId] = true;
      var target = { label: normalizeValue_(values[index][labelColumn]) || '大会 ' + (accounts.length + 1), spreadsheetId: spreadsheetId };
      var access = createViewerAccess_(target);
      accounts.push({
        label: target.label,
        viewerUrl: serviceUrl + '?viewer=' + encodeURIComponent(access.token) + '&sig=' + encodeURIComponent(access.signature)
      });
    }
    appendMasterAudit_('全アカウント表示URL発行', accounts.length + '件');
    return { success: true, accounts: accounts };
  } catch (error) { return createErrorResponse_(error); }
}

function getMasterAuditLog(editorKey) {
  var context = openContext_(editorKey);
  if (!context.isMaster) throw new Error('MASTER操作履歴はMASTER（rsam）のみ確認できます。');
  var rows;
  try { rows = JSON.parse(PropertiesService.getScriptProperties().getProperty('MASTER_AUDIT_LOG') || '[]'); } catch (error) { rows = []; }
  if (!Array.isArray(rows)) rows = [];
  return { success: true, rows: rows.slice(-100).reverse() };
}

function rotateViewerAccess(editorKey, requestedExpiry) {
  var context = openContext_(editorKey);
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty(viewerRevisionPropertyKey_(context.target.spreadsheetId), Utilities.getUuid());
  writeViewerExpiry_(context.target.spreadsheetId, requestedExpiry);
  clearViewerStateCache_(context.target.spreadsheetId);
  var access = createViewerAccess_(context.target);
  if (context.isMaster) appendMasterAudit_('表示専用URL再発行', context.target.label);
  return { success: true, viewerUrl: ScriptApp.getService().getUrl() + '?viewer=' + encodeURIComponent(access.token) + '&sig=' + encodeURIComponent(access.signature), viewerExpiresAt: readViewerExpiry_(context.target.spreadsheetId) };
}

function getPublicCompetitionState(viewerToken, viewerSignature) {
  try {
    var target = verifyViewerAccess_(viewerToken, viewerSignature);
    var cache = CacheService.getScriptCache();
    var cacheKey = 'viewer-state-' + target.spreadsheetId;
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    var state = buildCompetitionState_({ target: target, spreadsheet: SpreadsheetApp.openById(target.spreadsheetId) }, true);
    try { cache.put(cacheKey, JSON.stringify(state), 2); } catch (cacheError) {}
    return state;
  } catch (error) { return createErrorResponse_(error); }
}

function getPublicCompetitionVersion(viewerToken, viewerSignature) {
  try {
    var target = verifyViewerAccess_(viewerToken, viewerSignature);
    var cache = CacheService.getScriptCache();
    var cacheKey = 'viewer-version-' + target.spreadsheetId;
    var cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
    var spreadsheet = SpreadsheetApp.openById(target.spreadsheetId);
    var sheet = spreadsheet.getSheetByName(SETUP_SHEET);
    if (!sheet) throw new Error('大会編成データがまだ作成されていません。');
    var settings = readSettings_(sheet);
    var freshness = getCompetitionFreshness_(target.spreadsheetId, settings, getResultRows_(spreadsheet));
    var response = { success: true, serverRevision: freshness.revision, updatedAt: freshness.updatedAt };
    try { cache.put(cacheKey, JSON.stringify(response), 2); } catch (cacheError) {}
    return response;
  } catch (error) { return createErrorResponse_(error); }
}

function buildCompetitionState_(context, readOnly) {
    var sheet = readOnly ? context.spreadsheet.getSheetByName(SETUP_SHEET) : ensureCompetitionSheet_(context.spreadsheet);
    if (!sheet) throw new Error('大会編成データがまだ作成されていません。');
    var settings = readSettings_(sheet);
    var spreadsheetCourtCount = getSpreadsheetCourtCount_(context.spreadsheet);
    if (!settings.courtCountManual && spreadsheetCourtCount) settings.courtCount = spreadsheetCourtCount;
    var teamGroupConfiguration = getTeamGroupConfiguration_(context.spreadsheet);
    var groupConfigurationChanged = teamGroupConfiguration.sizes.length && settings.teamGroupConfigSignature !== teamGroupConfiguration.signature;
    if (groupConfigurationChanged) {
      settings.groupSizes = teamGroupConfiguration.sizes;
      settings.groupCount = teamGroupConfiguration.sizes.length;
      settings.teamsPerGroup = Math.max.apply(Math, teamGroupConfiguration.sizes);
      settings.teamGroupConfigSignature = teamGroupConfiguration.signature;
    }
    var teams = getTeams_(context.spreadsheet);
    var groups = readOnly ? getGroupRowsReadOnly_(sheet, settings, teams) : getGroupRows_(sheet, settings, teams);
    var results = getResultRows_(context.spreadsheet);
    var freshness = getCompetitionFreshness_(context.target.spreadsheetId, settings, results);
    var schedule = getScheduleRows_(sheet, results, settings.rankingPolicies.tournament);
    if (groupConfigurationChanged || !schedule.some(function(row) { return /^P-/.test(row.id) || row.phase.indexOf('グループ予選') >= 0; })) {
      schedule = rebuildPreliminarySchedule_(schedule, groups);
    } else {
      schedule = interleaveLegacyPreliminarySchedule_(schedule, groups);
    }
    schedule = assignCourtDefaults_(schedule, settings.courtCount);
    var tournamentParticipants = normalizeTournamentParticipants_(
      settings.tournamentParticipants,
      teams,
      settings.tournamentParticipantCount,
      schedule
    );
    var viewerAccess = readOnly ? null : createViewerAccess_(context.target);
    return {
      success: true,
      accountLabel: context.target.label,
      gasUrl: context.target.gasUrl || '',
      spreadsheetName: context.spreadsheet.getName(),
      spreadsheetUrl: readOnly ? '' : context.spreadsheet.getUrl(),
      viewerUrl: viewerAccess ? ScriptApp.getService().getUrl() + '?viewer=' + encodeURIComponent(viewerAccess.token) + '&sig=' + encodeURIComponent(viewerAccess.signature) : '',
      teams: teams,
      // 表示専用版では編集用の所属・設定列を送らず、読込み量と個人情報露出を抑える。
      teamList: readOnly ? [] : getTeamListRows_(context.spreadsheet),
      groups: groups,
      standings: buildStandings_(groups, results, settings.rankingPolicies.preliminary),
      schedule: schedule,
      groupCount: settings.groupCount,
      teamsPerGroup: settings.teamsPerGroup,
      groupSizes: settings.groupSizes,
      teamGroupConfigSignature: settings.teamGroupConfigSignature,
      tournamentParticipantCount: settings.tournamentParticipantCount,
      qualifiersPerGroup: settings.qualifiersPerGroup,
      tournamentParticipants: tournamentParticipants,
      seedSlots: settings.seedSlots,
      courtCount: settings.courtCount,
      courtCountManual: settings.courtCountManual,
      spreadsheetCourtCount: spreadsheetCourtCount || settings.courtCount,
      rankingPolicies: settings.rankingPolicies,
      thirdPlaceEnabled: settings.thirdPlaceEnabled,
      bracketDisplaySettings: settings.bracketDisplaySettings,
      scheduleDisplaySettings: settings.scheduleDisplaySettings,
      isMaster: Boolean(!readOnly && context.isMaster),
      canEdit: !readOnly,
      viewerMode: Boolean(readOnly),
      editorKeyRequired: !readOnly,
      securityNotice: '',
      updatedAt: freshness.updatedAt,
      serverRevision: freshness.revision,
      viewerExpiresAt: readViewerExpiry_(context.target.spreadsheetId)
    };
}

function saveCompetitionState(payload, editorKey) {
  assertPayload_(payload);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var context = openContext_(editorKey);
    var sheet = ensureCompetitionSheet_(context.spreadsheet);
    var currentSettings = readSettings_(sheet);
    var currentFreshness = getCompetitionFreshness_(context.target.spreadsheetId, currentSettings, getResultRows_(context.spreadsheet));
    var baseRevision = normalizeValue_(payload.baseRevision || payload.serverRevision);
    if (!payload.forceSave && baseRevision && baseRevision !== currentFreshness.revision) {
      return { success: false, conflict: true, message: '別の端末またはメインアプリから新しい変更が届いています。差分を確認してください。', currentState: buildCompetitionState_(context, false) };
    }
    var teams = getTeams_(context.spreadsheet);
    var settings = normalizeSettings_(payload);
    settings.tournamentParticipants = normalizeTournamentParticipants_(settings.tournamentParticipants, teams, settings.tournamentParticipantCount);
    var groups = validateGroups_(payload.groups, teams, settings);
    var schedule = assignCourtDefaults_(validateSchedule_(payload.schedule, teams), settings.courtCount);
    schedule = applySeedSlotsToSchedule_(schedule, settings.seedSlots);
    var backup = createCompetitionBackup_(sheet);
    try {
      writeGroups_(sheet, groups);
      writeSchedule_(sheet, schedule);
      writeSettings_(sheet, settings);
      applyCompetitionFormatting_(sheet, Math.max(groups.length, schedule.length));
      SpreadsheetApp.flush();
    } catch (writeError) {
      try { restoreRangeBackups_(backup); SpreadsheetApp.flush(); }
      catch (restoreError) { throw new Error('大会編成の保存中にエラーが発生し、一部を自動復元できませんでした。大会編成シートを確認してください。'); }
      throw new Error('大会編成の保存中にエラーが発生したため、変更前の状態へ戻しました。');
    }
    clearViewerStateCache_(context.target.spreadsheetId);
    if (context.isMaster) appendMasterAudit_('大会編成を保存', context.target.label);
    return getCompetitionState(editorKey);
  } finally { lock.releaseLock(); }
}

function randomizeGroups(editorKey, requestedTeams, requestedSettings) {
  var state = getCompetitionState(editorKey);
  if (!state.success) return state;
  var settings = normalizeSettings_(requestedSettings || state);
  var allowed = state.teams.map(normalizeValue_);
  var participants = uniqueNonEmpty_((requestedTeams || []).map(normalizeValue_)).filter(function(team) { return allowed.indexOf(team) >= 0; });
  var requestedSlotCount = sum_(settings.groupSizes);
  allowed.forEach(function(team) {
    if (participants.length < requestedSlotCount && participants.indexOf(team) < 0) participants.push(team);
  });
  participants = participants.slice(0, requestedSlotCount);
  if (participants.length > requestedSlotCount) throw new Error('グループ枠数より参加チーム数が多くなっています。');
  participants = shuffle_(participants);
  state.groupCount = settings.groupCount;
  state.teamsPerGroup = settings.teamsPerGroup;
  state.groupSizes = settings.groupSizes;
  state.teamGroupConfigSignature = settings.teamGroupConfigSignature;
  state.courtCount = settings.courtCount;
  state.courtCountManual = settings.courtCountManual;
  state.groups = createGroupRows_(settings, participants);
  state.schedule = rebuildPreliminarySchedule_(state.schedule, state.groups);
  return saveCompetitionState(state, editorKey);
}

function syncGroupsToPreliminaryResult(editorKey, competitionPayload) {
  assertPayload_(competitionPayload);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var context = openContext_(editorKey);
    var targetSheet = context.spreadsheet.getSheetByName(PRELIMINARY_RESULT_SHEET);
    if (!targetSheet) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」シートがないため反映できません。シートは自動作成・変更しません。');
    var teams = getTeams_(context.spreadsheet);
    var settings = normalizeSettings_(competitionPayload);
    var groups = validateGroups_(competitionPayload.groups, teams, settings);
    if (!groups.some(function(row) { return Boolean(row.team); })) throw new Error('反映するチームがありません。先にランダム組み分けを実行してください。');
    var plan = createPreliminaryGroupWritePlan_(targetSheet, groups);
    var backups = plan.writes.map(function(write) {
      var range = targetSheet.getRange(write.row, write.column, write.values.length, write.values[0].length);
      var values = range.getValues();
      var formulas = range.getFormulas();
      return {
        range: range,
        values: values.map(function(row, rowIndex) {
          return row.map(function(value, columnIndex) { return formulas[rowIndex][columnIndex] || value; });
        })
      };
    });
    var attemptedCount = 0;
    try {
      plan.writes.forEach(function(write, index) {
        attemptedCount = index + 1;
        backups[index].range.setValues(write.values);
      });
      SpreadsheetApp.flush();
    } catch (writeError) {
      var rollbackErrors = [];
      for (var backupIndex = attemptedCount - 1; backupIndex >= 0; backupIndex -= 1) {
        try { backups[backupIndex].range.setValues(backups[backupIndex].values); }
        catch (rollbackError) { rollbackErrors.push(rollbackError); }
      }
      try { SpreadsheetApp.flush(); } catch (rollbackFlushError) { rollbackErrors.push(rollbackFlushError); }
      if (rollbackErrors.length) throw new Error('反映中にエラーが発生し、一部のセルを自動復元できませんでした。「予選リーグ_結果」を確認してください。');
      throw new Error('反映中にエラーが発生したため、変更前の状態へ戻しました。もう一度お試しください。');
    }
    if (context.isMaster) appendMasterAudit_('予選グループ反映', plan.writtenCount + 'チーム');
    return { success: true, writtenCount: plan.writtenCount, message: plan.writtenCount + 'チームのグループ分けを「' + PRELIMINARY_RESULT_SHEET + '」へ反映しました。' };
  } finally { lock.releaseLock(); }
}

function previewGroupsToPreliminaryResult(editorKey, competitionPayload) {
  assertPayload_(competitionPayload);
  var context = openContext_(editorKey);
  var targetSheet = context.spreadsheet.getSheetByName(PRELIMINARY_RESULT_SHEET);
  if (!targetSheet) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」シートがないため反映できません。シートは自動作成・変更しません。');
  var teams = getTeams_(context.spreadsheet);
  var settings = normalizeSettings_(competitionPayload);
  var groups = validateGroups_(competitionPayload.groups, teams, settings);
  if (!groups.some(function(row) { return Boolean(row.team); })) throw new Error('反映するチームがありません。先にランダム組み分けを実行してください。');
  var plan = createPreliminaryGroupWritePlan_(targetSheet, groups);
  return { success: true, sheetName: PRELIMINARY_RESULT_SHEET, spreadsheetName: context.spreadsheet.getName(), writtenCount: plan.writtenCount, items: plan.previewItems };
}

function applyRecommendedBracket(editorKey, requestedCount, requestedThirdPlace) {
  var state = getCompetitionState(editorKey);
  if (!state.success) return state;
  var count = clampInt_(requestedCount || state.tournamentParticipantCount, 2, 64, 4);
  var allRanked = state.standings.filter(function(row) { return row.team; }).sort(function(left, right) {
    return compareOverallStanding_(left, right, state.rankingPolicies && state.rankingPolicies.preliminary);
  });
  var automaticQualifiers = allRanked.filter(function(row) { return row.rank > 0 && row.rank <= Number(state.qualifiersPerGroup || 1); });
  var ranked = automaticQualifiers.slice();
  allRanked.forEach(function(row) { if (ranked.indexOf(row) < 0) ranked.push(row); });
  var participants = ranked.slice(0, count).map(function(row) { return row.team; });
  while (participants.length < count) participants.push('');
  var seeds = participants.map(function(team) { return team || '未定'; });
  var prelim = state.schedule.filter(function(row) { return !isTournamentMatch_(row); });
  state.tournamentParticipantCount = count;
  state.tournamentParticipants = participants;
  state.thirdPlaceEnabled = Boolean(requestedThirdPlace);
  state.schedule = prelim.concat(createTournamentSchedule_(seeds, state.thirdPlaceEnabled));
  state.schedule = applySeedSlotsToSchedule_(state.schedule, state.seedSlots);
  return saveCompetitionState(state, editorKey);
}

function verifySpreadsheetAccess(editorKey) {
  var context = openContext_(editorKey);
  return { success: true, name: context.spreadsheet.getName(), sheet: ensureCompetitionSheet_(context.spreadsheet).getName(), accountLabel: context.target.label };
}

function saveTeamList(editorKey, requestedRows, competitionPayload) {
  if (!Array.isArray(requestedRows) || !requestedRows.length) throw new Error('チームを1件以上入力してください。');
  if (requestedRows.length > 500) throw new Error('チーム数は500件以内にしてください。');
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var context = openContext_(editorKey);
    if (competitionPayload && typeof competitionPayload === 'object') {
      assertPayload_(competitionPayload);
      var existingCompetitionSheet = ensureCompetitionSheet_(context.spreadsheet);
      var currentFreshness = getCompetitionFreshness_(context.target.spreadsheetId, readSettings_(existingCompetitionSheet), getResultRows_(context.spreadsheet));
      var baseRevision = normalizeValue_(competitionPayload.baseRevision || competitionPayload.serverRevision);
      if (!competitionPayload.forceSave && baseRevision && baseRevision !== currentFreshness.revision) {
        return { success: false, conflict: true, message: '別の端末またはメインアプリから新しい変更が届いています。差分を確認してください。', currentState: buildCompetitionState_(context, false) };
      }
    }
    var sheet = context.spreadsheet.getSheetByName(TEAM_SHEET) || context.spreadsheet.getSheetByName('チーム一覧');
    var createdTeamSheet = false;
    var used = {};
    var rows = requestedRows.map(function(row, index) {
      var name = normalizeValue_(row && (row.name !== undefined ? row.name : row.team)).slice(0, 100);
      if (!name) throw new Error((index + 1) + '行目のチーム名を入力してください。');
      if (used[name]) throw new Error('チーム名「' + name + '」が重複しています。');
      used[name] = true;
      var affiliation = normalizeValue_(row.affiliation).slice(0, 100);
      var courtCount = normalizeValue_(row.courtCount);
      if (courtCount) courtCount = String(clampInt_(courtCount, 1, 26, 1));
      var groupConfig = normalizeValue_(row.groupConfig).slice(0, 100);
      return [index + 1, name, affiliation, courtCount, groupConfig];
    });
    if (!sheet) { sheet = context.spreadsheet.insertSheet(TEAM_SHEET); createdTeamSheet = true; }
    var competitionSheet = competitionPayload && typeof competitionPayload === 'object' ? ensureCompetitionSheet_(context.spreadsheet) : null;
    var teamBackup = createdTeamSheet ? [] : [snapshotRange_(sheet.getRange(1, 1, sheet.getMaxRows(), Math.min(5, sheet.getMaxColumns())), true)];
    var competitionBackup = competitionSheet ? createCompetitionBackup_(competitionSheet) : [];
    try {
      ensureRows_(sheet, rows.length + 1);
      if (sheet.getMaxColumns() < 5) sheet.insertColumnsAfter(sheet.getMaxColumns(), 5 - sheet.getMaxColumns());
      sheet.getRange(1, 1, 1, 5).setValues([['チーム数', 'チーム名', '所属', 'コート数', 'グループ']]);
      var clearRows = Math.max(sheet.getMaxRows() - 1, 1);
      sheet.getRange(2, 1, clearRows, 5).clearContent();
      sheet.getRange(2, 1, rows.length, 5).setValues(rows);
      if (competitionSheet) {
      var teams = rows.map(function(row) { return row[1]; });
      var settings = normalizeSettings_(competitionPayload);
      settings.tournamentParticipants = normalizeTournamentParticipants_(settings.tournamentParticipants, teams, settings.tournamentParticipantCount);
      var groups = validateGroups_(competitionPayload.groups, teams, settings);
      var schedule = assignCourtDefaults_(validateSchedule_(competitionPayload.schedule, teams), settings.courtCount);
      schedule = applySeedSlotsToSchedule_(schedule, settings.seedSlots);
      writeGroups_(competitionSheet, groups);
      writeSchedule_(competitionSheet, schedule);
      writeSettings_(competitionSheet, settings);
      applyCompetitionFormatting_(competitionSheet, Math.max(groups.length, schedule.length));
      }
      SpreadsheetApp.flush();
    } catch (writeError) {
      try {
        if (createdTeamSheet) context.spreadsheet.deleteSheet(sheet); else restoreRangeBackups_(teamBackup);
        restoreRangeBackups_(competitionBackup);
        SpreadsheetApp.flush();
      } catch (restoreError) { throw new Error('チームリストの保存中にエラーが発生し、一部を自動復元できませんでした。スプレッドシートを確認してください。'); }
      throw new Error('チームリストの保存中にエラーが発生したため、変更前の状態へ戻しました。');
    }
    clearViewerStateCache_(context.target.spreadsheetId);
    if (context.isMaster) appendMasterAudit_('チームリストを反映', rows.length + 'チーム');
    return getCompetitionState(editorKey);
  } finally { lock.releaseLock(); }
}

function resolveAdminTarget_(editorKey) {
  var key = normalizeKey_(editorKey);
  if (!key) throw new Error('管理者パスワードを入力してください。');
  assertLoginAttemptAllowed_(key);
  try {
    var target = resolveAdminTargetUnchecked_(key);
    clearLoginAttempt_(key);
    return target;
  } catch (error) {
    if (String(error && error.message || '').indexOf('管理者パスワード') >= 0) recordFailedLoginAttempt_(key);
    throw error;
  }
}

function resolveAdminTargetUnchecked_(editorKey) {
  var key = normalizeKey_(editorKey);
  if (!key) throw new Error('管理者パスワードを入力してください。');
  var managementReadable = false;
  var managementFailure = null;
  // 管理者アカウントの正本は master スプレッドシートの「GAS管理」。
  // 列名で解決するため、列の並べ替えやアカウント追加も再デプロイなしで反映される。
  try {
    var management = SpreadsheetApp.openById(GAS_MANAGEMENT_SPREADSHEET_ID).getSheetByName(GAS_MANAGEMENT_SHEET);
    if (management && management.getLastRow() >= 2) {
      managementReadable = true;
      var values = management.getRange(1, 1, Math.min(management.getLastRow(), 200), management.getLastColumn()).getDisplayValues();
      var headers = createHeaderMap_(values[0].map(normalizeValue_));
      var passwordColumn = headers['管理者パスワード'];
      var spreadsheetColumn = headers['スプレッドシートURL'];
      var gasColumn = headers['WebアプリURL'];
      var labelColumn = headers['ユーザー'];
      if (passwordColumn !== undefined && spreadsheetColumn !== undefined) {
        for (var rowIndex = 1; rowIndex < values.length; rowIndex += 1) {
          var passwords = parseAdminPasswords_(values[rowIndex][passwordColumn]);
          if (passwords.indexOf(key) < 0) continue;
          var spreadsheetId = extractSpreadsheetId_(values[rowIndex][spreadsheetColumn]);
          if (!spreadsheetId) throw new Error('GAS管理のスプレッドシートURLを確認してください。');
          return {
            label: normalizeValue_(values[rowIndex][labelColumn]) || '標準の管理設定',
            spreadsheetId: spreadsheetId,
            gasUrl: gasColumn === undefined ? '' : normalizeValue_(values[rowIndex][gasColumn])
          };
        }
      }
    }
  } catch (managementError) {
    managementFailure = managementError;
    // 一時的に正本を読めない場合も、既知の管理者は下の互換マップで接続できる。
  }
  if (managementReadable) {
    if (managementFailure) throw managementFailure;
    throw new Error('管理者パスワードを確認してください。');
  }
  var target = ADMIN_TARGETS[key];
  if (target && target.alias) target = ADMIN_TARGETS[target.alias];
  if (target) return target;
  var props = PropertiesService.getScriptProperties().getProperties();
  var matchedName = Object.keys(props).filter(function(name) { return /^API_KEY/i.test(name) && normalizeKey_(props[name]) === key; })[0];
  if (matchedName) {
    var suffix = matchedName.replace(/^API_KEY_?/i, '');
    var spreadsheetId = props['SPREADSHEET_ID_' + suffix] || props.SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
    return { label: suffix || '標準の管理設定', spreadsheetId: spreadsheetId, gasUrl: props['GAS_URL_' + suffix] || '' };
  }
  if (key && normalizeKey_(props.MANAGEMENT_KEY) === key) {
    return { label: '標準の管理設定', spreadsheetId: props.SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID, gasUrl: props.GAS_URL || '' };
  }
  throw new Error('管理者パスワードを確認してください。');
}

function loginAttemptCacheKey_(key) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key, Utilities.Charset.UTF_8);
  return 'login-attempt-' + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, '').slice(0, 32);
}

function readLoginAttempt_(key) {
  try { return JSON.parse(CacheService.getScriptCache().get(loginAttemptCacheKey_(key)) || '{}'); }
  catch (error) { return {}; }
}

function assertLoginAttemptAllowed_(key) {
  var state = readLoginAttempt_(key);
  var waitMs = Number(state.blockedUntil || 0) - Date.now();
  if (waitMs > 0) throw new Error('ログイン試行が続いたため一時停止しています。' + Math.ceil(waitMs / 1000) + '秒後にもう一度お試しください。');
}

function recordFailedLoginAttempt_(key) {
  var state = readLoginAttempt_(key);
  var count = Math.max(0, Number(state.count) || 0) + 1;
  var waitSeconds = count >= 5 ? Math.min(300, 30 * Math.pow(2, count - 5)) : 0;
  CacheService.getScriptCache().put(loginAttemptCacheKey_(key), JSON.stringify({ count: count, blockedUntil: waitSeconds ? Date.now() + waitSeconds * 1000 : 0 }), 600);
}

function clearLoginAttempt_(key) {
  try { CacheService.getScriptCache().remove(loginAttemptCacheKey_(key)); } catch (error) {}
}

function createEditorSession_(target, isMaster) {
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var payload = { label: target.label, spreadsheetId: target.spreadsheetId, gasUrl: target.gasUrl || '', isMaster: Boolean(isMaster), issuedAt: Date.now() };
  CacheService.getScriptCache().put('editor-session-' + token, JSON.stringify(payload), EDITOR_SESSION_TTL_SECONDS);
  return token;
}

function readEditorSession_(token) {
  token = normalizeValue_(token);
  if (!/^[a-f0-9]{64}$/i.test(token)) throw new Error('編集セッションを確認できません。もう一度ログインしてください。');
  var cache = CacheService.getScriptCache();
  var key = 'editor-session-' + token;
  var raw = cache.get(key);
  if (!raw) throw new Error('編集セッションの有効期限が切れました。もう一度ログインしてください。');
  var session;
  try { session = JSON.parse(raw); } catch (error) { throw new Error('編集セッションを確認できません。もう一度ログインしてください。'); }
  if (!session || !session.spreadsheetId) throw new Error('編集セッションを確認できません。もう一度ログインしてください。');
  cache.put(key, JSON.stringify(session), EDITOR_SESSION_TTL_SECONDS);
  return session;
}

function appendMasterAudit_(action, detail) {
  var lock = LockService.getScriptLock();
  var alreadyLocked = lock.hasLock();
  try {
    if (!alreadyLocked && !lock.tryLock(3000)) return;
    var properties = PropertiesService.getScriptProperties();
    var rows;
    try { rows = JSON.parse(properties.getProperty('MASTER_AUDIT_LOG') || '[]'); } catch (error) { rows = []; }
    if (!Array.isArray(rows)) rows = [];
    rows.push({ at: Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy/MM/dd HH:mm:ss'), action: normalizeValue_(action).slice(0, 80), detail: normalizeValue_(detail).slice(0, 160) });
    properties.setProperty('MASTER_AUDIT_LOG', JSON.stringify(rows.slice(-200)));
  } catch (error) {}
  finally { if (!alreadyLocked && lock.hasLock()) lock.releaseLock(); }
}

function resolveViewerTarget_(viewerAccount) {
  var requested = normalizeKey_(viewerAccount);
  if (!requested) throw new Error('表示する大会アカウントが指定されていません。');
  var management = SpreadsheetApp.openById(GAS_MANAGEMENT_SPREADSHEET_ID).getSheetByName(GAS_MANAGEMENT_SHEET);
  if (management && management.getLastRow() >= 2) {
    var values = management.getRange(1, 1, Math.min(management.getLastRow(), 200), management.getLastColumn()).getDisplayValues();
    var headers = createHeaderMap_(values[0].map(normalizeValue_));
    var labelColumn = headers['ユーザー'];
    var spreadsheetColumn = headers['スプレッドシートURL'];
    var gasColumn = headers['WebアプリURL'];
    if (labelColumn !== undefined && spreadsheetColumn !== undefined) {
      for (var index = 1; index < values.length; index += 1) {
        var label = normalizeValue_(values[index][labelColumn]);
        var spreadsheetId = extractSpreadsheetId_(values[index][spreadsheetColumn]);
        if (!spreadsheetId || (normalizeKey_(label) !== requested && normalizeKey_(spreadsheetId) !== requested)) continue;
        return { label: label || '大会', spreadsheetId: spreadsheetId, gasUrl: gasColumn === undefined ? '' : normalizeValue_(values[index][gasColumn]) };
      }
    }
  }
  var fallback = null;
  Object.keys(ADMIN_TARGETS).some(function(key) {
    var target = ADMIN_TARGETS[key];
    if (target.alias) target = ADMIN_TARGETS[target.alias];
    if (target && normalizeKey_(target.label) === requested) { fallback = target; return true; }
    return false;
  });
  if (fallback) return fallback;
  throw new Error('表示用アカウントを確認できませんでした。');
}

function getViewerSigningSecret_(allowCreate) {
  var properties = PropertiesService.getScriptProperties();
  var secret = normalizeValue_(properties.getProperty('VIEWER_SIGNING_SECRET'));
  if (!secret && allowCreate) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    properties.setProperty('VIEWER_SIGNING_SECRET', secret);
  }
  if (!secret) throw new Error('表示専用URLをまだ発行できません。管理者版を一度開いてください。');
  return secret;
}

function signViewerToken_(token, allowCreate) {
  var bytes = Utilities.computeHmacSha256Signature(token, getViewerSigningSecret_(allowCreate), Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
}

function createViewerAccess_(target) {
  var expiresAt = readViewerExpiry_(target.spreadsheetId);
  var payload = JSON.stringify({ spreadsheetId: target.spreadsheetId, label: target.label, revision: getViewerRevision_(target.spreadsheetId, true), expiresAt: expiresAt || '' });
  var token = Utilities.base64EncodeWebSafe(payload, Utilities.Charset.UTF_8).replace(/=+$/, '');
  return { token: token, signature: signViewerToken_(token, true) };
}

function verifyViewerAccess_(token, signature) {
  token = normalizeValue_(token); signature = normalizeValue_(signature);
  if (!token || !signature || signViewerToken_(token, false) !== signature) throw new Error('この表示専用URLは無効です。大会管理者から最新のURLまたはQRコードを受け取ってください。');
  var payload;
  try { payload = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(token)).getDataAsString('UTF-8')); }
  catch (error) { throw new Error('表示専用URLを確認できません。'); }
  var spreadsheetId = normalizeValue_(payload.spreadsheetId);
  var label = normalizeValue_(payload.label);
  if (!spreadsheetId || !label || !/^[a-zA-Z0-9_-]{20,}$/.test(spreadsheetId)) throw new Error('表示専用URLの大会アカウントを確認できません。');
  var requestedRevision = normalizeValue_(payload.revision) || '1';
  var currentRevision = getViewerRevision_(spreadsheetId, false) || '1';
  if (requestedRevision !== currentRevision) throw new Error('この表示専用URLは無効化されています。大会管理者から最新のURLまたはQRコードを受け取ってください。');
  var expiresAt = normalizeValue_(payload.expiresAt);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) throw new Error('この表示専用URLは有効期限が切れています。大会管理者から最新のURLまたはQRコードを受け取ってください。');
  return { spreadsheetId: spreadsheetId, label: label, gasUrl: '' };
}

function viewerRevisionPropertyKey_(spreadsheetId) { return 'VIEWER_REVISION_' + normalizeValue_(spreadsheetId); }

function getViewerRevision_(spreadsheetId, allowCreate) {
  var properties = PropertiesService.getScriptProperties();
  var key = viewerRevisionPropertyKey_(spreadsheetId);
  var revision = normalizeValue_(properties.getProperty(key));
  if (!revision && allowCreate) {
    revision = '1';
    properties.setProperty(key, revision);
  }
  return revision;
}

function viewerExpiryPropertyKey_(spreadsheetId) { return 'VIEWER_EXPIRES_AT_' + normalizeValue_(spreadsheetId); }
function readViewerExpiry_(spreadsheetId) { return normalizeValue_(PropertiesService.getScriptProperties().getProperty(viewerExpiryPropertyKey_(spreadsheetId))); }
function writeViewerExpiry_(spreadsheetId, requestedExpiry) {
  var value = normalizeValue_(requestedExpiry);
  var key = viewerExpiryPropertyKey_(spreadsheetId);
  var properties = PropertiesService.getScriptProperties();
  if (!value) { properties.deleteProperty(key); return; }
  var timestamp = Date.parse(value);
  if (!isFinite(timestamp) || timestamp <= Date.now()) throw new Error('表示専用URLの有効期限は明日以降を指定してください。');
  properties.setProperty(key, new Date(timestamp).toISOString());
}

function clearViewerStateCache_(spreadsheetId) {
  try {
    var cache = CacheService.getScriptCache();
    var suffix = normalizeValue_(spreadsheetId);
    cache.remove('viewer-state-' + suffix);
    cache.remove('viewer-version-' + suffix);
  } catch (error) {}
}

function parseAdminPasswords_(value) {
  return uniqueNonEmpty_(String(value || '')
    .replace(/[「」『』【】\[\]"']/g, ' ')
    .split(/[\s,、/／]+/)
    .map(normalizeKey_));
}

function extractSpreadsheetId_(value) {
  var text = normalizeValue_(value);
  var match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return /^[a-zA-Z0-9_-]{20,}$/.test(text) ? text : '';
}

function openContext_(editorKey) {
  var session = readEditorSession_(editorKey);
  var target = { label: normalizeValue_(session.label) || '大会', spreadsheetId: normalizeValue_(session.spreadsheetId), gasUrl: normalizeValue_(session.gasUrl) };
  return { target: target, spreadsheet: SpreadsheetApp.openById(target.spreadsheetId), isMaster: Boolean(session.isMaster) };
}

function ensureCompetitionSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SETUP_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(SETUP_SHEET);
  if (sheet.getMaxColumns() < 20) sheet.insertColumnsAfter(sheet.getMaxColumns(), 20 - sheet.getMaxColumns());
  if (sheet.getMaxRows() < 40) sheet.insertRowsAfter(sheet.getMaxRows(), 40 - sheet.getMaxRows());
  if (!normalizeValue_(sheet.getRange('A1').getDisplayValue())) initializeCompetitionSheet_(sheet, getTeams_(spreadsheet));
  if (!normalizeValue_(sheet.getRange('S2').getDisplayValue())) sheet.getRange('S1:S2').setValues([['コート割当'], ['コート']]);
  if (!normalizeValue_(sheet.getRange('T2').getDisplayValue())) sheet.getRange('T1:T2').setValues([['運営時間'], ['終了時間']]);
  return sheet;
}

function initializeCompetitionSheet_(sheet, teams) {
  var settings = normalizeSettings_({ groupCount: 2, teamsPerGroup: 3, tournamentParticipantCount: Math.min(6, Math.max(4, teams.length)) });
  var groups = createGroupRows_(settings, teams.slice(0, sum_(settings.groupSizes)));
  sheet.getRange('A1:I1').merge().setValue('グループ編成・予選順位');
  sheet.getRange('A2:I2').setValues([['識別ID', 'グループ', 'チーム名', '勝ち点', '違反数', '得点', '紫', '順位', '区分']]);
  sheet.getRange('J1:P1').merge().setValue('タイムスケジュール・トーナメント');
  sheet.getRange('J2:P2').setValues([['試合ID', '区分', '開始時間', 'チーム1', 'チーム2', '勝者', 'メモ']]);
  sheet.getRange('S1:S2').setValues([['コート割当'], ['コート']]);
  sheet.getRange('T1:T2').setValues([['運営時間'], ['終了時間']]);
  writeGroups_(sheet, groups);
  var schedule = [createInitialAdjustmentRow_()].concat(rebuildPreliminarySchedule_([], groups)).concat(createTournamentSchedule_(groups.map(function(row) { return row.team; }).filter(Boolean).slice(0, settings.tournamentParticipantCount), false));
  writeSchedule_(sheet, schedule);
  writeSettings_(sheet, settings);
  applyCompetitionFormatting_(sheet, Math.max(groups.length, schedule.length));
}

function readSettings_(sheet) {
  var values = sheet.getRange(1, 17, 16, 2).getDisplayValues();
  var raw = {};
  values.forEach(function(row) { if (row[0]) raw[row[0]] = row[1]; });
  var display;
  try { display = JSON.parse(raw.bracketDisplaySettings || '{}'); } catch (error) { display = {}; }
  var scheduleDisplay;
  try { scheduleDisplay = JSON.parse(raw.scheduleDisplaySettings || '{}'); } catch (scheduleDisplayError) { scheduleDisplay = {}; }
  var groupSizes;
  try { groupSizes = JSON.parse(raw.groupSizes || '[]'); } catch (groupError) { groupSizes = []; }
  var tournamentParticipants;
  try { tournamentParticipants = JSON.parse(raw.tournamentParticipants || '[]'); } catch (participantError) { tournamentParticipants = []; }
  var rankingPolicies;
  try { rankingPolicies = JSON.parse(raw.rankingPolicies || '{}'); } catch (rankingError) { rankingPolicies = {}; }
  var seedSlots;
  try { seedSlots = JSON.parse(raw.seedSlots || '[]'); } catch (seedError) { seedSlots = []; }
  return normalizeSettings_({
    groupCount: raw.groupCount || inferGroupCount_(sheet),
    teamsPerGroup: raw.teamsPerGroup || inferTeamsPerGroup_(sheet),
    groupSizes: groupSizes,
    groupSlotCapacity: raw.groupSlotCapacity,
    teamGroupConfigSignature: raw.teamGroupConfigSignature,
    tournamentParticipantCount: raw.tournamentParticipantCount || 4,
    qualifiersPerGroup: raw.qualifiersPerGroup || 1,
    tournamentParticipants: tournamentParticipants,
    seedSlots: seedSlots,
    courtCount: raw.courtCount || 1,
    courtCountManual: String(raw.courtCountManual).toLowerCase() === 'true',
    rankingPolicies: rankingPolicies,
    thirdPlaceEnabled: String(raw.thirdPlaceEnabled).toLowerCase() === 'true',
    bracketDisplaySettings: display,
    scheduleDisplaySettings: scheduleDisplay,
    updatedAt: raw.updatedAt
  });
}

function writeSettings_(sheet, settings) {
  settings.updatedAt = Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy/MM/dd HH:mm:ss');
  var values = [
    ['groupCount', settings.groupCount],
    ['teamsPerGroup', settings.teamsPerGroup],
    ['groupSizes', JSON.stringify(settings.groupSizes)],
    ['groupSlotCapacity', sum_(settings.groupSizes)],
    ['teamGroupConfigSignature', settings.teamGroupConfigSignature || ''],
    ['tournamentParticipantCount', settings.tournamentParticipantCount],
    ['qualifiersPerGroup', settings.qualifiersPerGroup],
    ['tournamentParticipants', JSON.stringify(settings.tournamentParticipants || [])],
    ['courtCount', settings.courtCount],
    ['courtCountManual', settings.courtCountManual ? 'true' : 'false'],
    ['rankingPolicies', JSON.stringify(settings.rankingPolicies)],
    ['thirdPlaceEnabled', settings.thirdPlaceEnabled ? 'true' : 'false'],
    ['bracketDisplaySettings', JSON.stringify(settings.bracketDisplaySettings)],
    ['scheduleDisplaySettings', JSON.stringify(settings.scheduleDisplaySettings)],
    ['seedSlots', JSON.stringify(settings.seedSlots || [])],
    ['updatedAt', settings.updatedAt]
  ];
  sheet.getRange(1, 17, 16, 2).clearContent();
  sheet.getRange(1, 17, values.length, 2).setValues(values);
}

function normalizeSettings_(value) {
  value = value || {};
  var groupCount = clampInt_(value.groupCount, 1, 16, 2);
  var teamsPerGroup = clampInt_(value.teamsPerGroup, 1, 32, 3);
  var groupSizes = Array.isArray(value.groupSizes) && value.groupSizes.length
    ? value.groupSizes.slice(0, 16).map(function(size) { return clampInt_(size, 1, 32, teamsPerGroup); })
    : Array.apply(null, Array(groupCount)).map(function() { return teamsPerGroup; });
  var tournamentParticipantCount = clampInt_(value.tournamentParticipantCount, 2, 64, 4);
  var tournamentParticipants = Array.isArray(value.tournamentParticipants) ? value.tournamentParticipants.slice(0, tournamentParticipantCount).map(normalizeValue_) : [];
  while (tournamentParticipants.length < tournamentParticipantCount) tournamentParticipants.push('');
  return {
    groupCount: groupSizes.length,
    teamsPerGroup: Math.max.apply(Math, groupSizes),
    groupSizes: groupSizes,
    groupSlotCapacity: clampInt_(value.groupSlotCapacity, 0, 512, 0),
    teamGroupConfigSignature: normalizeValue_(value.teamGroupConfigSignature),
    tournamentParticipantCount: tournamentParticipantCount,
    qualifiersPerGroup: clampInt_(value.qualifiersPerGroup, 1, 32, 1),
    tournamentParticipants: tournamentParticipants,
    seedSlots: normalizeSeedSlots_(value.seedSlots),
    courtCount: clampInt_(value.courtCount, 1, 26, 1),
    courtCountManual: Boolean(value.courtCountManual),
    rankingPolicies: normalizeRankingPolicies_(value.rankingPolicies),
    thirdPlaceEnabled: Boolean(value.thirdPlaceEnabled),
    bracketDisplaySettings: normalizeBracketDisplaySettings_(value.bracketDisplaySettings),
    scheduleDisplaySettings: normalizeScheduleDisplaySettings_(value.scheduleDisplaySettings),
    updatedAt: normalizeValue_(value.updatedAt)
  };
}

function normalizeSeedSlots_(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 32).map(function(slot, index) {
    slot = slot && typeof slot === 'object' ? slot : {};
    return {
      id: normalizeValue_(slot.id) || 'SEED-' + (index + 1),
      participant: normalizeValue_(slot.participant).slice(0, 100),
      targetMatchId: normalizeValue_(slot.targetMatchId).slice(0, 30),
      targetSide: slot.targetSide === 'team2' ? 'team2' : 'team1'
    };
  });
}

function applySeedSlotsToSchedule_(schedule, seedSlots) {
  var targets = {};
  (seedSlots || []).forEach(function(slot) {
    if (!slot.participant || !slot.targetMatchId) return;
    var key = slot.targetMatchId + ':' + slot.targetSide;
    if (targets[key]) throw new Error('シード枠の合流先「' + key + '」が重複しています。');
    targets[key] = true;
    var match = (schedule || []).filter(function(row) { return row.id === slot.targetMatchId; })[0];
    if (!match) throw new Error('シード枠の合流先「' + slot.targetMatchId + '」が見つかりません。');
    match[slot.targetSide] = slot.participant;
    match.winnerOverride = '';
    match.winner = '';
  });
  return schedule;
}

function normalizeScheduleDisplaySettings_(value) {
  value = value && typeof value === 'object' ? value : {};
  var requestedColumns = value.columns && typeof value.columns === 'object' ? value.columns : {};
  var columns = {};
  Object.keys(SCHEDULE_DISPLAY_DEFAULTS.columns).forEach(function(key) {
    var fallback = SCHEDULE_DISPLAY_DEFAULTS.columns[key];
    var requested = requestedColumns[key] && typeof requestedColumns[key] === 'object' ? requestedColumns[key] : {};
    columns[key] = {
      visible: requested.visible === undefined ? fallback.visible : Boolean(requested.visible),
      fontSize: clampInt_(requested.fontSize, 10, 40, fallback.fontSize),
      width: clampInt_(requested.width, 70, 500, fallback.width)
    };
  });
  if (!Object.keys(columns).some(function(key) { return columns[key].visible; })) columns.phase.visible = true;
  return {
    fontSize: clampInt_(value.fontSize, 10, 40, SCHEDULE_DISPLAY_DEFAULTS.fontSize),
    rowPadding: clampInt_(value.rowPadding, 2, 40, SCHEDULE_DISPLAY_DEFAULTS.rowPadding),
    columns: columns
  };
}

function normalizeTournamentParticipants_(requested, allowedTeams, count, schedule) {
  var allowed = (allowedTeams || []).map(normalizeValue_);
  var values = Array.isArray(requested) ? requested.map(normalizeValue_) : [];
  if (!values.some(Boolean) && Array.isArray(schedule)) {
    values = [];
    schedule.filter(isTournamentMatch_).forEach(function(match) {
      [match.team1, match.team2].forEach(function(team) {
        team = normalizeValue_(team);
        if (allowed.indexOf(team) >= 0 && values.indexOf(team) < 0) values.push(team);
      });
    });
  }
  var used = {};
  var strict = !Array.isArray(schedule);
  values = values.slice(0, count).map(function(team) {
    if (!team) return '';
    var isGroupRank = /^[A-Z]+グループ\d+位$/.test(team);
    if (allowed.indexOf(team) < 0 && !isGroupRank) {
      if (strict) throw new Error('トーナメント参加チーム「' + team + '」はチームリストにありません。');
      return '';
    }
    if (used[team]) {
      if (strict) throw new Error('同じチームをトーナメント参加枠へ複数設定できません。');
      return '';
    }
    used[team] = true;
    return team;
  });
  while (values.length < count) values.push('');
  return values;
}

function normalizeRankingPolicy_(policy, fallback) {
  var allowed = ['points', 'score', 'purple', 'violations'];
  var used = {};
  var normalized = [];
  (Array.isArray(policy) ? policy : []).forEach(function(item) {
    var key = normalizeValue_(item && item.key);
    if (allowed.indexOf(key) < 0 || used[key]) return;
    used[key] = true;
    normalized.push({ key: key, direction: item && item.direction === 'asc' ? 'asc' : 'desc' });
  });
  fallback.forEach(function(item) {
    if (!used[item.key]) normalized.push({ key: item.key, direction: item.direction });
  });
  return normalized.slice(0, allowed.length);
}

function normalizeRankingPolicies_(policies) {
  policies = policies && typeof policies === 'object' ? policies : {};
  return {
    preliminary: normalizeRankingPolicy_(policies.preliminary, RANKING_POLICY_DEFAULTS.preliminary),
    tournament: normalizeRankingPolicy_(policies.tournament, RANKING_POLICY_DEFAULTS.tournament)
  };
}

function compareByRankingPolicy_(left, right, policy) {
  for (var index = 0; index < policy.length; index += 1) {
    var criterion = policy[index];
    var difference = toNumber_(left[criterion.key]) - toNumber_(right[criterion.key]);
    if (difference) return criterion.direction === 'asc' ? difference : -difference;
  }
  return 0;
}

function createGroupRows_(settings, teams) {
  var result = [];
  var index = 0;
  for (var groupIndex = 0; groupIndex < settings.groupSizes.length; groupIndex += 1) {
    var label = groupLabel_(groupIndex);
    for (var slot = 1; slot <= settings.groupSizes[groupIndex]; slot += 1) {
      result.push({ id: label + slot, group: label, team: teams[index++] || '' });
    }
  }
  return result;
}

function getGroupRows_(sheet, settings, teams) {
  var count = sum_(settings.groupSizes);
  ensureRows_(sheet, count + 2);
  var values = sheet.getRange(3, 1, count, 3).getDisplayValues();
  if (!values.some(function(row) { return normalizeValue_(row[0]); })) return createGroupRows_(settings, teams.slice(0, count));
  var usedTeams = uniqueNonEmpty_(values.map(function(row) { return row[2]; }));
  var availableTeams = teams.filter(function(team) { return usedTeams.indexOf(normalizeValue_(team)) < 0; });
  var shouldFillBlankSlots = !settings.groupSlotCapacity || count > settings.groupSlotCapacity;
  return values.map(function(row, index) {
    var groupIndex = groupIndexForSlot_(settings.groupSizes, index);
    var slotIndex = slotIndexInGroup_(settings.groupSizes, index);
    var label = normalizeValue_(row[1]) || groupLabel_(groupIndex);
    var existingId = normalizeValue_(row[0]);
    var team = normalizeValue_(row[2]);
    // スプレッドシート側で枠数だけ増やした場合、新しく生まれた行へ未配置チームを補充する。
    if (shouldFillBlankSlots && !team && availableTeams.length) team = availableTeams.shift();
    return { id: existingId || label + slotIndex, group: label, team: team };
  });
}

function getGroupRowsReadOnly_(sheet, settings, teams) {
  var count = sum_(settings.groupSizes);
  var readable = Math.max(0, Math.min(count, sheet.getMaxRows() - 2));
  var values = readable ? sheet.getRange(3, 1, readable, 3).getDisplayValues() : [];
  while (values.length < count) values.push(['', '', '']);
  if (!values.some(function(row) { return normalizeValue_(row[0]); })) return createGroupRows_(settings, teams.slice(0, count));
  var usedTeams = uniqueNonEmpty_(values.map(function(row) { return row[2]; }));
  var availableTeams = teams.filter(function(team) { return usedTeams.indexOf(normalizeValue_(team)) < 0; });
  var shouldFillBlankSlots = !settings.groupSlotCapacity || count > settings.groupSlotCapacity;
  return values.map(function(row, index) {
    var groupIndex = groupIndexForSlot_(settings.groupSizes, index);
    var slotIndex = slotIndexInGroup_(settings.groupSizes, index);
    var label = normalizeValue_(row[1]) || groupLabel_(groupIndex);
    var team = normalizeValue_(row[2]);
    if (shouldFillBlankSlots && !team && availableTeams.length) team = availableTeams.shift();
    return { id: normalizeValue_(row[0]) || label + slotIndex, group: label, team: team };
  });
}

function writeGroups_(sheet, groups) {
  ensureRows_(sheet, groups.length + 2);
  var clearRows = Math.max(sheet.getMaxRows() - 2, 1);
  sheet.getRange(3, 1, clearRows, 9).clearContent();
  if (!groups.length) return;
  sheet.getRange(3, 1, groups.length, 3).setValues(groups.map(function(row) { return [row.id, row.group, row.team]; }));
}

function createPreliminaryGroupWritePlan_(sheet, groups) {
  var rowCount = Math.min(sheet.getMaxRows(), 200);
  var columnCount = Math.min(sheet.getMaxColumns(), 52);
  var values = sheet.getRange(1, 1, rowCount, columnCount).getDisplayValues();
  var groupNames = uniqueNonEmpty_(groups.map(function(row) { return row.group; }));
  var modernHeaderCandidates = [];
  values.forEach(function(row, rowIndex) {
    for (var columnIndex = 0; columnIndex <= row.length - 3; columnIndex += 1) {
      if (normalizeValue_(row[columnIndex]) !== '識別ID' || normalizeValue_(row[columnIndex + 1]) !== 'グループ' || normalizeValue_(row[columnIndex + 2]) !== 'チーム名') continue;
      var title = rowIndex > 0 ? normalizeValue_(values[rowIndex - 1][columnIndex]) : '';
      var titleMatch = title.match(/^([A-Z]+)グループ\s*順位表$/);
      modernHeaderCandidates.push({ row: rowIndex, column: columnIndex, groupHint: titleMatch ? titleMatch[1] : '', title: title });
    }
  });

  if (modernHeaderCandidates.length) {
    if (modernHeaderCandidates.some(function(header) { return !header.groupHint; })) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」にグループ名を確認できない順位表があります。「Aグループ 順位表」の形式にしてください。何も変更していません。');
    var modernHeadersByGroup = {};
    modernHeaderCandidates.forEach(function(header) {
      if (modernHeadersByGroup[header.groupHint]) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」に' + header.groupHint + 'グループの順位表が複数あります。何も変更していません。');
      modernHeadersByGroup[header.groupHint] = header;
    });
    groupNames.forEach(function(groupName) {
      if (!modernHeadersByGroup[groupName]) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」に「' + groupName + 'グループ 順位表」がありません。何も変更していません。');
    });

    // 書込み予定外の枠も含め、順位表のチーム名領域全体が空欄であることを確認する。
    modernHeaderCandidates.forEach(function(header) {
      var requestedSize = groups.filter(function(row) { return row.group === header.groupHint; }).length;
      var dataStart = header.row + 1;
      var maximumEnd = Math.min(values.length, dataStart + 32);
      for (var checkRowIndex = dataStart; checkRowIndex < maximumEnd; checkRowIndex += 1) {
        var sourceRow = values[checkRowIndex] || [];
        var blockValues = sourceRow.slice(header.column, Math.min(sourceRow.length, header.column + 9)).map(normalizeValue_);
        var isBlankRow = !blockValues.some(Boolean);
        if (checkRowIndex >= dataStart + requestedSize && isBlankRow) break;
        var existingTeam = normalizeValue_(sourceRow[header.column + 2]);
        if (existingTeam) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」のグループ分け領域には既存チームがあります（' + columnToLetter_(header.column + 3) + (checkRowIndex + 1) + ' / ' + existingTeam + '）。安全のため何も変更していません。');
      }
    });

    var writes = [];
    var writtenCount = 0;
    var previewItems = [];
    groupNames.forEach(function(groupName) {
      var header = modernHeadersByGroup[groupName];
      var groupRows = groups.filter(function(row) { return row.group === groupName; });
      var nextValues = groupRows.map(function(groupRow, itemIndex) {
        var sourceRow = values[header.row + 1 + itemIndex] || [];
        var currentId = normalizeValue_(sourceRow[header.column]);
        var currentGroup = normalizeValue_(sourceRow[header.column + 1]);
        if (currentId && currentId !== groupRow.id) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」の識別ID「' + currentId + '」が予定の「' + groupRow.id + '」と一致しません。何も変更していません。');
        if (currentGroup && currentGroup !== groupRow.group) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」のグループ欄が予定と一致しません。何も変更していません。');
        if (groupRow.team) {
          writtenCount += 1;
          previewItems.push({ cell: columnToLetter_(header.column + 3) + (header.row + 2 + itemIndex), id: groupRow.id, group: groupRow.group, team: groupRow.team });
        }
        return [groupRow.id, groupRow.group, groupRow.team || ''];
      });
      writes.push({ row: header.row + 2, column: header.column + 1, values: nextValues });
    });
    return { writes: writes, writtenCount: writtenCount, previewItems: previewItems };
  }

  var legacyHeaders = [];
  values.forEach(function(row, rowIndex) {
    var idColumn = row.map(normalizeValue_).indexOf('番号');
    var teamColumn = row.map(normalizeValue_).indexOf('チーム名');
    if (idColumn >= 0 && teamColumn >= 0) legacyHeaders.push({ row: rowIndex, idColumn: idColumn, teamColumn: teamColumn });
  });
  if (legacyHeaders.length !== 1) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」のグループ分け欄を一意に特定できません。スプレッドシートは変更していません。');
  var legacyHeader = legacyHeaders[0];

  var legacyRowsById = {};
  for (var legacyRowIndex = legacyHeader.row + 1; legacyRowIndex < values.length; legacyRowIndex += 1) {
    var legacyId = normalizeValue_(values[legacyRowIndex][legacyHeader.idColumn]);
    if (!/^[A-Z]+\d+$/.test(legacyId)) continue;
    if (legacyRowsById[legacyId] !== undefined) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」に識別ID「' + legacyId + '」が複数あります。何も変更していません。');
    legacyRowsById[legacyId] = legacyRowIndex;
    var existingLegacyTeam = normalizeValue_(values[legacyRowIndex][legacyHeader.teamColumn]);
    if (existingLegacyTeam) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」のグループ分け領域には既存チームがあります（' + legacyId + ' / ' + existingLegacyTeam + '）。安全のため何も変更していません。');
  }
  var legacyWrites = [];
  var legacyWrittenCount = 0;
  var legacyPreviewItems = [];
  groups.forEach(function(groupRow) {
    if (legacyRowsById[groupRow.id] === undefined) throw new Error('「' + PRELIMINARY_RESULT_SHEET + '」に識別ID「' + groupRow.id + '」がありません。何も変更していません。');
    var targetRow = legacyRowsById[groupRow.id];
    if (groupRow.team) {
      legacyWrittenCount += 1;
      legacyPreviewItems.push({ cell: columnToLetter_(legacyHeader.teamColumn + 1) + (targetRow + 1), id: groupRow.id, group: groupRow.group, team: groupRow.team });
    }
    legacyWrites.push({ row: targetRow + 1, column: legacyHeader.teamColumn + 1, values: [[groupRow.team || '']] });
  });
  return { writes: legacyWrites, writtenCount: legacyWrittenCount, previewItems: legacyPreviewItems };
}

function columnToLetter_(column) {
  var result = '';
  while (column > 0) {
    column -= 1;
    result = String.fromCharCode(65 + column % 26) + result;
    column = Math.floor(column / 26);
  }
  return result;
}

function getScheduleRows_(sheet, resultRows, tournamentPolicy) {
  var last = lastDataRowInColumn_(sheet, 10);
  if (last < 3) return [];
  return sheet.getRange(3, 10, last - 2, 11).getDisplayValues().filter(function(row) { return normalizeValue_(row[0]); }).map(function(row) {
    var item = { id: normalizeValue_(row[0]), phase: normalizeValue_(row[1]), startTime: normalizeValue_(row[2]), team1: normalizeValue_(row[3]), team2: normalizeValue_(row[4]), winnerOverride: normalizeValue_(row[5]), note: normalizeValue_(row[6]), court: normalizeValue_(row[9]), endTime: normalizeValue_(row[10]) };
    var result = findLatestPairResult_(resultRows, item, tournamentPolicy);
    item.winner = item.winnerOverride || result.winner;
    item.resultStatus = result.status;
    item.resultMetrics = result.metrics;
    return item;
  });
}

function writeSchedule_(sheet, schedule) {
  var clearRows = Math.max(sheet.getMaxRows() - 2, 1);
  sheet.getRange(3, 10, clearRows, 7).clearContent();
  sheet.getRange(3, 19, clearRows, 1).clearContent();
  sheet.getRange(3, 20, clearRows, 1).clearContent();
  if (!schedule.length) return;
  ensureRows_(sheet, schedule.length + 2);
  sheet.getRange(3, 10, schedule.length, 7).setValues(schedule.map(function(row) { return [row.id, row.phase, row.startTime, row.team1, row.team2, row.winnerOverride || row.winner || '', row.note]; }));
  sheet.getRange(3, 19, schedule.length, 1).setValues(schedule.map(function(row) { return [row.court || '']; }));
  sheet.getRange(3, 20, schedule.length, 1).setValues(schedule.map(function(row) { return [row.endTime || '']; }));
}

function snapshotRange_(range, clearExtended) {
  var values = range.getValues();
  var formulas = range.getFormulas();
  return {
    range: range,
    clearExtended: Boolean(clearExtended),
    values: values.map(function(row, rowIndex) {
      return row.map(function(value, columnIndex) { return formulas[rowIndex][columnIndex] || value; });
    })
  };
}

function createCompetitionBackup_(sheet) {
  var rowCount = Math.max(1, sheet.getMaxRows() - 2);
  return [
    snapshotRange_(sheet.getRange(3, 1, rowCount, 3), true),
    snapshotRange_(sheet.getRange(3, 10, rowCount, 7), true),
    snapshotRange_(sheet.getRange(3, 19, rowCount, 2), true),
    snapshotRange_(sheet.getRange(1, 17, 18, 2))
  ];
}

function restoreRangeBackups_(backups) {
  (backups || []).forEach(function(backup) {
    if (backup.clearExtended) {
      var sheet = backup.range.getSheet();
      var rows = Math.max(backup.range.getNumRows(), sheet.getMaxRows() - backup.range.getRow() + 1);
      sheet.getRange(backup.range.getRow(), backup.range.getColumn(), rows, backup.range.getNumColumns()).clearContent();
    }
    backup.range.setValues(backup.values);
  });
}

function validateGroups_(groups, allowedTeams, settings) {
  if (!Array.isArray(groups)) throw new Error('グループ編成を確認できません。');
  var expected = sum_(settings.groupSizes);
  if (groups.length !== expected) throw new Error('グループ枠は' + expected + '件必要です。');
  var allowed = allowedTeams.map(normalizeValue_);
  var used = {};
  return groups.map(function(row, index) {
    var groupIndex = groupIndexForSlot_(settings.groupSizes, index);
    var group = groupLabel_(groupIndex);
    var slotIndex = slotIndexInGroup_(settings.groupSizes, index);
    var team = normalizeValue_(row && row.team);
    if (team && allowed.indexOf(team) < 0) throw new Error('チーム「' + team + '」はチームリストにありません。');
    if (team && used[team]) throw new Error('同じチームを複数の枠へ設定できません。');
    used[team] = Boolean(team);
    return { id: group + slotIndex, group: group, team: team };
  });
}

function getTeamGroupConfiguration_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(TEAM_SHEET) || spreadsheet.getSheetByName('チーム一覧');
  if (!sheet || sheet.getLastRow() < 2) return { sizes: [], signature: '' };
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0].map(normalizeValue_);
  var column = headers.indexOf('グループ');
  if (column < 0) return { sizes: [], signature: '' };
  var sizes = [];
  values.slice(1).forEach(function(row) {
    var match = normalizeValue_(row[column]).match(/(\d+)\s*チーム\s*[,、，×xX]\s*(\d+)\s*グループ/);
    if (!match) return;
    var teamCount = clampInt_(match[1], 1, 32, 1);
    var groupCount = clampInt_(match[2], 1, 16, 1);
    while (groupCount-- > 0 && sizes.length < 16) sizes.push(teamCount);
  });
  return { sizes: sizes, signature: sizes.join(',') };
}

function groupIndexForSlot_(sizes, index) {
  var consumed = 0;
  for (var groupIndex = 0; groupIndex < sizes.length; groupIndex += 1) {
    consumed += sizes[groupIndex];
    if (index < consumed) return groupIndex;
  }
  return Math.max(0, sizes.length - 1);
}

function slotIndexInGroup_(sizes, index) {
  var before = 0;
  var groupIndex = groupIndexForSlot_(sizes, index);
  for (var current = 0; current < groupIndex; current += 1) before += sizes[current];
  return index - before + 1;
}

function sum_(values) {
  return (values || []).reduce(function(total, value) { return total + Number(value || 0); }, 0);
}

function validateSchedule_(schedule, allowedTeams) {
  if (!Array.isArray(schedule)) throw new Error('タイムスケジュールを確認できません。');
  if (schedule.length > MAX_SCHEDULE_ROWS) throw new Error('タイムスケジュールは' + MAX_SCHEDULE_ROWS + '件以内にしてください。');
  var ids = {};
  var normalized = schedule.map(function(row, index) {
    var id = normalizeValue_(row && row.id).slice(0, 30);
    if (!id) throw new Error((index + 1) + '行目の試合IDを入力してください。');
    if (ids[id]) throw new Error('試合ID「' + id + '」が重複しています。');
    ids[id] = true;
    return {
      id: id,
      phase: normalizeValue_(row.phase).slice(0, 50),
      startTime: normalizeValue_(row.startTime).slice(0, 12),
      team1: normalizeValue_(row.team1).slice(0, 100),
      team2: normalizeValue_(row.team2).slice(0, 100),
      winnerOverride: normalizeValue_(row.winnerOverride !== undefined ? row.winnerOverride : row.winner).slice(0, 100),
      note: normalizeValue_(row.note).slice(0, 100),
      court: normalizeValue_(row.court).slice(0, 20),
      endTime: normalizeValue_(row.endTime).slice(0, 12)
    };
  });
  validateTournamentGraph_(normalized);
  return normalized;
}

function validateTournamentGraph_(schedule) {
  var rows = {};
  (schedule || []).forEach(function(row) { rows[row.id] = row; });
  var dependencies = {};
  (schedule || []).forEach(function(row) {
    dependencies[row.id] = [];
    ['team1', 'team2'].forEach(function(field) {
      var match = normalizeValue_(row[field]).match(/^(.+?) (勝者|敗者)$/);
      if (!match) return;
      var sourceId = normalizeValue_(match[1]);
      if (!rows[sourceId]) throw new Error('試合「' + row.id + '」の接続元「' + sourceId + '」が見つかりません。');
      if (sourceId === row.id) throw new Error('試合「' + row.id + '」を自分自身へ接続できません。');
      dependencies[row.id].push(sourceId);
    });
  });
  var visiting = {}; var visited = {};
  function visit(id) {
    if (visiting[id]) throw new Error('トーナメント接続が循環しています。試合「' + id + '」付近を確認してください。');
    if (visited[id]) return;
    visiting[id] = true;
    (dependencies[id] || []).forEach(visit);
    delete visiting[id]; visited[id] = true;
  }
  Object.keys(rows).forEach(visit);
}

function assignCourtDefaults_(schedule, courtCount) {
  var nextCourt = 0;
  var groupCourts = {};
  var nextGroupCourt = 0;
  courtCount = clampInt_(courtCount, 1, 26, 1);
  (schedule || []).forEach(function(row) {
    var groupMatch = String(row.phase || '').match(/^(.+?)グループ予選/);
    var existingCourt = normalizeCourtLabel_(row.court, courtCount);
    if (groupMatch && existingCourt && !groupCourts[groupMatch[1]]) groupCourts[groupMatch[1]] = existingCourt;
  });
  return (schedule || []).map(function(row) {
    var isOperation = /休憩|調整/.test(String(row.phase || '')) || /^(BREAK-|ADJ-)/.test(String(row.id || ''));
    if (isOperation) {
      row.court = '';
      return row;
    }
    var originalCourt = normalizeValue_(row.court);
    var rawCourt = normalizeCourtLabel_(originalCourt, courtCount);
    var court = rawCourt;
    var groupMatch = String(row.phase || '').match(/^(.+?)グループ予選/);
    if (!court && groupMatch) {
      if (!groupCourts[groupMatch[1]]) groupCourts[groupMatch[1]] = courtLabel_(nextGroupCourt++ % courtCount + 1);
      court = groupCourts[groupMatch[1]];
    }
    if (!court) court = courtLabel_(nextCourt % courtCount + 1);
    row.court = String(court);
    nextCourt += 1;
    return row;
  });
}

function courtLabel_(index) {
  return String.fromCharCode(64 + clampInt_(index, 1, 26, 1));
}

function normalizeCourtLabel_(value, courtCount) {
  var raw = normalizeValue_(value);
  if (!raw) return '';
  if (/^\d+$/.test(raw)) {
    var number = Number(raw);
    return number >= 1 && number <= courtCount ? courtLabel_(number) : '';
  }
  return raw;
}

function rebuildPreliminarySchedule_(schedule, groups) {
  var existingTournament = (schedule || []).filter(isTournamentMatch_);
  var operationRows = (schedule || []).filter(function(row) {
    return !isTournamentMatch_(row) && !/^P-/.test(String(row.id || '')) && String(row.phase || '').indexOf('グループ予選') < 0;
  });
  var initialAdjustment = operationRows.filter(function(row) { return String(row.id || '') === 'ADJ-START'; });
  var otherOperations = operationRows.filter(function(row) { return String(row.id || '') !== 'ADJ-START'; });
  return initialAdjustment.concat(buildInterleavedRoundRobin_(groups)).concat(otherOperations).concat(existingTournament);
}

function createInitialAdjustmentRow_() {
  return { id: 'ADJ-START', phase: '調整時間', startTime: '', endTime: '', court: '', team1: '', team2: '', winnerOverride: '', winner: '', note: '60分' };
}

function createRoundRobinRounds_(entries) {
  var players = entries.slice();
  if (players.length < 2) return [];
  if (players.length % 2) players.push(null);
  var rounds = [];
  for (var round = 0; round < players.length - 1; round += 1) {
    var pairs = [];
    for (var index = 0; index < players.length / 2; index += 1) {
      var left = players[index];
      var right = players[players.length - 1 - index];
      if (left && right) pairs.push([left, right]);
    }
    rounds.push(pairs);
    players = [players[0], players[players.length - 1]].concat(players.slice(1, players.length - 1));
  }
  return rounds;
}

function buildInterleavedRoundRobin_(groups) {
  var groupNames = uniqueNonEmpty_((groups || []).map(function(row) { return row.group; }));
  var data = groupNames.map(function(group) {
    return { group: group, rounds: createRoundRobinRounds_((groups || []).filter(function(row) { return row.group === group && row.team; })) };
  });
  var maximumRounds = data.reduce(function(maximum, item) { return Math.max(maximum, item.rounds.length); }, 0);
  var counters = {};
  var result = [];
  for (var round = 0; round < maximumRounds; round += 1) {
    var orderedGroups = data;
    var maximumPairs = orderedGroups.reduce(function(maximum, item) { return Math.max(maximum, (item.rounds[round] || []).length); }, 0);
    for (var pairIndex = 0; pairIndex < maximumPairs; pairIndex += 1) {
      orderedGroups.forEach(function(item) {
        var pair = (item.rounds[round] || [])[pairIndex];
        if (!pair) return;
        counters[item.group] = (counters[item.group] || 0) + 1;
        result.push({ id: 'P-' + item.group + '-' + counters[item.group], phase: item.group + 'グループ予選', startTime: '', court: '', team1: pair[0].team, team2: pair[1].team, winnerOverride: '', note: '' });
      });
    }
  }
  return result;
}

function interleaveLegacyPreliminarySchedule_(schedule, groups) {
  var preliminary = (schedule || []).filter(function(row) { return /^P-/.test(String(row.id || '')) || String(row.phase || '').indexOf('グループ予選') >= 0; });
  if (preliminary.length < 2) return schedule;
  function matchGroup(row) {
    var phase = normalizeValue_(row.phase);
    var match = phase.match(/^(.+?)グループ予選/);
    if (match) return match[1];
    var team = normalizeValue_(row.team1);
    var groupRow = (groups || []).filter(function(item) { return item.team === team; })[0];
    return groupRow ? groupRow.group : '';
  }
  var firstGroup = matchGroup(preliminary[0]);
  var initialRun = 0;
  while (initialRun < preliminary.length && matchGroup(preliminary[initialRun]) === firstGroup) initialRun += 1;
  if (!firstGroup || initialRun < 2) return schedule;
  var desired = buildInterleavedRoundRobin_(groups);
  function pairKey(row) {
    return [normalizeValue_(row.team1), normalizeValue_(row.team2)].sort().join('\u0001');
  }
  var buckets = {};
  preliminary.forEach(function(row) { var key = pairKey(row); if (!buckets[key]) buckets[key] = []; buckets[key].push(row); });
  var ordered = desired.map(function(row) {
    var bucket = buckets[pairKey(row)] || [];
    return bucket.shift() || row;
  });
  var otherRows = (schedule || []).filter(function(row) { return preliminary.indexOf(row) < 0; });
  return ordered.concat(otherRows);
}

function createTournamentSchedule_(seeds, thirdPlaceEnabled) {
  var count = Math.max(2, seeds.length);
  var size = 1;
  while (size < count) size *= 2;
  var slots = seeds.slice(0, count);
  while (slots.length < size) slots.push('BYE');
  var matches = [];
  var sources = slots;
  var round = 1;
  while (sources.length > 1) {
    var next = [];
    for (var index = 0; index < sources.length; index += 2) {
      var id = sources.length === 2 ? 'F-1' : 'R' + round + '-' + (index / 2 + 1);
      var team1 = sources[index] || 'BYE';
      var team2 = sources[index + 1] || 'BYE';
      matches.push({ id: id, phase: sources.length === 2 ? '決勝' : ('トーナメント' + round + '回戦'), startTime: '', team1: team1, team2: team2, winnerOverride: team1 === 'BYE' ? team2 : team2 === 'BYE' ? team1 : '', note: '' });
      next.push(id + ' 勝者');
    }
    sources = next;
    round += 1;
  }
  if (thirdPlaceEnabled && round > 2) {
    var semifinals = matches.filter(function(row) { return row.phase === 'トーナメント' + (round - 2) + '回戦'; });
    if (semifinals.length >= 2) matches.splice(matches.length - 1, 0, { id: '3P-1', phase: '3位決定戦', startTime: '', team1: semifinals[0].id + ' 敗者', team2: semifinals[1].id + ' 敗者', winnerOverride: '', note: '' });
  }
  return matches;
}

function getTeams_(spreadsheet) {
  var rows = getTeamListRows_(spreadsheet);
  var teams = uniqueNonEmpty_(rows.map(function(row) { return row.name; }));
  return teams.length ? teams : DEFAULT_TEAMS.slice();
}

function getTeamListRows_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(TEAM_SHEET) || spreadsheet.getSheetByName('チーム一覧');
  if (!sheet || sheet.getLastRow() < 2) return DEFAULT_TEAMS.map(function(team, index) { return { number: index + 1, name: team, affiliation: '', courtCount: '', groupConfig: '' }; });
  var values = sheet.getDataRange().getDisplayValues();
  var header = values[0].map(normalizeValue_);
  var nameColumn = header.indexOf('チーム名'); if (nameColumn < 0) nameColumn = header.length > 1 ? 1 : 0;
  var numberColumn = header.indexOf('チーム数');
  var affiliationColumn = header.indexOf('所属');
  var courtColumn = header.indexOf('コート数');
  var groupColumn = header.indexOf('グループ');
  return values.slice(1).map(function(row, index) {
    return {
      number: numberColumn >= 0 ? normalizeValue_(row[numberColumn]) || index + 1 : index + 1,
      name: normalizeValue_(row[nameColumn]),
      affiliation: affiliationColumn >= 0 ? normalizeValue_(row[affiliationColumn]) : '',
      courtCount: courtColumn >= 0 ? normalizeValue_(row[courtColumn]) : '',
      groupConfig: groupColumn >= 0 ? normalizeValue_(row[groupColumn]) : ''
    };
  }).filter(function(row) { return row.name; });
}

function getSpreadsheetCourtCount_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(TEAM_SHEET) || spreadsheet.getSheetByName('チーム一覧');
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var values = sheet.getDataRange().getDisplayValues();
  var headers = values[0].map(normalizeValue_);
  var column = headers.indexOf('コート数');
  if (column < 0) return 0;
  for (var row = 1; row < values.length; row += 1) {
    var count = Math.floor(Number(normalizeValue_(values[row][column])));
    if (isFinite(count) && count > 0) return Math.min(26, count);
  }
  return 0;
}

function getResultRows_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(RESULT_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return [];
  var values = sheet.getDataRange().getValues();
  var map = createHeaderMap_(values[0].map(normalizeValue_));
  if (map['チーム名'] === undefined || map['対戦相手'] === undefined) return [];
  return values.slice(1).map(function(row) { return { date: row[map['日時']], type: normalizeValue_(row[map['種別']]), team: normalizeValue_(row[map['チーム名']]), opponent: normalizeValue_(row[map['対戦相手']]), points: toNumber_(row[map['勝ち点']]), violations: toNumber_(row[map['違反数']]), score: toNumber_(row[map['得点']]), purple: toNumber_(row[map['紫']]) }; }).filter(function(row) { return row.team && row.opponent; });
}

function getCompetitionFreshness_(spreadsheetId, settings, results) {
  results = results || [];
  var resultData = results.map(function(row) {
    return [toTimestamp_(row.date), row.type, row.team, row.opponent, row.points, row.violations, row.score, row.purple];
  });
  var resultSignature = hashString_(JSON.stringify(resultData));
  var latestResultTimestamp = resultData.reduce(function(latest, row) { return Math.max(latest, Number(row[0]) || 0); }, 0);
  var properties = PropertiesService.getScriptProperties();
  var suffix = normalizeValue_(spreadsheetId);
  var signatureKey = 'RESULT_SIGNATURE_' + suffix;
  var observedKey = 'RESULT_OBSERVED_AT_' + suffix;
  var previous = normalizeValue_(properties.getProperty(signatureKey));
  var observedAt = normalizeValue_(properties.getProperty(observedKey));
  if (previous !== resultSignature) {
    properties.setProperty(signatureKey, resultSignature);
    if (results.length) {
      observedAt = Utilities.formatDate(new Date(latestResultTimestamp || Date.now()), TIME_ZONE, 'yyyy/MM/dd HH:mm:ss');
      properties.setProperty(observedKey, observedAt);
    } else {
      observedAt = '';
      properties.deleteProperty(observedKey);
    }
  }
  var settingsTimestamp = toTimestamp_(settings && settings.updatedAt);
  var observedTimestamp = toTimestamp_(observedAt);
  var latest = Math.max(settingsTimestamp, latestResultTimestamp, observedTimestamp);
  return {
    revision: hashString_([normalizeValue_(settings && settings.updatedAt), resultSignature].join('|')),
    updatedAt: latest ? Utilities.formatDate(new Date(latest), TIME_ZONE, 'yyyy/MM/dd HH:mm:ss') : ''
  };
}

function hashString_(value) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value || ''), Utilities.Charset.UTF_8);
  return bytes.map(function(byte) { var normalized = byte < 0 ? byte + 256 : byte; return ('0' + normalized.toString(16)).slice(-2); }).join('').slice(0, 32);
}

function buildStandings_(groups, results, policy) {
  policy = normalizeRankingPolicy_(policy, RANKING_POLICY_DEFAULTS.preliminary);
  var standings = groups.map(function(group) {
    var total = { points: 0, violations: 0, score: 0, purple: 0 };
    results.forEach(function(result) { if (group.team && result.type === '予選' && result.team === group.team) { total.points += result.points; total.violations += result.violations; total.score += result.score; total.purple += result.purple; } });
    return { id: group.id, group: group.group, team: group.team, points: total.points, violations: total.violations, score: total.score, purple: total.purple, rank: 0, seed: false };
  });
  uniqueNonEmpty_(standings.map(function(row) { return row.group; })).forEach(function(group) {
    var rows = standings.filter(function(row) { return row.group === group && row.team; }).sort(function(left, right) {
      return compareByRankingPolicy_(left, right, policy) || left.id.localeCompare(right.id, 'ja');
    });
    rows.forEach(function(row, index) { row.rank = index + 1; row.seed = index === 0; });
  });
  return standings;
}

function compareStanding_(a, b, policy) { return compareByRankingPolicy_(a, b, normalizeRankingPolicy_(policy, RANKING_POLICY_DEFAULTS.preliminary)) || a.id.localeCompare(b.id, 'ja'); }
function compareOverallStanding_(a, b, policy) { return a.rank - b.rank || compareStanding_(a, b, policy); }

function findLatestPairResult_(results, match, policy) {
  if (!isActualTeam_(match.team1) || !isActualTeam_(match.team2)) return { winner: '', status: '未実施' };
  var type = match.phase.indexOf('予選') >= 0 ? '予選' : '決勝トーナメント';
  var rows = results.filter(function(row) { return row.type === type && ((row.team === match.team1 && row.opponent === match.team2) || (row.team === match.team2 && row.opponent === match.team1)); }).sort(function(a, b) { return toTimestamp_(b.date) - toTimestamp_(a.date); });
  if (!rows.length) return { winner: '', status: '未実施', metrics: {} };
  var latestByTeam = {};
  rows.forEach(function(row) { if (!latestByTeam[row.team]) latestByTeam[row.team] = row; });
  var left = latestByTeam[match.team1]; var right = latestByTeam[match.team2];
  var metrics = {}; if (left) metrics[match.team1] = left; if (right) metrics[match.team2] = right;
  if (!left || !right) return { winner: '', status: '結果確認中', metrics: metrics };
  var comparison = compareByRankingPolicy_(left, right, normalizeRankingPolicy_(policy, RANKING_POLICY_DEFAULTS.tournament));
  return { winner: comparison < 0 ? left.team : comparison > 0 ? right.team : '', status: comparison ? '結果反映済み' : '同順位', metrics: metrics };
}

function normalizeBracketDisplaySettings_(settings) {
  settings = settings && typeof settings === 'object' ? settings : {};
  var offsets = {};
  Object.keys(settings.connectionOffsets && typeof settings.connectionOffsets === 'object' ? settings.connectionOffsets : {}).slice(0, 256).forEach(function(key) {
    offsets[normalizeValue_(key).slice(0, 120)] = clampNumber_(settings.connectionOffsets[key], -400, 400, 0);
  });
  var background = /^#[0-9a-f]{6}$/i.test(String(settings.classicBackground || '')) ? String(settings.classicBackground) : BRACKET_DEFAULTS.classicBackground;
  return { layoutDirection: settings.layoutDirection === 'bottom-up' ? 'bottom-up' : 'left-to-right', orientation: settings.orientation === 'vertical' ? 'vertical' : 'horizontal', wrapMode: ['auto', '6', '8', '10', 'none'].indexOf(String(settings.wrapMode || '')) >= 0 ? String(settings.wrapMode) : BRACKET_DEFAULTS.wrapMode, fontSize: clampNumber_(settings.fontSize, 14, 30, BRACKET_DEFAULTS.fontSize), boxWidth: clampNumber_(settings.boxWidth, 120, 240, BRACKET_DEFAULTS.boxWidth), boxHeight: clampNumber_(settings.boxHeight, 80, 400, BRACKET_DEFAULTS.boxHeight), boxBorderWidth: clampNumber_(settings.boxBorderWidth, 1, 7, BRACKET_DEFAULTS.boxBorderWidth), lineWidth: clampNumber_(settings.lineWidth, 2, 7, BRACKET_DEFAULTS.lineWidth), showMatchId: Boolean(settings.showMatchId), matchInfoFontSize: clampNumber_(settings.matchInfoFontSize, 9, 24, BRACKET_DEFAULTS.matchInfoFontSize), matchInfoPosition: ['left', 'center', 'right'].indexOf(settings.matchInfoPosition) >= 0 ? settings.matchInfoPosition : BRACKET_DEFAULTS.matchInfoPosition, bottomUpStyle: settings.bottomUpStyle === 'detailed' ? 'detailed' : 'classic', classicSeedWidth: clampNumber_(settings.classicSeedWidth, 80, 240, BRACKET_DEFAULTS.classicSeedWidth), classicSeedHeight: clampNumber_(settings.classicSeedHeight, 150, 520, BRACKET_DEFAULTS.classicSeedHeight), classicMatchWidth: clampNumber_(settings.classicMatchWidth, 120, 340, BRACKET_DEFAULTS.classicMatchWidth), classicMatchHeight: clampNumber_(settings.classicMatchHeight, 60, 220, BRACKET_DEFAULTS.classicMatchHeight), classicChampionWidth: clampNumber_(settings.classicChampionWidth, 300, 1400, BRACKET_DEFAULTS.classicChampionWidth), classicChampionHeight: clampNumber_(settings.classicChampionHeight, 70, 280, BRACKET_DEFAULTS.classicChampionHeight), classicRoundGap: clampNumber_(settings.classicRoundGap, 30, 180, BRACKET_DEFAULTS.classicRoundGap), classicBackground: background, connectionOffsets: offsets };
}

function applyCompetitionFormatting_(sheet, rowCount) {
  sheet.setFrozenRows(2); sheet.setColumnWidth(1, 90); sheet.setColumnWidth(2, 100); sheet.setColumnWidth(3, 240); sheet.setColumnWidths(4, 6, 85); sheet.setColumnWidth(10, 100); sheet.setColumnWidth(11, 180); sheet.setColumnWidth(12, 105); sheet.setColumnWidths(13, 2, 220); sheet.setColumnWidth(15, 180); sheet.setColumnWidth(16, 220); sheet.setColumnWidth(19, 100); sheet.setColumnWidth(20, 105); sheet.getRange(1, 1, Math.max(rowCount + 2, 3), 20).setVerticalAlignment('middle').setWrap(true); sheet.getRange('A1:T2').setFontWeight('bold');
}

function inferGroupCount_(sheet) { var rows = sheet.getRange(3, 2, Math.max(1, lastDataRowInColumn_(sheet, 2) - 2), 1).getDisplayValues(); return Math.max(1, uniqueNonEmpty_(rows.map(function(row) { return row[0]; })).length || 2); }
function inferTeamsPerGroup_(sheet) { var rows = sheet.getRange(3, 2, Math.max(1, lastDataRowInColumn_(sheet, 2) - 2), 1).getDisplayValues(); var counts = {}; rows.forEach(function(row) { var key = normalizeValue_(row[0]); if (key) counts[key] = (counts[key] || 0) + 1; }); return Math.max.apply(Math, Object.keys(counts).map(function(key) { return counts[key]; }).concat([3])); }
function groupLabel_(index) { var label = ''; do { label = String.fromCharCode(65 + index % 26) + label; index = Math.floor(index / 26) - 1; } while (index >= 0); return label; }
function isTournamentMatch_(row) { return row && (String(row.phase || '').indexOf('トーナメント') >= 0 || /^(R\d+-|F-|SF-|3P-)/.test(String(row.id || '')) || String(row.phase || '') === '決勝' || String(row.phase || '') === '3位決定戦'); }
function isActualTeam_(value) { value = normalizeValue_(value); return Boolean(value && value !== '未定' && value !== 'BYE' && !/ (勝者|敗者)$/.test(value)); }
function lastDataRowInColumn_(sheet, column) { var last = sheet.getLastRow(); if (last < 1) return 0; var values = sheet.getRange(1, column, last, 1).getDisplayValues(); for (var index = values.length - 1; index >= 0; index -= 1) if (normalizeValue_(values[index][0])) return index + 1; return 0; }
function ensureRows_(sheet, required) { if (sheet.getMaxRows() < required) sheet.insertRowsAfter(sheet.getMaxRows(), required - sheet.getMaxRows()); }
function assertPayload_(payload) {
  if (!payload || typeof payload !== 'object') throw new Error('保存データを確認できません。');
  var serialized;
  try { serialized = JSON.stringify(payload); } catch (error) { throw new Error('保存データをJSONへ変換できません。'); }
  if (Utilities.newBlob(serialized, 'application/json').getBytes().length > MAX_PAYLOAD_BYTES) throw new Error('保存データが大きすぎます。試合数やメモ、線の調整数を減らしてください。');
  if (Array.isArray(payload.groups) && payload.groups.length > 512) throw new Error('グループ枠は512件以内にしてください。');
  if (Array.isArray(payload.schedule) && payload.schedule.length > MAX_SCHEDULE_ROWS) throw new Error('タイムスケジュールは' + MAX_SCHEDULE_ROWS + '件以内にしてください。');
}
function createHeaderMap_(headers) { var map = {}; headers.forEach(function(header, index) { if (header && map[header] === undefined) map[header] = index; }); return map; }
function uniqueNonEmpty_(values) { var seen = {}; return (values || []).map(normalizeValue_).filter(function(value) { if (!value || seen[value]) return false; seen[value] = true; return true; }); }
function shuffle_(values) { for (var index = values.length - 1; index > 0; index -= 1) { var target = Math.floor(Math.random() * (index + 1)); var value = values[index]; values[index] = values[target]; values[target] = value; } return values; }
function clampInt_(value, minimum, maximum, fallback) { var number = Math.floor(Number(value)); return isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback; }
function clampNumber_(value, minimum, maximum, fallback) { var number = Number(value); return isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback; }
function toNumber_(value) { var number = Number(value); return isNaN(number) ? 0 : number; }
function toTimestamp_(value) { if (value instanceof Date) return value.getTime(); var parsed = Date.parse(value); return isNaN(parsed) ? 0 : parsed; }
function normalizeKey_(value) { return normalizeValue_(value).toLowerCase(); }
function normalizeValue_(value) { return value === null || value === undefined ? '' : String(value).trim(); }
function createErrorResponse_(error) { return { success: false, message: error && error.message ? error.message : '処理に失敗しました。' }; }
