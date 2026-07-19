var MIE_SPREADSHEET_ID = '185jPLjc-nBri49aOr-CVw1baUI1qaxqjgcWLRS2-oxo';
var MIE_TEAM_SHEET = 'チームリスト';
var MIE_RESULT_SHEET = '試合結果';
var MIE_SETUP_SHEET = '大会編成';
var MIE_TIME_ZONE = 'Asia/Tokyo';

var MIE_FALLBACK_TEAMS = [
  'サクラユリ',
  'ハイパーGGG',
  'ささみ　にんじん　マヨネーズ',
  '未来LABO',
  'Team S',
  '榎本と榎本'
];

var MIE_GROUP_IDS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3'];
var MIE_MATCH_DEFINITIONS = [
  { id: 'A-1', phase: 'Aグループ予選' },
  { id: 'A-2', phase: 'Aグループ予選' },
  { id: 'A-3', phase: 'Aグループ予選' },
  { id: 'B-1', phase: 'Bグループ予選' },
  { id: 'B-2', phase: 'Bグループ予選' },
  { id: 'B-3', phase: 'Bグループ予選' },
  { id: 'T-1', phase: 'トーナメント1回戦' },
  { id: 'T-2', phase: 'トーナメント1回戦' },
  { id: 'SF-1', phase: '準決勝' },
  { id: 'SF-2', phase: '準決勝' },
  { id: 'F-1', phase: '決勝' }
];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('WRO三重大会 編成管理')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getCompetitionState(editorKey) {
  try {
    var spreadsheet = SpreadsheetApp.openById(MIE_SPREADSHEET_ID);
    var sheet = ensureCompetitionSheet_(spreadsheet);
    var teams = getMieTeams_(spreadsheet);
    var groups = getGroupRows_(sheet);
    var resultContext = getResultContext_(spreadsheet);
    var standings = buildStandings_(groups, resultContext.rows);
    var schedule = getScheduleRows_(sheet, resultContext.rows);
    var keyRequired = getEditorKeys_().length > 0;

    return {
      success: true,
      spreadsheetName: spreadsheet.getName(),
      spreadsheetUrl: spreadsheet.getUrl(),
      teams: teams,
      groups: groups,
      standings: standings,
      schedule: schedule,
      canEdit: isEditorAuthorized_(editorKey),
      editorKeyRequired: keyRequired,
      securityNotice: keyRequired
        ? ''
        : '編集キーが未設定です。URLを知っている人が編集できるため、スクリプトプロパティに MANAGEMENT_KEY を設定してください。',
      updatedAt: Utilities.formatDate(new Date(), MIE_TIME_ZONE, 'yyyy/MM/dd HH:mm:ss')
    };
  } catch (error) {
    return createErrorResponse_(error);
  }
}

function authorizeEditor(editorKey) {
  var required = getEditorKeys_().length > 0;
  var authorized = isEditorAuthorized_(editorKey);
  return {
    success: authorized,
    canEdit: authorized,
    editorKeyRequired: required,
    message: authorized
      ? (required ? '編集モードを有効にしました。' : '編集キー未設定のため、編集モードを有効にしました。')
      : '編集キーが一致しません。'
  };
}

function randomizeGroups(editorKey) {
  assertEditorAuthorized_(editorKey);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var spreadsheet = SpreadsheetApp.openById(MIE_SPREADSHEET_ID);
    var sheet = ensureCompetitionSheet_(spreadsheet);
    var teams = getMieTeams_(spreadsheet);
    if (teams.length !== 6) {
      throw new Error('三重のチームリストは6チームにしてください。現在は' + teams.length + 'チームです。');
    }

    var shuffled = shuffle_(teams.slice());
    sheet.getRange(3, 3, 6, 1).setValues(shuffled.map(function(team) {
      return [team];
    }));
    updateGroupScheduleTeams_(sheet, createAssignmentMap_(shuffled));
    SpreadsheetApp.flush();

    return getCompetitionState(editorKey);
  } finally {
    lock.releaseLock();
  }
}

function applyRecommendedBracket(editorKey) {
  assertEditorAuthorized_(editorKey);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var spreadsheet = SpreadsheetApp.openById(MIE_SPREADSHEET_ID);
    var sheet = ensureCompetitionSheet_(spreadsheet);
    var groups = getGroupRows_(sheet);
    var standings = buildStandings_(groups, getResultContext_(spreadsheet).rows);
    var groupA = standings.filter(function(row) { return row.group === 'A'; });
    var groupB = standings.filter(function(row) { return row.group === 'B'; });

    if (groupA.length !== 3 || groupB.length !== 3 || !groupA[0].team || !groupB[0].team) {
      throw new Error('先に6チームのグループ分けを確定してください。');
    }

    var pairings = {
      'T-1': [groupA[1].team, groupB[2].team],
      'T-2': [groupB[1].team, groupA[2].team],
      'SF-1': [groupA[0].team, 'T-2 勝者'],
      'SF-2': [groupB[0].team, 'T-1 勝者'],
      'F-1': ['SF-1 勝者', 'SF-2 勝者']
    };

    var values = sheet.getRange(3, 10, MIE_MATCH_DEFINITIONS.length, 7).getValues();
    values.forEach(function(row) {
      var pairing = pairings[normalizeValue_(row[0])];
      if (pairing) {
        row[3] = pairing[0];
        row[4] = pairing[1];
        row[5] = '';
      }
    });
    sheet.getRange(3, 10, values.length, 7).setValues(values);
    SpreadsheetApp.flush();

    return getCompetitionState(editorKey);
  } finally {
    lock.releaseLock();
  }
}

function saveCompetitionState(payload, editorKey) {
  assertEditorAuthorized_(editorKey);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('保存データを確認できません。');
    }

    var spreadsheet = SpreadsheetApp.openById(MIE_SPREADSHEET_ID);
    var sheet = ensureCompetitionSheet_(spreadsheet);
    var teams = getMieTeams_(spreadsheet);
    var validatedGroups = validateGroups_(payload.groups, teams);
    var validatedSchedule = validateSchedule_(payload.schedule, teams);

    sheet.getRange(3, 3, 6, 1).setValues(validatedGroups.map(function(row) {
      return [row.team];
    }));

    var scheduleValues = validatedSchedule.map(function(row) {
      return [row.id, row.phase, row.startTime, row.team1, row.team2, row.winner, row.note];
    });
    sheet.getRange(3, 10, scheduleValues.length, 7).setValues(scheduleValues);
    SpreadsheetApp.flush();

    return getCompetitionState(editorKey);
  } finally {
    lock.releaseLock();
  }
}

function verifySpreadsheetAccess() {
  var spreadsheet = SpreadsheetApp.openById(MIE_SPREADSHEET_ID);
  return {
    success: true,
    name: spreadsheet.getName(),
    sheet: ensureCompetitionSheet_(spreadsheet).getName()
  };
}

function ensureCompetitionSheet_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(MIE_SETUP_SHEET);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(MIE_SETUP_SHEET);
    initializeCompetitionSheet_(sheet, getMieTeams_(spreadsheet));
  } else if (!normalizeValue_(sheet.getRange('A1').getDisplayValue())) {
    initializeCompetitionSheet_(sheet, getMieTeams_(spreadsheet));
  }
  return sheet;
}

function initializeCompetitionSheet_(sheet, teams) {
  if (sheet.getMaxColumns() < 16) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 16 - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < 20) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 20 - sheet.getMaxRows());
  }

  var teamValues = teams.slice(0, 6);
  while (teamValues.length < 6) {
    teamValues.push('');
  }

  sheet.getRange('A1:I1').merge().setValue('グループ編成・予選順位');
  sheet.getRange('A2:I2').setValues([['識別ID', 'グループ', 'チーム名', '勝ち点', '違反数', '得点', '紫', '順位', '区分']]);
  sheet.getRange('A3:C8').setValues(MIE_GROUP_IDS.map(function(id, index) {
    return [id, id.charAt(0), teamValues[index]];
  }));

  sheet.getRange('J1:P1').merge().setValue('タイムスケジュール・トーナメント');
  sheet.getRange('J2:P2').setValues([['試合ID', '区分', '開始時間', 'チーム1', 'チーム2', '勝者', 'メモ']]);
  sheet.getRange(3, 10, MIE_MATCH_DEFINITIONS.length, 7).setValues(MIE_MATCH_DEFINITIONS.map(function(definition) {
    return [definition.id, definition.phase, '', '', '', '', ''];
  }));

  applyCompetitionFormulas_(sheet);
  updateGroupScheduleTeams_(sheet, createAssignmentMap_(teamValues));
  applyCompetitionFormatting_(sheet);
}

function applyCompetitionFormulas_(sheet) {
  for (var row = 3; row <= 8; row += 1) {
    sheet.getRange(row, 4).setFormula(createResultSumFormula_(row, '勝ち点'));
    sheet.getRange(row, 5).setFormula(createResultSumFormula_(row, '違反数'));
    sheet.getRange(row, 6).setFormula(createResultSumFormula_(row, '得点'));
    sheet.getRange(row, 7).setFormula(createResultSumFormula_(row, '紫'));
    sheet.getRange(row, 8).setFormula(createRankFormula_(row));
    sheet.getRange(row, 9).setFormula('=IF(H' + row + '=1,"シード","")');
  }
}

function createResultSumFormula_(row, header) {
  return '=IF($C' + row + '="","",LET(h,\'試合結果\'!$A$1:$T$1,d,\'試合結果\'!$A$2:$T$1000,' +
    'tm,INDEX(d,,MATCH("チーム名",h,0)),ty,INDEX(d,,MATCH("種別",h,0)),' +
    'v,INDEX(d,,MATCH("' + header + '",h,0)),IFERROR(SUM(FILTER(v,tm=$C' + row + ',ty="予選")),0)))';
}

function createRankFormula_(row) {
  return '=IF(C' + row + '="","",1+' +
    'COUNTIFS($B$3:$B$8,$B' + row + ',$D$3:$D$8,">"&$D' + row + ')+' +
    'COUNTIFS($B$3:$B$8,$B' + row + ',$D$3:$D$8,$D' + row + ',$E$3:$E$8,"<"&$E' + row + ')+' +
    'COUNTIFS($B$3:$B$8,$B' + row + ',$D$3:$D$8,$D' + row + ',$E$3:$E$8,$E' + row + ',$F$3:$F$8,"<"&$F' + row + ')+' +
    'COUNTIFS($B$3:$B$8,$B' + row + ',$D$3:$D$8,$D' + row + ',$E$3:$E$8,$E' + row + ',$F$3:$F$8,$F' + row + ',$G$3:$G$8,">"&$G' + row + ')+' +
    'COUNTIFS($B$3:$B$8,$B' + row + ',$D$3:$D$8,$D' + row + ',$E$3:$E$8,$E' + row + ',$F$3:$F$8,$F' + row + ',$G$3:$G$8,$G' + row + ',$A$3:$A$8,"<"&$A' + row + '))';
}

function applyCompetitionFormatting_(sheet) {
  sheet.setFrozenRows(2);
  sheet.setColumnWidths(1, 2, 82);
  sheet.setColumnWidth(3, 240);
  sheet.setColumnWidths(4, 6, 90);
  sheet.setColumnWidth(10, 90);
  sheet.setColumnWidth(11, 170);
  sheet.setColumnWidth(12, 105);
  sheet.setColumnWidths(13, 2, 240);
  sheet.setColumnWidth(15, 180);
  sheet.setColumnWidth(16, 220);
  sheet.getRange('A1:P2').setFontWeight('bold');
  sheet.getRange('A1:P20').setVerticalAlignment('middle').setWrap(true);
}

function getMieTeams_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(MIE_TEAM_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return MIE_FALLBACK_TEAMS.slice();
  }

  var values = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getDisplayValues();
  var teams = uniqueNonEmpty_(values.map(function(row) { return row[0]; }));
  return teams.length ? teams : MIE_FALLBACK_TEAMS.slice();
}

function getGroupRows_(sheet) {
  var values = sheet.getRange(3, 1, 6, 3).getDisplayValues();
  return values.map(function(row, index) {
    var id = normalizeValue_(row[0]) || MIE_GROUP_IDS[index];
    return {
      id: id,
      group: normalizeValue_(row[1]) || id.charAt(0),
      team: normalizeValue_(row[2])
    };
  });
}

function getScheduleRows_(sheet, resultRows) {
  var values = sheet.getRange(3, 10, MIE_MATCH_DEFINITIONS.length, 7).getDisplayValues();
  return values.map(function(row, index) {
    var definition = MIE_MATCH_DEFINITIONS[index];
      var item = {
      id: normalizeValue_(row[0]) || definition.id,
      phase: normalizeValue_(row[1]) || definition.phase,
      startTime: normalizeValue_(row[2]),
      team1: normalizeValue_(row[3]),
      team2: normalizeValue_(row[4]),
      winnerOverride: normalizeValue_(row[5]),
      note: normalizeValue_(row[6])
    };
    var result = findLatestPairResult_(resultRows, item);
    item.winner = item.winnerOverride || result.winner;
    item.resultStatus = result.status;
    return item;
  });
}

function getResultContext_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(MIE_RESULT_SHEET);
  if (!sheet || sheet.getLastRow() < 2) {
    return { rows: [] };
  }

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(normalizeValue_);
  var map = createHeaderMap_(headers);
  var required = ['日時', '種別', 'チーム名', '対戦相手', '勝ち点', '違反数', '得点', '紫'];
  var missing = required.filter(function(header) { return map[header] === undefined; });
  if (missing.length) {
    return { rows: [], warning: '試合結果シートの見出し不足: ' + missing.join('、') };
  }

  var rows = values.slice(1).map(function(row) {
    return {
      date: row[map['日時']],
      type: normalizeValue_(row[map['種別']]),
      team: normalizeValue_(row[map['チーム名']]),
      opponent: normalizeValue_(row[map['対戦相手']]),
      points: toNumber_(row[map['勝ち点']]),
      violations: toNumber_(row[map['違反数']]),
      score: toNumber_(row[map['得点']]),
      purple: toNumber_(row[map['紫']])
    };
  }).filter(function(row) {
    return row.team && row.opponent;
  });

  return { rows: rows };
}

function buildStandings_(groups, resultRows) {
  var standings = groups.map(function(group) {
    var totals = { points: 0, violations: 0, score: 0, purple: 0 };
    resultRows.forEach(function(result) {
      if (result.type === '予選' && result.team === group.team) {
        totals.points += result.points;
        totals.violations += result.violations;
        totals.score += result.score;
        totals.purple += result.purple;
      }
    });
    return {
      id: group.id,
      group: group.group,
      team: group.team,
      points: totals.points,
      violations: totals.violations,
      score: totals.score,
      purple: totals.purple,
      rank: 0,
      seed: false
    };
  });

  ['A', 'B'].forEach(function(groupId) {
    var groupRows = standings.filter(function(row) { return row.group === groupId; });
    groupRows.sort(compareStanding_);
    groupRows.forEach(function(row, index) {
      row.rank = index + 1;
      row.seed = index === 0;
    });
  });
  return standings.sort(function(a, b) { return a.id.localeCompare(b.id, 'ja'); });
}

function compareStanding_(a, b) {
  if (a.points !== b.points) return b.points - a.points;
  if (a.violations !== b.violations) return a.violations - b.violations;
  if (a.score !== b.score) return a.score - b.score;
  if (a.purple !== b.purple) return b.purple - a.purple;
  return a.id.localeCompare(b.id, 'ja');
}

function findLatestPairResult_(resultRows, schedule) {
  var type = schedule.phase.indexOf('予選') >= 0 ? '予選' : '決勝トーナメント';
  var candidates = resultRows.filter(function(row) {
    if (row.type !== type) return false;
    return (row.team === schedule.team1 && row.opponent === schedule.team2) ||
      (row.team === schedule.team2 && row.opponent === schedule.team1);
  });
  if (!candidates.length) return { winner: '', status: '未実施' };

  candidates.sort(function(a, b) {
    return toTimestamp_(b.date) - toTimestamp_(a.date);
  });
  var latestDate = toTimestamp_(candidates[0].date);
  var latest = candidates.filter(function(row) {
    return Math.abs(toTimestamp_(row.date) - latestDate) < 120000;
  });
  var winnerRow = latest.filter(function(row) { return row.points === 3; })[0];
  if (winnerRow) return { winner: winnerRow.team, status: '結果反映済み' };
  if (latest.some(function(row) { return row.points === 1; })) return { winner: '引き分け', status: '結果反映済み' };
  return { winner: '', status: '結果確認中' };
}

function updateGroupScheduleTeams_(sheet, assignment) {
  var pairIds = [
    ['A1', 'A2'], ['A2', 'A3'], ['A3', 'A1'],
    ['B1', 'B2'], ['B2', 'B3'], ['B3', 'B1']
  ];
  var values = sheet.getRange(3, 13, 6, 2).getValues();
  pairIds.forEach(function(pair, index) {
    values[index][0] = assignment[pair[0]] || '';
    values[index][1] = assignment[pair[1]] || '';
  });
  sheet.getRange(3, 13, 6, 2).setValues(values);
}

function createAssignmentMap_(teams) {
  var map = {};
  MIE_GROUP_IDS.forEach(function(id, index) {
    map[id] = teams[index] || '';
  });
  return map;
}

function validateGroups_(groups, allowedTeams) {
  if (!Array.isArray(groups) || groups.length !== 6) {
    throw new Error('グループ編成は6チーム分必要です。');
  }

  var byId = {};
  groups.forEach(function(row) {
    byId[normalizeValue_(row && row.id)] = normalizeValue_(row && row.team);
  });
  var normalizedAllowed = allowedTeams.map(normalizeValue_);
  var result = MIE_GROUP_IDS.map(function(id) {
    var team = byId[id];
    if (!team || normalizedAllowed.indexOf(team) < 0) {
      throw new Error(id + 'のチーム名を確認してください。');
    }
    return { id: id, team: team };
  });
  if (uniqueNonEmpty_(result.map(function(row) { return row.team; })).length !== 6) {
    throw new Error('同じチームを複数の識別IDへ設定できません。');
  }
  return result;
}

function validateSchedule_(schedule, allowedTeams) {
  if (!Array.isArray(schedule)) {
    throw new Error('タイムスケジュールを確認できません。');
  }

  var byId = {};
  schedule.forEach(function(row) {
    byId[normalizeValue_(row && row.id)] = row || {};
  });
  var extraOptions = ['T-1 勝者', 'T-2 勝者', 'SF-1 勝者', 'SF-2 勝者', 'Aグループ1位', 'Bグループ1位', '未定'];
  var validTeams = allowedTeams.map(normalizeValue_).concat(extraOptions);

  return MIE_MATCH_DEFINITIONS.map(function(definition) {
    var row = byId[definition.id] || {};
    var team1 = validateSlotValue_(row.team1, validTeams);
    var team2 = validateSlotValue_(row.team2, validTeams);
    // 集計から得た勝者は保存せず、管理者が明示した上書き値だけを保持する。
      // The web UI sends the editable winner field as `winner`; accept the
      // legacy `winnerOverride` name as well so older clients keep working.
      var winnerValue = row.winnerOverride !== undefined ? row.winnerOverride : row.winner;
      var winner = validateSlotValue_(winnerValue, validTeams.concat(['引き分け']));
    var startTime = normalizeValue_(row.startTime);
    if (startTime.length > 12) throw new Error(definition.id + 'の開始時間が長すぎます。');
    return {
      id: definition.id,
      phase: definition.phase,
      startTime: startTime,
      team1: team1,
      team2: team2,
      winner: winner,
      note: normalizeValue_(row.note).slice(0, 100)
    };
  });
}

function validateSlotValue_(value, allowed) {
  var normalized = normalizeValue_(value);
  if (!normalized) return '';
  if (allowed.indexOf(normalized) < 0) {
    throw new Error('チーム枠「' + normalized + '」を確認してください。');
  }
  return normalized;
}

function getEditorKeys_() {
  var properties = PropertiesService.getScriptProperties().getProperties();
  return Object.keys(properties).filter(function(name) {
    return name === 'MANAGEMENT_KEY' || name.indexOf('API_KEY') === 0;
  }).map(function(name) {
    return normalizeKey_(properties[name]);
  }).filter(Boolean);
}

function isEditorAuthorized_(editorKey) {
  var keys = getEditorKeys_();
  if (!keys.length) return true;
  return keys.indexOf(normalizeKey_(editorKey)) >= 0;
}

function assertEditorAuthorized_(editorKey) {
  if (!isEditorAuthorized_(editorKey)) {
    throw new Error('編集キーが一致しません。');
  }
}

function normalizeKey_(value) {
  return normalizeValue_(value).toLowerCase();
}

function createHeaderMap_(headers) {
  var map = {};
  headers.forEach(function(header, index) {
    if (header && map[header] === undefined) map[header] = index;
  });
  return map;
}

function uniqueNonEmpty_(values) {
  var seen = {};
  return values.map(normalizeValue_).filter(function(value) {
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function shuffle_(values) {
  for (var index = values.length - 1; index > 0; index -= 1) {
    var target = Math.floor(Math.random() * (index + 1));
    var current = values[index];
    values[index] = values[target];
    values[target] = current;
  }
  return values;
}

function toNumber_(value) {
  var number = Number(value);
  return isNaN(number) ? 0 : number;
}

function toTimestamp_(value) {
  if (value instanceof Date) return value.getTime();
  var parsed = Date.parse(value);
  return isNaN(parsed) ? 0 : parsed;
}

function normalizeValue_(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\u3000/g, '　').trim();
}

function createErrorResponse_(error) {
  return {
    success: false,
    message: error && error.message ? error.message : '処理に失敗しました。'
  };
}
