var MIE_SPREADSHEET_ID = '185jPLjc-nBri49aOr-CVw1baUI1qaxqjgcWLRS2-oxo';
var MIE_TEAM_SHEET = 'チームリスト';
var MIE_RESULT_SHEET = '試合結果';
var MIE_SETUP_SHEET = '大会編成';
var MIE_TIME_ZONE = 'Asia/Tokyo';
var MIE_BRACKET_DISPLAY_DEFAULTS = {
  orientation: 'horizontal',
  wrapMode: 'auto',
  fontSize: 21,
  boxWidth: 160,
  boxHeight: 170,
  boxBorderWidth: 3,
  lineWidth: 3
};

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
  { id: '3P-1', phase: '3位決定戦' },
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
    var participantCount = groups.filter(function(row) { return row.team; }).length;
    var resultContext = getResultContext_(spreadsheet);
    var standings = buildStandings_(groups, resultContext.rows);
    var schedule = getScheduleRows_(sheet, resultContext.rows, participantCount);
    var keyRequired = getEditorKeys_().length > 0;

    return {
      success: true,
      spreadsheetName: spreadsheet.getName(),
      spreadsheetUrl: spreadsheet.getUrl(),
      teams: teams,
      groups: groups,
      standings: standings,
      schedule: schedule,
      tournamentMode: getTournamentMode_(),
      thirdPlaceEnabled: getThirdPlaceEnabled_(),
      bracketDisplaySettings: getBracketDisplaySettings_(),
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

function randomizeGroups(editorKey, requestedTeams) {
  assertEditorAuthorized_(editorKey);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var spreadsheet = SpreadsheetApp.openById(MIE_SPREADSHEET_ID);
    var sheet = ensureCompetitionSheet_(spreadsheet);
    var teams = getMieTeams_(spreadsheet);
    var allowedTeams = teams.map(normalizeValue_);
    var currentTeams = uniqueNonEmpty_(getGroupRows_(sheet).map(function(row) { return row.team; }));
    var hasRequestedTeams = Array.isArray(requestedTeams);
    var participants = hasRequestedTeams
      ? uniqueNonEmpty_(requestedTeams.map(normalizeValue_))
      : currentTeams;
    participants = participants.filter(function(team) {
      return allowedTeams.indexOf(team) >= 0;
    });
    if (!hasRequestedTeams && (participants.length < 4 || participants.length > 6)) {
      participants = teams.slice(0, 6);
    }
    if (participants.length < 4 || participants.length > 6) {
      throw new Error('参加チームは4〜6チームにしてください。現在は' + participants.length + 'チームです。');
    }

    var shuffled = shuffle_(participants.slice());
    var groupValues = createBalancedGroupValues_(shuffled);
    var groupLabels = createGroupLabels_(groupValues);
    sheet.getRange(3, 2, 6, 2).setValues(groupValues.map(function(team, index) {
      return [groupLabels[index], team];
    }));
    updateGroupScheduleTeams_(sheet, createAssignmentMap_(groupValues));
    SpreadsheetApp.flush();

    return getCompetitionState(editorKey);
  } finally {
    lock.releaseLock();
  }
}

function applyRecommendedBracket(editorKey, requestedMode, requestedThirdPlace) {
  assertEditorAuthorized_(editorKey);
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var spreadsheet = SpreadsheetApp.openById(MIE_SPREADSHEET_ID);
    var sheet = ensureCompetitionSheet_(spreadsheet);
    var tournamentMode = normalizeTournamentMode_(requestedMode);
    var thirdPlaceEnabled = requestedThirdPlace === undefined
      ? getThirdPlaceEnabled_()
      : Boolean(requestedThirdPlace);
    var groups = getGroupRows_(sheet);
    var standings = buildStandings_(groups, getResultContext_(spreadsheet).rows);
    var activeStandings = standings.filter(function(row) { return row.team; }).sort(compareStanding_);
    var isFourTeamRoundRobin = activeStandings.length === 4 && activeStandings.every(function(row) {
      return row.group === '総当たり';
    });
    var groupA = standings.filter(function(row) { return row.group === 'A' && row.team; }).sort(compareStanding_);
    var groupB = standings.filter(function(row) { return row.group === 'B' && row.team; }).sort(compareStanding_);

    if (!isFourTeamRoundRobin && (groupA.length < 2 || groupB.length < 2 || groupA.length + groupB.length < 4)) {
      throw new Error('先に4〜6チームのグループ分けを確定してください。');
    }

    var pairings;
    if (isFourTeamRoundRobin) {
      pairings = {
        'T-1': ['', ''],
        'T-2': ['', ''],
        'SF-1': [activeStandings[0].team, activeStandings[3].team],
        'SF-2': [activeStandings[1].team, activeStandings[2].team],
        '3P-1': ['SF-1 敗者', 'SF-2 敗者'],
        'F-1': ['SF-1 勝者', 'SF-2 勝者']
      };
    } else {
      var firstRoundPairings = createFirstRoundPairings_(groupA, groupB);
      pairings = {
        'T-1': firstRoundPairings[0],
        'T-2': firstRoundPairings[1],
        'SF-1': tournamentMode === 'seed-vs-seed'
          ? [groupA[0].team, groupB[0].team]
          : [groupA[0].team, 'T-2 勝者'],
        'SF-2': tournamentMode === 'seed-vs-seed'
          ? ['T-1 勝者', 'T-2 勝者']
          : [groupB[0].team, 'T-1 勝者'],
        '3P-1': ['SF-1 敗者', 'SF-2 敗者'],
        'F-1': ['SF-1 勝者', 'SF-2 勝者']
      };
    }

    var values = sheet.getRange(3, 10, MIE_MATCH_DEFINITIONS.length, 7).getValues();
    values.forEach(function(row) {
      var pairing = pairings[normalizeValue_(row[0])];
      if (pairing) {
        row[3] = pairing[0];
        row[4] = pairing[1];
        row[5] = '';
        if (normalizeValue_(row[0]) === '3P-1' && !thirdPlaceEnabled) {
          row[3] = '';
          row[4] = '';
        }
      }
    });
    sheet.getRange(3, 10, values.length, 7).setValues(values);
    saveTournamentOptions_(tournamentMode, thirdPlaceEnabled);
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
    var participantCount = validatedGroups.filter(function(row) { return row.team; }).length;
    var validatedSchedule = validateSchedule_(payload.schedule, teams, participantCount);
    var tournamentMode = payload.tournamentMode === undefined
      ? getTournamentMode_()
      : normalizeTournamentMode_(payload.tournamentMode);
    var thirdPlaceEnabled = payload.thirdPlaceEnabled === undefined
      ? getThirdPlaceEnabled_()
      : Boolean(payload.thirdPlaceEnabled);
    var bracketDisplaySettings = payload.bracketDisplaySettings === undefined
      ? getBracketDisplaySettings_()
      : normalizeBracketDisplaySettings_(payload.bracketDisplaySettings);

    sheet.getRange(3, 2, 6, 2).setValues(validatedGroups.map(function(row) {
      return [row.group, row.team];
    }));

    var scheduleValues = validatedSchedule.map(function(row) {
      return [row.id, row.phase, row.startTime, row.team1, row.team2, row.winner, row.note];
    });
    sheet.getRange(3, 10, scheduleValues.length, 7).setValues(scheduleValues);
    saveTournamentOptions_(tournamentMode, thirdPlaceEnabled);
    saveBracketDisplaySettings_(bracketDisplaySettings);
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
  ensureScheduleRows_(sheet);
  return sheet;
}

function ensureScheduleRows_(sheet) {
  var requiredRows = 2 + MIE_MATCH_DEFINITIONS.length;
  if (sheet.getMaxRows() < requiredRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), requiredRows - sheet.getMaxRows());
  }

  var rowCount = Math.max(sheet.getLastRow() - 2, 0);
  var existingIds = rowCount
    ? sheet.getRange(3, 10, rowCount, 1).getDisplayValues().map(function(row) {
        return normalizeValue_(row[0]);
      })
    : [];
  var hasThirdPlace = existingIds.indexOf('3P-1') >= 0;
  var finalIndex = existingIds.indexOf('F-1');
  if (!hasThirdPlace && finalIndex >= 0) {
    sheet.insertRowsBefore(finalIndex + 3, 1);
  }

  var values = sheet.getRange(3, 10, MIE_MATCH_DEFINITIONS.length, 7).getValues();
  var changed = false;
  MIE_MATCH_DEFINITIONS.forEach(function(definition, index) {
    if (!normalizeValue_(values[index][0])) {
      values[index][0] = definition.id;
      values[index][1] = definition.phase;
      changed = true;
    }
  });
  if (changed) {
    sheet.getRange(3, 10, values.length, 7).setValues(values);
  }
}

function initializeCompetitionSheet_(sheet, teams) {
  if (sheet.getMaxColumns() < 16) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), 16 - sheet.getMaxColumns());
  }
  if (sheet.getMaxRows() < 20) {
    sheet.insertRowsAfter(sheet.getMaxRows(), 20 - sheet.getMaxRows());
  }

  var teamValues = createBalancedGroupValues_(teams.slice(0, 6));
  var groupLabels = createGroupLabels_(teamValues);

  sheet.getRange('A1:I1').merge().setValue('グループ編成・予選順位');
  sheet.getRange('A2:I2').setValues([['識別ID', 'グループ', 'チーム名', '勝ち点', '違反数', '得点', '紫', '順位', '区分']]);
  sheet.getRange('A3:C8').setValues(MIE_GROUP_IDS.map(function(id, index) {
    return [id, groupLabels[index], teamValues[index]];
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
    sheet.getRange(row, 9).setFormula('=IF(OR(H' + row + '="",B' + row + '="総当たり"),"",IF(H' + row + '=1,"シード",""))');
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
  var teams = values.map(function(row) { return normalizeValue_(row[2]); });
  var groupLabels = createGroupLabels_(teams);
  return values.map(function(row, index) {
    var id = normalizeValue_(row[0]) || MIE_GROUP_IDS[index];
    return {
      id: id,
      group: groupLabels[index],
      team: teams[index]
    };
  });
}

function getScheduleRows_(sheet, resultRows, participantCount) {
  var values = sheet.getRange(3, 10, MIE_MATCH_DEFINITIONS.length, 7).getDisplayValues();
  return values.map(function(row, index) {
    var definition = MIE_MATCH_DEFINITIONS[index];
    var item = {
      id: normalizeValue_(row[0]) || definition.id,
      phase: index < 6
        ? getPreliminaryPhase_(participantCount, index)
        : normalizeValue_(row[1]) || definition.phase,
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
      if (group.team && result.type === '予選' && result.team === group.team) {
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

  uniqueNonEmpty_(standings.map(function(row) {
    return row.team ? row.group : '';
  })).forEach(function(groupId) {
    var groupRows = standings.filter(function(row) { return row.group === groupId && row.team; });
    groupRows.sort(compareStanding_);
    groupRows.forEach(function(row, index) {
      row.rank = index + 1;
      row.seed = groupId !== '総当たり' && index === 0;
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
  var pairIds = createGroupPairIds_(assignment);
  var participantCount = Object.keys(assignment).filter(function(id) { return assignment[id]; }).length;
  var phaseValues = [];
  var values = sheet.getRange(3, 13, 6, 2).getValues();
  pairIds.forEach(function(pair, index) {
    phaseValues.push([getPreliminaryPhase_(participantCount, index)]);
    values[index][0] = pair[0] ? assignment[pair[0]] || '' : '';
    values[index][1] = pair[1] ? assignment[pair[1]] || '' : '';
  });
  sheet.getRange(3, 11, 6, 1).setValues(phaseValues);
  sheet.getRange(3, 13, 6, 2).setValues(values);
}

function createBalancedGroupValues_(teams) {
  var participants = uniqueNonEmpty_((teams || []).map(normalizeValue_)).slice(0, 6);
  if (participants.length === 4) {
    return [participants[0], participants[1], participants[2], participants[3], '', ''];
  }
  var values = participants.slice();
  while (values.length < 6) values.push('');
  return values;
}

function createGroupPairIds_(assignment) {
  var activeIds = MIE_GROUP_IDS.filter(function(id) { return assignment[id]; });
  if (activeIds.length === 4) {
    return [
      [activeIds[0], activeIds[1]],
      [activeIds[0], activeIds[2]],
      [activeIds[0], activeIds[3]],
      [activeIds[1], activeIds[2]],
      [activeIds[1], activeIds[3]],
      [activeIds[2], activeIds[3]]
    ];
  }
  var pairs = [];
  ['A', 'B'].forEach(function(groupId) {
    var ids = MIE_GROUP_IDS.filter(function(id) {
      return id.charAt(0) === groupId && assignment[id];
    });
    var groupPairs = [];
    if (ids.length === 3) {
      groupPairs = [[ids[0], ids[1]], [ids[1], ids[2]], [ids[2], ids[0]]];
    } else if (ids.length === 2) {
      groupPairs = [[ids[0], ids[1]]];
    }
    while (groupPairs.length < 3) groupPairs.push(['', '']);
    pairs = pairs.concat(groupPairs.slice(0, 3));
  });
  return pairs;
}

function createGroupLabels_(teams) {
  var participantCount = uniqueNonEmpty_((teams || []).map(normalizeValue_)).length;
  if (participantCount === 4) {
    return ['総当たり', '総当たり', '総当たり', '総当たり', '', ''];
  }
  return ['A', 'A', 'A', 'B', 'B', 'B'];
}

function getPreliminaryPhase_(participantCount, index) {
  return participantCount === 4
    ? '4チーム総当たり予選'
    : (index < 3 ? 'Aグループ予選' : 'Bグループ予選');
}

function createFirstRoundPairings_(groupA, groupB) {
  var secondA = groupA[1] ? groupA[1].team : '';
  var thirdA = groupA[2] ? groupA[2].team : '';
  var secondB = groupB[1] ? groupB[1].team : '';
  var thirdB = groupB[2] ? groupB[2].team : '';
  if (thirdA && thirdB) {
    return [[secondA, thirdB], [secondB, thirdA]];
  }
  if (thirdA) {
    return [[secondA, secondB], [thirdA, '']];
  }
  if (thirdB) {
    return [[secondB, secondA], [thirdB, '']];
  }
  return [[secondA, ''], [secondB, '']];
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
    throw new Error('グループ編成の6枠を確認してください。');
  }

  var byId = {};
  groups.forEach(function(row) {
    byId[normalizeValue_(row && row.id)] = normalizeValue_(row && row.team);
  });
  var normalizedAllowed = allowedTeams.map(normalizeValue_);
  var result = MIE_GROUP_IDS.map(function(id) {
    var team = byId[id] || '';
    if (team && normalizedAllowed.indexOf(team) < 0) {
      throw new Error(id + 'のチーム名を確認してください。');
    }
    return { id: id, team: team };
  });
  var participantTeams = result.map(function(row) { return row.team; }).filter(Boolean);
  if (participantTeams.length < 4 || participantTeams.length > 6) {
    throw new Error('参加チームは4〜6チームにしてください。');
  }
  if (uniqueNonEmpty_(participantTeams).length !== participantTeams.length) {
    throw new Error('同じチームを複数の識別IDへ設定できません。');
  }
  if (participantTeams.length === 4) {
    return MIE_GROUP_IDS.map(function(id, index) {
      return {
        id: id,
        group: index < 4 ? '総当たり' : '',
        team: participantTeams[index] || ''
      };
    });
  }
  var groupACount = result.filter(function(row) { return row.id.charAt(0) === 'A' && row.team; }).length;
  var groupBCount = participantTeams.length - groupACount;
  if (groupACount < 2 || groupBCount < 2 || Math.abs(groupACount - groupBCount) > 1) {
    throw new Error('A・Bグループを2〜3チームずつ、人数差1以内にしてください。');
  }
  return result.map(function(row) {
    row.group = row.id.charAt(0);
    return row;
  });
}

function validateSchedule_(schedule, allowedTeams, participantCount) {
  if (!Array.isArray(schedule)) {
    throw new Error('タイムスケジュールを確認できません。');
  }

  var byId = {};
  schedule.forEach(function(row) {
    byId[normalizeValue_(row && row.id)] = row || {};
  });
  var extraOptions = [
    'T-1 勝者', 'T-2 勝者', 'SF-1 勝者', 'SF-2 勝者',
    'SF-1 敗者', 'SF-2 敗者', '3P-1 勝者', '3P-1 敗者',
    'Aグループ1位', 'Bグループ1位', '未定'
  ];
  var validTeams = allowedTeams.map(normalizeValue_).concat(extraOptions);

  return MIE_MATCH_DEFINITIONS.map(function(definition, index) {
    var row = byId[definition.id] || {};
    var team1 = validateSlotValue_(row.team1, validTeams);
    var team2 = validateSlotValue_(row.team2, validTeams);
    // 集計から得た勝者は保存せず、管理者が明示した上書き値だけを保持する。
    // 旧クライアントの winnerOverride も引き続き受け付ける。
    var winnerValue = row.winnerOverride !== undefined ? row.winnerOverride : row.winner;
    var winner = validateSlotValue_(winnerValue, validTeams.concat(['引き分け']));
    var startTime = normalizeValue_(row.startTime);
    if (startTime.length > 12) throw new Error(definition.id + 'の開始時間が長すぎます。');
    return {
      id: definition.id,
      phase: index < 6 ? getPreliminaryPhase_(participantCount, index) : definition.phase,
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

function normalizeTournamentMode_(value) {
  return normalizeValue_(value) === 'seed-vs-seed' ? 'seed-vs-seed' : 'seed-vs-winner';
}

function getTournamentMode_() {
  return normalizeTournamentMode_(PropertiesService.getScriptProperties().getProperty('MIE_TOURNAMENT_MODE'));
}

function getThirdPlaceEnabled_() {
  var value = PropertiesService.getScriptProperties().getProperty('MIE_THIRD_PLACE_ENABLED');
  return String(value).toLowerCase() === 'true';
}

function saveTournamentOptions_(mode, thirdPlaceEnabled) {
  var properties = PropertiesService.getScriptProperties();
  properties.setProperty('MIE_TOURNAMENT_MODE', normalizeTournamentMode_(mode));
  properties.setProperty('MIE_THIRD_PLACE_ENABLED', thirdPlaceEnabled ? 'true' : 'false');
}

function normalizeBracketDisplaySettings_(settings) {
  settings = settings && typeof settings === 'object' ? settings : {};
  var wrapModes = ['auto', '6', '8', '10', 'none'];
  return {
    orientation: settings.orientation === 'vertical' ? 'vertical' : 'horizontal',
    wrapMode: wrapModes.indexOf(String(settings.wrapMode || '')) >= 0
      ? String(settings.wrapMode)
      : MIE_BRACKET_DISPLAY_DEFAULTS.wrapMode,
    fontSize: clampSettingNumber_(settings.fontSize, 14, 30, MIE_BRACKET_DISPLAY_DEFAULTS.fontSize),
    boxWidth: clampSettingNumber_(settings.boxWidth, 120, 176, MIE_BRACKET_DISPLAY_DEFAULTS.boxWidth),
    boxHeight: clampSettingNumber_(settings.boxHeight, 110, 400, MIE_BRACKET_DISPLAY_DEFAULTS.boxHeight),
    boxBorderWidth: clampSettingNumber_(settings.boxBorderWidth, 1, 7, MIE_BRACKET_DISPLAY_DEFAULTS.boxBorderWidth),
    lineWidth: clampSettingNumber_(settings.lineWidth, 2, 7, MIE_BRACKET_DISPLAY_DEFAULTS.lineWidth)
  };
}

function clampSettingNumber_(value, minimum, maximum, fallback) {
  var number = Number(value);
  if (!isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}

function getBracketDisplaySettings_() {
  var raw = PropertiesService.getScriptProperties().getProperty('MIE_BRACKET_DISPLAY_SETTINGS');
  if (!raw) return normalizeBracketDisplaySettings_(MIE_BRACKET_DISPLAY_DEFAULTS);
  try {
    return normalizeBracketDisplaySettings_(JSON.parse(raw));
  } catch (error) {
    return normalizeBracketDisplaySettings_(MIE_BRACKET_DISPLAY_DEFAULTS);
  }
}

function saveBracketDisplaySettings_(settings) {
  PropertiesService.getScriptProperties().setProperty(
    'MIE_BRACKET_DISPLAY_SETTINGS',
    JSON.stringify(normalizeBracketDisplaySettings_(settings))
  );
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
