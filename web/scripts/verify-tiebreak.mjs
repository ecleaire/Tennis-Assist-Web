import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const mainSource = fs.readFileSync(new URL("../src/main.ts", import.meta.url), "utf8");
const gasSource = fs.readFileSync(new URL("../../GAS_WebApp.gs", import.meta.url), "utf8");

const appFunction = mainSource.match(/function decideOverallWinner[\s\S]*?\n}\n(?=const csvColumns)/)?.[0];
const gasFunction = gasSource.match(/function seriesResultWinnerSide[\s\S]*?\n}\n(?=\nfunction writeSeriesResultRows)/)?.[0];
if (!appFunction || !gasFunction) throw new Error("Tie-break implementation could not be located.");

const appJavaScript = ts.transpileModule(appFunction, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const appContext = {
  priorityTeamMatchTypes: new Set(["決勝トーナメント", "4位決定リーグ", "優勝決定リーグ"]),
};
vm.createContext(appContext);
vm.runInContext(`${appJavaScript}; this.decide = decideOverallWinner;`, appContext);

const gasContext = {};
vm.createContext(gasContext);
vm.runInContext(`${gasFunction}; this.decide = seriesResultWinnerSide;`, gasContext);

function expected(matchType, value) {
  if (value.teamAWins !== value.teamBWins) return value.teamAWins > value.teamBWins ? "a" : "b";
  if (!["決勝トーナメント", "4位決定リーグ", "優勝決定リーグ"].includes(matchType)) return "draw";
  if (value.teamAViolations !== value.teamBViolations) return value.teamAViolations < value.teamBViolations ? "a" : "b";
  if (value.teamAScore !== value.teamBScore) return value.teamAScore < value.teamBScore ? "a" : "b";
  if (value.teamAPurple !== value.teamBPurple) return value.teamAPurple > value.teamBPurple ? "a" : "b";
  return "draw";
}

function verify(matchType, value, label) {
  const wanted = expected(matchType, value);
  const appResult = appContext.decide(matchType, value).side;
  const gasResult = gasContext.decide({
    matchType,
    aWins: value.teamAWins,
    bWins: value.teamBWins,
    aViolations: value.teamAViolations,
    bViolations: value.teamBViolations,
    aScore: value.teamAScore,
    bScore: value.teamBScore,
    aPurple: value.teamAPurple,
    bPurple: value.teamBPurple,
    overallWinner: "intentionally-wrong-stale-client-value",
  });
  if (appResult !== wanted || gasResult !== wanted) {
    throw new Error(`${label}: expected=${wanted}, app=${appResult}, gas=${gasResult}`);
  }
}

const base = {
  teamAWins: 1, teamBWins: 1,
  teamAViolations: 0, teamBViolations: 0,
  teamAScore: 0, teamBScore: 0,
  teamAPurple: 0, teamBPurple: 0,
};
verify("予選", { ...base, teamAViolations: 9 }, "Qualifying tie remains a draw");
verify("予選", { ...base, teamAWins: 0, teamBWins: 0 }, "All qualifying matches drawn");
verify("決勝トーナメント", { ...base, teamAWins: 2, teamBWins: 1, teamAViolations: 9 }, "Wins have first priority");
verify("決勝トーナメント", { ...base, teamAViolations: 0, teamBViolations: 1 }, "Fewer violations wins");
verify("4位決定リーグ", { ...base, teamAScore: 3, teamBScore: -1 }, "Lower score wins");
verify("優勝決定リーグ", { ...base, teamAPurple: 2, teamBPurple: 1 }, "More purple balls wins");
verify("決勝トーナメント", base, "Complete tie remains a draw");

const matchTypes = ["練習", "予選", "決勝トーナメント", "4位決定リーグ", "優勝決定リーグ"];
for (let index = 0; index < 20_000; index += 1) {
  const random = {
    teamAWins: Math.floor(Math.random() * 4),
    teamBWins: Math.floor(Math.random() * 4),
    teamAViolations: Math.floor(Math.random() * 4),
    teamBViolations: Math.floor(Math.random() * 4),
    teamAScore: Math.floor(Math.random() * 31) - 10,
    teamBScore: Math.floor(Math.random() * 31) - 10,
    teamAPurple: Math.floor(Math.random() * 7),
    teamBPurple: Math.floor(Math.random() * 7),
  };
  verify(matchTypes[index % matchTypes.length], random, `Random case ${index + 1}`);
}

console.log("Tie-break verification passed: 7 fixed cases and 20,000 randomized cases (app + GAS)." );
