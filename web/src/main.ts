import "./styles.css";

type Screen = "dashboard" | "timer" | "balls" | "records" | "rules" | "news" | "links" | "development";
type Category = "【終了・その時点で採点】（通常の試合停止）" | "【違反・自動敗北 / 失格】試合前・競技全般" | "【違反・自動敗北 / 失格】試合中の違反";

interface MatchRecord {
  recordId: string;
  timestamp: string;
  recordKind: "マッチ" | "試合結果";
  seriesId: string;
  seriesNumber: number;
  court: string;
  competitionId: string;
  matchNumber: number;
  matchType: "練習試合";
  teamA: string;
  teamB: string;
  result: "勝ち" | "負け" | "引き分け";
  winner: string;
  targetTeam: string;
  reasonCategory: Category;
  endReason: string;
  teamAOrange: number;
  teamAPurple: number;
  teamBOrange: number;
  teamBPurple: number;
  teamAScore: number;
  teamAViolations?: number;
  teamBScore: number;
  teamBViolations?: number;
  teamAWins?: number;
  teamALosses?: number;
  teamBWins?: number;
  teamBLosses?: number;
  draws?: number;
  overallWinner?: string;
  notes?: string;
}

interface Series {
  id: string;
  court: string;
  seriesNumber: number;
  teamA: string;
  teamB: string;
  records: MatchRecord[];
}

interface RuleSection {
  id: string;
  title: string;
  subtitle: string;
  pages: string;
  summary: string;
  keywords: string[];
  points: string[];
}

interface NewsItem {
  id: string;
  title: string;
  category: string;
  date: string;
  summary: string;
  content: string;
}

interface Summary {
  teamAWins: number;
  teamBWins: number;
  draws: number;
  teamAOrange: number;
  teamAPurple: number;
  teamBOrange: number;
  teamBPurple: number;
  teamAScore: number;
  teamBScore: number;
  teamAViolations: number;
  teamBViolations: number;
}

interface AdminSettings {
  gasUrl: string;
  apiKey: string;
  sendEnabled: boolean;
}

let teams = [
  "ALFA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL",
  "INDIA", "JULIETT", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA",
  "QUEBEC", "SIERRA", "TANGO", "UNIFORM", "VICTOR", "WHISKEY", "YANKEE", "ZULU",
];
const csvColumns = [
  "日時", "記録種別", "種別", "対戦ID", "コート", "試合番号", "マッチ番号", "チームA", "チームB",
  "チームA勝数", "チームA敗数", "チームAオレンジ", "チームA紫", "チームA得点", "チームA違反数",
  "チームB勝数", "チームB敗数", "チームBオレンジ", "チームB紫", "チームB得点", "チームB違反数",
  "引き分け数", "総合勝者", "マッチ勝者", "結果", "終了カテゴリ", "終了理由", "対象チーム", "メモ",
] as const;

const scoringCategory: Category = "【終了・その時点で採点】（通常の試合停止）";
const prematchCategory: Category = "【違反・自動敗北 / 失格】試合前・競技全般";
const inmatchCategory: Category = "【違反・自動敗北 / 失格】試合中の違反";
const reasons: Record<Category, string[]> = {
  [scoringCategory]: [
    "時間切れでの終了(6.32.1)", "コールドルールの成立(6.32.4)", "偶発的な接触(6.28)",
    "ボールの過剰操作(6.30)", "両チーム合意による停止(6.32.9)",
  ],
  [prematchCategory]: ["倫理規定違反(3.1-3.10)", "車検（チェック）不合格(6.1.2)", "遅刻(6.10)", "不正なデータ入力(6.17)"],
  [inmatchCategory]: [
    "開始後10秒間の不動(6.20)", "両ロボットの撤去(6.21 / 6.32.10)", "分離パーツの違反(6.23)",
    "外部からの合図・入力(6.24)", "レッドゾーンへの接触(6.27)", "故意のロボット接触(6.28)",
    "相手陣地・ロボットへの接触(6.29 / 6.32.2)", "サイズ制限の超過(6.32.3)",
    "意図的なコールド誘発(6.32.4)", "人間による接触(6.32.5)", "両ロボットの脱走(6.32.6)",
    "ボールの破損(6.32.7)", "フィールド・設備の破損(6.32.8)", "無許可の移動・撤去(6.33)",
  ],
};

function el<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  return found as T;
}

function options(select: HTMLSelectElement, values: readonly string[], selected = values[0]): void {
  select.replaceChildren(...values.map((value) => new Option(value, value, false, value === selected)));
}

function rangeOptions(select: HTMLSelectElement, max: number, selected: number): void {
  options(select, Array.from({ length: max + 1 }, (_, i) => String(i)), String(selected));
}

function escapeText(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] ?? character));
}

function timestamp(): string {
  const date = new Date();
  const two = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

function recordKey(record: MatchRecord): string {
  return record.competitionId || `${record.recordKind}:${record.seriesId}:${record.court}:${record.seriesNumber}:${record.matchNumber}`;
}

function csvEscape(value: unknown): string {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvRow(record: MatchRecord): string[] {
  return [
    record.timestamp, record.recordKind, record.matchType, record.seriesId, record.court, record.seriesNumber, record.matchNumber,
    record.teamA, record.teamB, record.teamAWins ?? "", record.teamALosses ?? "", record.teamAOrange, record.teamAPurple,
    record.teamAScore, record.teamAViolations ?? (record.reasonCategory !== scoringCategory && record.targetTeam === record.teamA ? 1 : 0),
    record.teamBWins ?? "", record.teamBLosses ?? "", record.teamBOrange, record.teamBPurple, record.teamBScore,
    record.teamBViolations ?? (record.reasonCategory !== scoringCategory && record.targetTeam === record.teamB ? 1 : 0), record.draws ?? "",
    record.overallWinner ?? "", record.winner, record.result, record.reasonCategory, record.endReason, record.targetTeam, record.notes ?? "",
  ].map(String);
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted && char === '"' && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  row.push(value);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

class TimerController {
  private readonly mode = el<HTMLElement>("timer-mode");
  private readonly time = el<HTMLOutputElement>("timer-time");
  private readonly progress = el<HTMLProgressElement>("timer-progress");
  private readonly notice = el<HTMLElement>("cold-notice");
  private readonly caption = el<HTMLElement>("sub-caption");
  private readonly subTime = el<HTMLOutputElement>("sub-time");
  private readonly dashboardTime = el<HTMLOutputElement>("dashboard-time");
  private readonly dashboardMode = el<HTMLElement>("dashboard-mode");
  private readonly startButton = el<HTMLButtonElement>("timer-start");
  private readonly dashboardStartButton = el<HTMLButtonElement>("dashboard-timer-start");
  private readonly resetButton = el<HTMLButtonElement>("timer-reset");
  private readonly step = el<HTMLSelectElement>("timer-step");
  private total = 90;
  private remaining = 90;
  private running = false;
  private started = false;
  private notifiedFinish = false;
  private lastFrame = performance.now();
  private coldShown = false;
  private coldUntil = 0;
  private subRemaining = 0;
  private subCaption = "";
  private randomStep: number | "manual" = 5;
  private manualSeconds = 90;
  private secret = false;

  constructor(private readonly finished: () => void) {
    this.startButton.addEventListener("click", () => this.toggle());
    this.dashboardStartButton.addEventListener("click", () => this.toggle());
    el<HTMLButtonElement>("timer-end").addEventListener("click", () => this.end());
    el<HTMLButtonElement>("dashboard-timer-end").addEventListener("click", () => this.end());
    this.resetButton.addEventListener("click", () => this.reset());
    el<HTMLButtonElement>("dashboard-timer-reset").addEventListener("click", () => this.reset());
    el<HTMLButtonElement>("timer-fullscreen").addEventListener("click", () => void this.toggleFullscreen());
    el<HTMLButtonElement>("timer-ten").addEventListener("click", () => this.toggleSubTimer(10, "コールド カウント"));
    el<HTMLButtonElement>("timer-five").addEventListener("click", () => this.toggleSubTimer(5, "オーバーボール カウント"));
    this.step.addEventListener("change", () => this.chooseStep());
    this.setupManualOptions();
    el<HTMLButtonElement>("manual-apply").addEventListener("click", () => this.applyManual());
    document.addEventListener("keydown", (event) => this.onKey(event));
    document.addEventListener("fullscreenchange", () => this.setCompact(Boolean(document.fullscreenElement)));
    this.reset();
    requestAnimationFrame((now) => this.frame(now));
  }

  setSecret(active: boolean): void {
    this.secret = active;
    this.setupManualOptions();
  }

  prepare(): void {
    this.reset();
  }

  private chooseStep(): void {
    if (this.step.value === "manual") {
      el<HTMLDialogElement>("manual-dialog").showModal();
      return;
    }
    this.randomStep = Number(this.step.value);
    this.reset();
  }

  private setupManualOptions(): void {
    const maxMinutes = this.secret ? 120 : 2;
    const minute = Math.min(Math.floor(this.manualSeconds / 60), maxMinutes);
    rangeOptions(el<HTMLSelectElement>("manual-minute"), maxMinutes, minute);
    rangeOptions(el<HTMLSelectElement>("manual-second"), 59, this.manualSeconds % 60);
  }

  private applyManual(): void {
    const minutes = Number(el<HTMLSelectElement>("manual-minute").value);
    const seconds = Number(el<HTMLSelectElement>("manual-second").value);
    this.manualSeconds = Math.max(1, minutes * 60 + seconds);
    this.randomStep = "manual";
    this.step.value = "manual";
    this.reset();
  }

  private generatedDuration(): number {
    if (this.randomStep === "manual") return this.manualSeconds;
    const count = Math.floor((120 - 60) / this.randomStep) + 1;
    return 60 + Math.floor(Math.random() * count) * this.randomStep;
  }

  private reset(): void {
    this.running = false;
    this.started = false;
    this.notifiedFinish = false;
    this.total = this.generatedDuration();
    this.remaining = this.total;
    this.mode.textContent = "試合準備完了";
    this.coldShown = false;
    this.coldUntil = 0;
    this.notice.textContent = "";
    this.subRemaining = 0;
    this.subTime.classList.add("hidden");
    this.caption.textContent = "Space / Enter: 開始　F: 全画面";
    this.caption.classList.remove("count");
    this.syncControls();
    this.render();
  }

  private toggle(): void {
    if (this.running) this.pause();
    else this.start();
  }

  private start(): void {
    if (this.remaining <= 0) return;
    this.running = true;
    this.started = true;
    this.mode.textContent = "試合進行中";
    this.caption.textContent = "";
    this.notice.textContent = this.coldUntil > performance.now() ? "ここからコールドが適応されます" : "";
    this.syncControls();
  }

  private pause(): void {
    this.running = false;
    this.mode.textContent = "一時停止中";
    this.caption.textContent = "Space / Enter: 再開　F: 全画面";
    this.notice.textContent = "タイマーを一時停止しています";
    this.syncControls();
  }

  private end(): void {
    this.running = false;
    this.remaining = 0;
    this.mode.textContent = "終了";
    this.notice.textContent = "";
    this.caption.textContent = "ランダム再生成で新しいタイマーを作れます。";
    this.syncControls();
    this.render();
    this.emitFinish();
  }

  private emitFinish(): void {
    if (this.started && !this.notifiedFinish) {
      this.notifiedFinish = true;
      this.finished();
    }
  }

  private frame(now: number): void {
    const delta = Math.max(0, now - this.lastFrame) / 1000;
    this.lastFrame = now;
    if (this.running) {
      this.remaining = Math.max(0, this.remaining - delta);
      if (!this.coldShown && this.total - this.remaining >= 30) {
        this.coldShown = true;
        this.coldUntil = now + 10000;
      }
      if (this.coldUntil > now) this.notice.textContent = "ここからコールドが適応されます";
      else if (this.notice.textContent !== "タイマーを一時停止しています") this.notice.textContent = "";
      if (this.remaining === 0) {
        this.running = false;
        this.mode.textContent = "終了";
        this.caption.textContent = "ランダム再生成で新しいタイマーを作れます。";
        this.syncControls();
        this.emitFinish();
      }
    }
    if (this.subRemaining > 0) {
      this.subRemaining = Math.max(0, this.subRemaining - delta);
      if (this.subRemaining === 0) {
        this.subTime.classList.add("hidden");
        this.caption.classList.remove("count");
        this.caption.textContent = this.running ? "" : "Space / Enter: 開始　F: 全画面";
      }
    }
    this.render();
    requestAnimationFrame((next) => this.frame(next));
  }

  private render(): void {
    const whole = Math.ceil(this.remaining);
    const formatted = `${String(Math.floor(whole / 60)).padStart(2, "0")} : ${String(whole % 60).padStart(2, "0")}`;
    this.time.textContent = formatted;
    this.dashboardTime.textContent = formatted;
    this.dashboardMode.textContent = this.mode.textContent;
    this.progress.value = this.total ? (this.remaining / this.total) * 100 : 0;
    const warning = this.remaining <= 10;
    this.time.classList.toggle("warning", warning);
    this.progress.classList.toggle("warning", warning);
    if (this.subRemaining > 0) this.subTime.textContent = `00 : ${String(Math.ceil(this.subRemaining)).padStart(2, "0")}`;
  }

  private syncControls(): void {
    const startLabel = this.running ? "停止" : this.remaining < this.total && this.remaining > 0 ? "再開" : "開始";
    this.startButton.textContent = startLabel;
    this.dashboardStartButton.textContent = startLabel;
    this.resetButton.disabled = this.running;
    el<HTMLButtonElement>("dashboard-timer-reset").disabled = this.running;
    this.step.disabled = this.running;
  }

  private toggleSubTimer(seconds: number, label: string): void {
    if (this.subRemaining > 0 && this.subCaption === label) {
      this.subRemaining = 0;
      this.subTime.classList.add("hidden");
      this.caption.classList.remove("count");
      this.caption.textContent = this.running ? "" : "Space / Enter: 開始　F: 全画面";
      return;
    }
    this.subRemaining = seconds;
    this.subCaption = label;
    this.subTime.classList.remove("hidden");
    this.caption.classList.add("count");
    this.caption.textContent = label;
    this.render();
  }

  private onKey(event: KeyboardEvent): void {
    if (!el("screen-timer").classList.contains("active") || event.repeat) return;
    if (event.key === "Enter") {
      event.preventDefault();
      this.toggle();
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      void this.toggleFullscreen();
    }
  }

  private async toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      this.setCompact(true);
    } else {
      await document.exitFullscreen?.();
      this.setCompact(false);
    }
  }

  private setCompact(compact: boolean): void {
    document.body.classList.toggle("compact", compact);
    el<HTMLButtonElement>("timer-fullscreen").textContent = compact ? "全画面解除" : "全画面";
  }
}

class BallController {
  private readonly court = el<HTMLElement>("court");
  private readonly dashboardCourt = el<HTMLElement>("dashboard-court");
  private workflowMatch = 0;
  private readonly leftRows = [19.35, 40.15, 68.54, 89.51];
  private readonly rightRows = [10.16, 31.45, 59.68, 80.65];
  private readonly leftSlots = [22.03, 28.35];
  private readonly rightSlots = [71.56, 77.97];
  private readonly defaults = [
    ["orange", 22.03, 19.35], ["orange", 22.03, 40.15], ["orange", 22.03, 68.54], ["orange", 22.03, 89.51],
    ["orange", 77.97, 10.16], ["orange", 77.97, 31.45], ["orange", 77.97, 59.68], ["orange", 77.97, 80.65],
    ["purple", 28.35, 19.35], ["purple", 71.56, 80.65], ["orange", 50.08, 49.99],
  ] as const;

  constructor(private readonly ready: (match: number) => void) {
    el<HTMLButtonElement>("balls-random").addEventListener("click", () => this.randomize());
    el<HTMLButtonElement>("dashboard-random").addEventListener("click", () => this.randomize());
    el<HTMLButtonElement>("balls-reset").addEventListener("click", () => this.reset());
    el<HTMLButtonElement>("balls-ready").addEventListener("click", () => this.complete());
    this.draw(this.defaults);
  }

  beginWorkflow(match: number): void {
    this.workflowMatch = match;
    this.randomize();
    el<HTMLButtonElement>("balls-ready").classList.remove("hidden");
  }

  private reset(): void {
    this.draw(this.defaults);
    el("balls-status").textContent = "ボール配置を調整済みの初期位置へ戻しました。";
    if (this.workflowMatch) el("balls-ready").classList.add("hidden");
  }

  private randomize(): void {
    const side = this.leftRows.map(() => Math.round(Math.random()));
    const purpleRow = Math.floor(Math.random() * 4);
    const generated: Array<readonly [string, number, number]> = [];
    this.leftRows.forEach((row, index) => {
      generated.push(["orange", this.leftSlots[side[index]], row]);
      generated.push(["orange", this.rightSlots[1 - side[index]], this.rightRows[3 - index]]);
    });
    generated.push(["purple", this.leftSlots[1 - side[purpleRow]], this.leftRows[purpleRow]]);
    generated.push(["purple", this.rightSlots[side[purpleRow]], this.rightRows[3 - purpleRow]]);
    generated.push(["orange", 50.08, 49.99]);
    this.draw(generated);
    el("balls-status").textContent = "ボール配置を生成しました。";
  }

  private draw(layout: ReadonlyArray<readonly [string, number, number]>): void {
    [this.court, this.dashboardCourt].forEach((court) => {
      if (!court.children.length) layout.forEach(() => court.append(document.createElement("span")));
      layout.forEach(([color, x, y], index) => {
        const ball = court.children[index] as HTMLElement;
        ball.className = `ball ${color}`;
        ball.style.left = `${x}%`;
        ball.style.top = `${y}%`;
      });
    });
  }

  private complete(): void {
    if (!this.workflowMatch) return;
    const match = this.workflowMatch;
    this.workflowMatch = 0;
    el<HTMLButtonElement>("balls-ready").classList.add("hidden");
    this.ready(match);
  }
}

class RecordsController {
  private readonly storageKey = "tennis-assist-records-v1";
  private readonly teamStorageKey = "tennis-assist-teams-v1";
  private records: MatchRecord[] = [];
  private series: Series | null = null;
  private editing = 0;
  private agreedA = false;
  private agreedB = false;
  private finalized = false;

  constructor(private readonly flow: (event: "start" | "next" | "balls" | "timer" | "finished", match?: number) => void) {
    this.records = this.loadRecords();
    this.loadTeams();
    this.setupInputs();
    el<HTMLButtonElement>("series-start").addEventListener("click", () => this.startSeries());
    el<HTMLButtonElement>("series-reset").addEventListener("click", () => this.resetSeries());
    el<HTMLButtonElement>("record-save").addEventListener("click", () => this.confirmSave());
    el<HTMLButtonElement>("confirm-save").addEventListener("click", () => this.save());
    el<HTMLButtonElement>("back-balls").addEventListener("click", () => { if (this.series && !this.isFinished()) this.flow("balls", this.nextMatch()); });
    el<HTMLButtonElement>("back-timer").addEventListener("click", () => { if (this.series && !this.isFinished()) this.flow("timer", this.nextMatch()); });
    el<HTMLButtonElement>("agree-a").addEventListener("click", () => { this.agreedA = true; this.renderAgreement(); });
    el<HTMLButtonElement>("agree-b").addEventListener("click", () => { this.agreedB = true; this.renderAgreement(); });
    el<HTMLButtonElement>("finalize").addEventListener("click", () => this.finalize());
    el<HTMLSelectElement>("stats-team").addEventListener("change", () => this.renderStats());
    el<HTMLSelectElement>("stats-period").addEventListener("change", () => this.renderStats());
    ["history-team", "history-result", "history-kind", "history-sort"].forEach((id) => {
      el<HTMLSelectElement>(id).addEventListener("change", () => this.renderHistory());
    });
    el<HTMLButtonElement>("team-save").addEventListener("click", () => this.saveTeams());
    el<HTMLButtonElement>("team-reset").addEventListener("click", () => this.resetTeams());
    el<HTMLButtonElement>("team-import").addEventListener("click", () => el<HTMLInputElement>("team-file").click());
    el<HTMLInputElement>("team-file").addEventListener("change", (event) => void this.importTeams(event));
    el<HTMLButtonElement>("history-export").addEventListener("click", () => this.exportHistory());
    el<HTMLButtonElement>("history-import").addEventListener("click", () => el<HTMLInputElement>("history-file").click());
    el<HTMLInputElement>("history-file").addEventListener("change", (event) => void this.importHistory(event));
    el<HTMLButtonElement>("history-clear").addEventListener("click", () => this.clearHistory());
    this.resetSeries();
    this.renderHistory();
  }

  timerFinished(): void {
    if (!this.series || this.isFinished()) return;
    el("record-status").textContent = "試合結果を入力して、保存前確認を行ってください。";
    el("record-input").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  private setupInputs(): void {
    options(el<HTMLSelectElement>("team-a"), teams, teams[0]);
    options(el<HTMLSelectElement>("team-b"), teams, teams[1]);
    options(el<HTMLSelectElement>("stats-team"), ["チームを選択", ...teams], "チームを選択");
    options(el<HTMLSelectElement>("history-team"), ["すべてのチーム", ...teams], "すべてのチーム");
    options(el<HTMLSelectElement>("court-select"), Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)}コート`), "Aコート");
    el<HTMLTextAreaElement>("team-editor").value = teams.join("\n");
    options(el<HTMLSelectElement>("reason-category"), Object.keys(reasons), scoringCategory);
    rangeOptions(el<HTMLSelectElement>("a-orange"), 9, 0);
    rangeOptions(el<HTMLSelectElement>("b-orange"), 9, 0);
    rangeOptions(el<HTMLSelectElement>("a-purple"), 2, 0);
    rangeOptions(el<HTMLSelectElement>("b-purple"), 2, 2);
    this.refreshEndReasons();
    ["reason-category", "end-reason", "target-team", "a-orange", "b-orange", "a-purple", "b-purple"].forEach((id) => {
      el<HTMLSelectElement>(id).addEventListener("change", () => this.inputChanged(id));
    });
  }

  private inputChanged(id: string): void {
    if (id === "reason-category") this.refreshEndReasons();
    if (id === "a-purple") el<HTMLSelectElement>("b-purple").value = String(2 - Number(el<HTMLSelectElement>("a-purple").value));
    if (id === "b-purple") el<HTMLSelectElement>("a-purple").value = String(2 - Number(el<HTMLSelectElement>("b-purple").value));
    this.renderScores();
  }

  private startSeries(): void {
    const teamA = el<HTMLSelectElement>("team-a").value;
    const teamB = el<HTMLSelectElement>("team-b").value;
    if (teamA === teamB) {
      el("record-status").textContent = "同じチーム同士では開始できません。";
      return;
    }
    const court = el<HTMLSelectElement>("court-select").value;
    const seriesNumber = this.nextSeriesNumber(court);
    this.series = { id: `${court}_${String(seriesNumber).padStart(2, "0")}_${Date.now()}`, court, seriesNumber, teamA, teamB, records: [] };
    this.editing = 0;
    this.agreedA = false;
    this.agreedB = false;
    this.finalized = false;
    this.resetInput();
    this.renderSeries();
    el("record-status").textContent = "対戦カードを開始しました。ボール配置から進行します。";
    this.flow("start", 1);
  }

  private resetSeries(): void {
    this.series = null;
    this.editing = 0;
    this.agreedA = false;
    this.agreedB = false;
    this.finalized = false;
    this.resetInput();
    el("series-label").textContent = "対戦カード: 未選択";
    el("match-progress").textContent = "進行状況: 対戦を開始してください";
    el("match-title").textContent = "第1マッチ リザルト入力";
    el("match-teams").textContent = "対戦カード未選択";
    el("a-name").textContent = "チームA";
    el("b-name").textContent = "チームB";
    el("record-status").textContent = "まずは対戦カードを開始してください。";
    this.renderTables();
    this.renderAgreement();
  }

  private resetInput(): void {
    el<HTMLSelectElement>("reason-category").value = scoringCategory;
    this.refreshEndReasons();
    el<HTMLSelectElement>("a-orange").value = "0";
    el<HTMLSelectElement>("b-orange").value = "0";
    el<HTMLSelectElement>("a-purple").value = "0";
    el<HTMLSelectElement>("b-purple").value = "2";
    this.renderScores();
  }

  private refreshEndReasons(): void {
    const category = el<HTMLSelectElement>("reason-category").value as Category;
    options(el<HTMLSelectElement>("end-reason"), reasons[category]);
    const violation = category !== scoringCategory;
    el("target-field").classList.toggle("hidden", !violation);
    if (this.series) options(el<HTMLSelectElement>("target-team"), ["対象チーム未選択", this.series.teamA, this.series.teamB], "対象チーム未選択");
    else options(el<HTMLSelectElement>("target-team"), ["対象チーム未選択"]);
  }

  private scoreData(): Pick<MatchRecord, "teamAScore" | "teamBScore" | "winner" | "result" | "targetTeam"> {
    const teamA = this.series?.teamA ?? "チームA";
    const teamB = this.series?.teamB ?? "チームB";
    const category = el<HTMLSelectElement>("reason-category").value as Category;
    const violation = category !== scoringCategory;
    const targetTeam = el<HTMLSelectElement>("target-team").value;
    let teamAScore = Number(el<HTMLSelectElement>("a-orange").value) - Number(el<HTMLSelectElement>("a-purple").value) * 2;
    let teamBScore = Number(el<HTMLSelectElement>("b-orange").value) - Number(el<HTMLSelectElement>("b-purple").value) * 2;
    if (violation && targetTeam === teamA) [teamAScore, teamBScore] = [9, -4];
    if (violation && targetTeam === teamB) [teamAScore, teamBScore] = [-4, 9];
    const result = teamAScore < teamBScore ? "勝ち" : teamBScore < teamAScore ? "負け" : "引き分け";
    const winner = result === "勝ち" ? teamA : result === "負け" ? teamB : "引き分け";
    return { teamAScore, teamBScore, winner, result, targetTeam: violation ? targetTeam : winner };
  }

  private renderScores(): void {
    const score = this.scoreData();
    el("a-score").textContent = `得点 ${score.teamAScore}`;
    el("b-score").textContent = `得点 ${score.teamBScore}`;
    el("winner-preview").textContent = `勝者: ${score.winner}`;
  }

  private buildRecord(): MatchRecord | null {
    if (!this.series) return null;
    const category = el<HTMLSelectElement>("reason-category").value as Category;
    if (category !== scoringCategory && el<HTMLSelectElement>("target-team").value === "対象チーム未選択") {
      el("record-status").textContent = "違反したチームを選択してください。";
      return null;
    }
    const orangeTotal = Number(el<HTMLSelectElement>("a-orange").value) + Number(el<HTMLSelectElement>("b-orange").value);
    if (orangeTotal !== 8 && orangeTotal !== 9) {
      el("record-status").textContent = "オレンジボールの合計は8個または9個にしてください。";
      return null;
    }
    const purpleTotal = Number(el<HTMLSelectElement>("a-purple").value) + Number(el<HTMLSelectElement>("b-purple").value);
    if (purpleTotal !== 2) {
      el("record-status").textContent = "紫ボールの合計は必ず2個にしてください。";
      return null;
    }
    const matchNumber = this.editing || this.nextMatch();
    const competitionId = `${this.series.court.charAt(0)}_${String(this.series.seriesNumber).padStart(2, "0")}_${matchNumber}`;
    return {
      recordId: `${this.series.id}_match_${matchNumber}`,
      timestamp: timestamp(),
      recordKind: "マッチ",
      seriesId: this.series.id,
      seriesNumber: this.series.seriesNumber,
      court: this.series.court,
      competitionId,
      matchNumber,
      matchType: "練習試合",
      teamA: this.series.teamA,
      teamB: this.series.teamB,
      reasonCategory: category,
      endReason: el<HTMLSelectElement>("end-reason").value,
      teamAOrange: Number(el<HTMLSelectElement>("a-orange").value),
      teamAPurple: Number(el<HTMLSelectElement>("a-purple").value),
      teamBOrange: Number(el<HTMLSelectElement>("b-orange").value),
      teamBPurple: Number(el<HTMLSelectElement>("b-purple").value),
      notes: "シリーズ進行記録",
      ...this.scoreData(),
    };
  }

  private confirmSave(): void {
    const record = this.buildRecord();
    if (!record) return;
    el("confirm-detail").textContent =
      `第${record.matchNumber}マッチ\n${record.teamA} vs ${record.teamB}\n終了理由: ${record.endReason}\n勝者: ${record.winner}\n` +
      `${record.teamA}: オレンジ${record.teamAOrange} / 紫${record.teamAPurple} / 得点${record.teamAScore}\n` +
      `${record.teamB}: オレンジ${record.teamBOrange} / 紫${record.teamBPurple} / 得点${record.teamBScore}`;
    el<HTMLDialogElement>("confirm-dialog").showModal();
  }

  private save(): void {
    const record = this.buildRecord();
    if (!record || !this.series) return;
    if (this.editing) {
      const index = this.series.records.findIndex((item) => item.matchNumber === this.editing);
      if (index >= 0) this.series.records[index] = record;
      const storedIndex = this.records.findIndex((item) => item.seriesId === record.seriesId && item.matchNumber === record.matchNumber);
      if (storedIndex >= 0) this.records[storedIndex] = record;
      this.editing = 0;
      this.agreedA = false;
      this.agreedB = false;
    } else {
      this.series.records.push(record);
      this.records.unshift(record);
    }
    localStorage.setItem(this.storageKey, JSON.stringify(this.records));
    this.resetInput();
    this.renderSeries();
    this.renderHistory();
    if (this.isFinished()) {
      el("record-status").textContent = `第${record.matchNumber}マッチを保存しました。代表同意後に結果を確定します。`;
      this.renderAgreement();
    } else {
      el("record-status").textContent = `第${record.matchNumber}マッチを保存しました。次のマッチへ進みます。`;
      this.flow("next", this.nextMatch());
    }
  }

  private renderSeries(): void {
    if (!this.series) return;
    const number = Math.min(this.editing || this.nextMatch(), 3);
    el("series-label").textContent = `対戦カード: ${this.series.teamA} vs ${this.series.teamB} / ${this.series.court} 第${this.series.seriesNumber}試合`;
    el("match-progress").textContent = `進行状況: 第${number}マッチ / 全3マッチ`;
    el("match-title").textContent = `第${number}マッチ リザルト入力`;
    el("match-teams").textContent = `${this.series.teamA} vs ${this.series.teamB}`;
    el("a-name").textContent = this.series.teamA;
    el("b-name").textContent = this.series.teamB;
    this.refreshEndReasons();
    this.renderScores();
    this.renderTables();
    this.renderAgreement();
  }

  private editRecord(matchNumber: number): void {
    if (!this.series) return;
    const record = this.series.records.find((item) => item.matchNumber === matchNumber);
    if (!record) return;
    this.editing = matchNumber;
    el<HTMLSelectElement>("reason-category").value = record.reasonCategory;
    this.refreshEndReasons();
    el<HTMLSelectElement>("end-reason").value = record.endReason;
    el<HTMLSelectElement>("target-team").value = record.targetTeam;
    el<HTMLSelectElement>("a-orange").value = String(record.teamAOrange);
    el<HTMLSelectElement>("a-purple").value = String(record.teamAPurple);
    el<HTMLSelectElement>("b-orange").value = String(record.teamBOrange);
    el<HTMLSelectElement>("b-purple").value = String(record.teamBPurple);
    this.renderSeries();
    el("record-status").textContent = `保存すると第${matchNumber}マッチの結果を上書きします。`;
    el("record-input").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  private renderTables(): void {
    const entries = this.series?.records ?? [];
    const intermediate = el<HTMLTableElement>("intermediate-table");
    intermediate.innerHTML = "<thead><tr><th>マッチ</th><th>終了理由</th><th>A 橙/紫/得点</th><th>B 橙/紫/得点</th><th>勝者</th><th></th></tr></thead>";
    const body = intermediate.createTBody();
    entries.forEach((record) => {
      const row = body.insertRow();
      row.className = "win";
      row.innerHTML = `<td>第${record.matchNumber}</td><td>${escapeText(record.endReason)}</td><td>${record.teamAOrange} / ${record.teamAPurple} / ${record.teamAScore}</td><td>${record.teamBOrange} / ${record.teamBPurple} / ${record.teamBScore}</td><td>${escapeText(record.winner)}</td><td><button class="button tiny">再入力</button></td>`;
      row.querySelector("button")?.addEventListener("click", () => this.editRecord(record.matchNumber));
    });
    el("intermediate-summary").textContent = entries.length ? "現在の中間結果です。各マッチは再入力できます。" : "第1マッチの保存後に中間結果が表示されます。";
    this.renderFinal();
  }

  private summary(): Summary {
    const empty: Summary = { teamAWins: 0, teamBWins: 0, draws: 0, teamAOrange: 0, teamAPurple: 0, teamBOrange: 0, teamBPurple: 0, teamAScore: 0, teamBScore: 0, teamAViolations: 0, teamBViolations: 0 };
    return (this.series?.records ?? []).reduce((sum, record) => {
      sum.teamAOrange += record.teamAOrange;
      sum.teamAPurple += record.teamAPurple;
      sum.teamBOrange += record.teamBOrange;
      sum.teamBPurple += record.teamBPurple;
      sum.teamAScore += record.teamAScore;
      sum.teamBScore += record.teamBScore;
      if (record.winner === this.series?.teamA) sum.teamAWins += 1;
      else if (record.winner === this.series?.teamB) sum.teamBWins += 1;
      else sum.draws += 1;
      if (record.reasonCategory !== scoringCategory && record.targetTeam === this.series?.teamA) sum.teamAViolations += 1;
      if (record.reasonCategory !== scoringCategory && record.targetTeam === this.series?.teamB) sum.teamBViolations += 1;
      return sum;
    }, empty);
  }

  private overallWinner(sum: Summary): "a" | "b" | "draw" {
    if (sum.teamAWins !== sum.teamBWins) return sum.teamAWins > sum.teamBWins ? "a" : "b";
    if (sum.teamAScore !== sum.teamBScore) return sum.teamAScore < sum.teamBScore ? "a" : "b";
    return "draw";
  }

  private renderFinal(): void {
    const table = el<HTMLTableElement>("final-table");
    table.innerHTML = "<thead><tr><th>チーム</th><th>勝利数</th><th>総橙</th><th>総紫</th><th>違反</th><th>総スコア</th><th>状態</th></tr></thead>";
    if (!this.series?.records.length) {
      el("final-summary").textContent = "3マッチ終了後、最終結果を確認できます。";
      return;
    }
    const sum = this.summary();
    const winner = this.overallWinner(sum);
    const body = table.createTBody();
    const add = (team: string, side: "a" | "b"): void => {
      const won = winner === side;
      const state = !this.isFinished() ? (won ? "暫定1位" : "集計中") : won ? "勝ち" : winner === "draw" ? "引き分け" : "負け";
      const row = body.insertRow();
      if (won) row.className = "win";
      const values = side === "a" ? [sum.teamAWins, sum.teamAOrange, sum.teamAPurple, sum.teamAViolations, sum.teamAScore] : [sum.teamBWins, sum.teamBOrange, sum.teamBPurple, sum.teamBViolations, sum.teamBScore];
      row.innerHTML = `<td>${escapeText(team)}</td><td>${values[0]}</td><td>${values[1]}</td><td>${values[2]}</td><td>${values[3]}</td><td>${values[4]}</td><td>${state}</td>`;
    };
    add(this.series.teamA, "a");
    add(this.series.teamB, "b");
    el("final-summary").textContent = this.isFinished()
      ? winner === "draw" ? "総合結果: 引き分け" : `総合結果: ${winner === "a" ? this.series.teamA : this.series.teamB} の勝ち`
      : `途中集計: 勝利マッチ数 ${sum.teamAWins} - ${sum.teamBWins} / 引き分け ${sum.draws}`;
  }

  private renderAgreement(): void {
    const box = el("agreement");
    const visible = Boolean(this.series && this.isFinished());
    box.classList.toggle("hidden", !visible);
    if (!visible || !this.series) return;
    el<HTMLButtonElement>("agree-a").textContent = `${this.series.teamA}代表 同意${this.agreedA ? "済" : ""}`;
    el<HTMLButtonElement>("agree-b").textContent = `${this.series.teamB}代表 同意${this.agreedB ? "済" : ""}`;
    el<HTMLButtonElement>("finalize").disabled = this.finalized || !(this.agreedA && this.agreedB);
  }

  private finalize(): void {
    if (!this.agreedA || !this.agreedB || !this.series) return;
    this.finalized = true;
    const sum = this.summary();
    const resultSide = this.overallWinner(sum);
    const winner = resultSide === "a" ? this.series.teamA : resultSide === "b" ? this.series.teamB : "引き分け";
    const record: MatchRecord = {
      recordId: `${this.series.id}_result`,
      timestamp: timestamp(),
      recordKind: "試合結果",
      seriesId: this.series.id,
      seriesNumber: this.series.seriesNumber,
      court: this.series.court,
      competitionId: `${this.series.court.charAt(0)}_${String(this.series.seriesNumber).padStart(2, "0")}_RESULT`,
      matchNumber: 0,
      matchType: "練習試合",
      teamA: this.series.teamA,
      teamB: this.series.teamB,
      teamAWins: sum.teamAWins,
      teamALosses: sum.teamBWins,
      teamBWins: sum.teamBWins,
      teamBLosses: sum.teamAWins,
      draws: sum.draws,
      overallWinner: winner,
      result: resultSide === "a" ? "勝ち" : resultSide === "b" ? "負け" : "引き分け",
      winner: "",
      targetTeam: winner,
      reasonCategory: scoringCategory,
      endReason: "3マッチ終了・代表同意済み",
      teamAOrange: sum.teamAOrange,
      teamAPurple: sum.teamAPurple,
      teamBOrange: sum.teamBOrange,
      teamBPurple: sum.teamBPurple,
      teamAScore: sum.teamAScore,
      teamBScore: sum.teamBScore,
      teamAViolations: sum.teamAViolations,
      teamBViolations: sum.teamBViolations,
      notes: `両チーム代表同意済み / ${this.series.teamA} ${sum.teamAWins}勝 / ${this.series.teamB} ${sum.teamBWins}勝 / 引き分け${sum.draws}`,
    };
    this.records.unshift(record);
    localStorage.setItem(this.storageKey, JSON.stringify(this.records));
    this.renderHistory();
    el("record-status").textContent = "両チーム代表の同意を確認し、試合結果を確定しました。";
    void this.sendSeriesResult(record);
    this.renderAgreement();
    this.flow("finished");
  }

  private renderHistory(): void {
    const host = el("history");
    host.replaceChildren();
    const team = el<HTMLSelectElement>("history-team").value;
    const result = el<HTMLSelectElement>("history-result").value;
    const kind = el<HTMLSelectElement>("history-kind").value;
    const visible = this.records.filter((record) => {
      if (team !== "すべてのチーム" && record.teamA !== team && record.teamB !== team) return false;
      if (kind === "match" && record.recordKind !== "マッチ") return false;
      if (kind === "series" && record.recordKind !== "試合結果") return false;
      if (result === "all") return true;
      const judged = team === "すべてのチーム" ? record.overallWinner || record.winner : (record.overallWinner || record.winner) === team ? "win" : (record.overallWinner || record.winner) === "引き分け" ? "draw" : "loss";
      return team === "すべてのチーム" ? (result === "draw" ? judged === "引き分け" : true) : judged === result;
    });
    if (el<HTMLSelectElement>("history-sort").value === "old") visible.reverse();
    if (!visible.length) {
      host.innerHTML = '<p class="muted">保存された試合記録はありません。</p>';
    }
    visible.forEach((record) => {
      const card = document.createElement("article");
      card.className = "history-card";
      const number = record.recordKind === "マッチ" ? `第${record.matchNumber}マッチ` : "試合結果";
      const winner = record.overallWinner || record.winner;
      card.innerHTML = `<h3>${escapeText(record.teamA)} vs ${escapeText(record.teamB)}</h3><p class="muted">${escapeText(record.timestamp)} | ${escapeText(record.court)} 第${record.seriesNumber}試合 | ${number}</p><p>終了理由: ${escapeText(record.endReason)}<br>A 橙${record.teamAOrange} 紫${record.teamAPurple} 得点${record.teamAScore} / B 橙${record.teamBOrange} 紫${record.teamBPurple} 得点${record.teamBScore} / 勝者 ${escapeText(winner)}</p>`;
      host.append(card);
    });
    el("history-status").textContent = `保存済み ${this.records.length}件 / 表示 ${visible.length}件`;
    this.renderStats();
  }

  private renderStats(): void {
    const team = el<HTMLSelectElement>("stats-team").value;
    const host = el("stats-cards");
    if (team === "チームを選択") {
      host.replaceChildren();
      return;
    }
    const days = { today: 1, week: 7, month: 31 }[el<HTMLSelectElement>("stats-period").value] ?? 1;
    const since = Date.now() - days * 86400000;
    const related = this.records.filter((record) => record.recordKind === "マッチ" && (record.teamA === team || record.teamB === team) && new Date(record.timestamp.replace(" ", "T")).getTime() >= since);
    const wins = related.filter((record) => record.winner === team).length;
    const draws = related.filter((record) => record.winner === "引き分け").length;
    const violations = related.filter((record) => record.reasonCategory !== scoringCategory && record.targetTeam === team).length;
    const rate = related.length ? (wins / related.length) * 100 : 0;
    const stats = [["マッチ数", related.length.toString()], ["勝敗", `${wins}勝 ${related.length - wins - draws}敗 ${draws}分`], ["勝率", `${rate.toFixed(1)}%`], ["違反数", String(violations)]];
    host.innerHTML = stats.map(([label, value]) => `<article class="stat"><span class="muted">${label}</span><b>${value}</b></article>`).join("");
  }

  private loadRecords(): MatchRecord[] {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(this.storageKey) ?? "[]");
      if (!Array.isArray(parsed)) return [];
      return (parsed as Array<Partial<MatchRecord>>).map((record) => ({
        recordId: record.recordId ?? `${record.seriesId ?? "imported"}_${record.matchNumber ?? 0}`,
        timestamp: record.timestamp ?? timestamp(),
        recordKind: record.recordKind ?? "マッチ",
        seriesId: record.seriesId ?? "",
        seriesNumber: record.seriesNumber ?? 1,
        court: record.court ?? "Aコート",
        competitionId: record.competitionId ?? "",
        matchNumber: record.matchNumber ?? 1,
        matchType: "練習試合",
        teamA: record.teamA ?? "",
        teamB: record.teamB ?? "",
        result: record.result ?? "引き分け",
        winner: record.winner ?? "",
        targetTeam: record.targetTeam ?? "",
        reasonCategory: record.reasonCategory ?? scoringCategory,
        endReason: record.endReason ?? "",
        teamAOrange: record.teamAOrange ?? 0,
        teamAPurple: record.teamAPurple ?? 0,
        teamBOrange: record.teamBOrange ?? 0,
        teamBPurple: record.teamBPurple ?? 0,
        teamAScore: record.teamAScore ?? 0,
        teamBScore: record.teamBScore ?? 0,
        ...record,
      }));
    } catch {
      return [];
    }
  }

  private loadTeams(): void {
    try {
      const local = JSON.parse(localStorage.getItem(this.teamStorageKey) ?? "null") as unknown;
      if (Array.isArray(local) && local.length >= 2) teams = local.map(String);
    } catch {
      localStorage.removeItem(this.teamStorageKey);
    }
  }

  private applyTeams(next: string[]): void {
    teams = Array.from(new Set(next.map((team) => team.trim()).filter(Boolean)));
    if (teams.length < 2) {
      el("team-status").textContent = "チームは2件以上入力してください。";
      return;
    }
    localStorage.setItem(this.teamStorageKey, JSON.stringify(teams));
    const currentA = el<HTMLSelectElement>("team-a").value;
    const currentB = el<HTMLSelectElement>("team-b").value;
    options(el<HTMLSelectElement>("team-a"), teams, teams.includes(currentA) ? currentA : teams[0]);
    options(el<HTMLSelectElement>("team-b"), teams, teams.includes(currentB) ? currentB : teams[1]);
    options(el<HTMLSelectElement>("stats-team"), ["チームを選択", ...teams]);
    options(el<HTMLSelectElement>("history-team"), ["すべてのチーム", ...teams]);
    el<HTMLTextAreaElement>("team-editor").value = teams.join("\n");
    el("team-status").textContent = `${teams.length}チームをこの端末に保存しました。`;
  }

  private saveTeams(): void {
    this.applyTeams(el<HTMLTextAreaElement>("team-editor").value.split(/\r?\n|,/));
  }

  private resetTeams(): void {
    localStorage.removeItem(this.teamStorageKey);
    teams = ["ALFA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL", "INDIA", "JULIETT", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA", "QUEBEC", "SIERRA", "TANGO", "UNIFORM", "VICTOR", "WHISKEY", "YANKEE", "ZULU"];
    this.applyTeams(teams);
  }

  private async importTeams(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    const header = rows[0]?.map((cell) => cell.trim()) ?? [];
    const nameIndex = header.indexOf("チーム名");
    const names = rows.slice(nameIndex >= 0 ? 1 : 0).map((row) => row[nameIndex >= 0 ? nameIndex : row.length - 1]);
    this.applyTeams(names);
    (event.target as HTMLInputElement).value = "";
  }

  private exportHistory(): void {
    if (!this.records.length) {
      el("history-status").textContent = "エクスポートできる履歴がありません。";
      return;
    }
    const text = "\uFEFF" + [csvColumns.map(csvEscape).join(","), ...[...this.records].reverse().map((record) => csvRow(record).map(csvEscape).join(","))].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    link.download = `tennis_assist_history_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    el("history-status").textContent = `${this.records.length}件をCSVに保存しました。`;
  }

  private async importHistory(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
    const names = rows.shift() ?? [];
    const at = (row: string[], name: string): string => row[names.indexOf(name)] ?? "";
    const imported = rows.map((row): MatchRecord => ({
      recordId: at(row, "対戦ID") + "_" + at(row, "マッチ番号"),
      timestamp: at(row, "日時"),
      recordKind: at(row, "記録種別") === "試合結果" ? "試合結果" : "マッチ",
      matchType: "練習試合",
      seriesId: at(row, "対戦ID"),
      court: at(row, "コート") || "Aコート",
      seriesNumber: Number(at(row, "試合番号")) || 1,
      competitionId: `${at(row, "コート").charAt(0)}_${at(row, "試合番号")}_${at(row, "マッチ番号")}`,
      matchNumber: Number(at(row, "マッチ番号")) || 0,
      teamA: at(row, "チームA"),
      teamB: at(row, "チームB"),
      teamAWins: Number(at(row, "チームA勝数")) || undefined,
      teamALosses: Number(at(row, "チームA敗数")) || undefined,
      teamBWins: Number(at(row, "チームB勝数")) || undefined,
      teamBLosses: Number(at(row, "チームB敗数")) || undefined,
      draws: Number(at(row, "引き分け数")) || undefined,
      overallWinner: at(row, "総合勝者"),
      winner: at(row, "マッチ勝者"),
      result: (at(row, "結果") as MatchRecord["result"]) || "引き分け",
      reasonCategory: (at(row, "終了カテゴリ") as Category) || scoringCategory,
      endReason: at(row, "終了理由"),
      targetTeam: at(row, "対象チーム"),
      teamAOrange: Number(at(row, "チームAオレンジ")) || 0,
      teamAPurple: Number(at(row, "チームA紫")) || 0,
      teamBOrange: Number(at(row, "チームBオレンジ")) || 0,
      teamBPurple: Number(at(row, "チームB紫")) || 0,
      teamAScore: Number(at(row, "チームA得点")) || 0,
      teamAViolations: Number(at(row, "チームA違反数")) || 0,
      teamBScore: Number(at(row, "チームB得点")) || 0,
      teamBViolations: Number(at(row, "チームB違反数")) || 0,
      notes: at(row, "メモ"),
    })).filter((record) => record.teamA || record.teamB);
    const keys = new Set(this.records.map(recordKey));
    const additions = imported.filter((record) => !keys.has(recordKey(record)));
    this.records = [...additions.reverse(), ...this.records];
    localStorage.setItem(this.storageKey, JSON.stringify(this.records));
    this.renderHistory();
    el("history-status").textContent = `${file.name} から${additions.length}件を追加しました。重複${imported.length - additions.length}件はスキップしました。`;
    (event.target as HTMLInputElement).value = "";
  }

  private clearHistory(): void {
    if (!this.records.length || !window.confirm(`この端末の対戦履歴 ${this.records.length}件をすべて削除しますか？`)) return;
    this.records = [];
    localStorage.setItem(this.storageKey, "[]");
    this.renderHistory();
    el("history-status").textContent = "この端末の対戦履歴をすべて削除しました。";
  }

  private async sendSeriesResult(record: MatchRecord): Promise<void> {
    const settings = AdminController.settings();
    if (!settings.sendEnabled) {
      el("record-status").textContent = "試合結果を保存しました。スプレッドシート送信はOFFです。";
      return;
    }
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      el("record-status").textContent = "試合結果を保存しました。GAS URLまたはAPIキーを確認してください。";
      return;
    }
    const details = [...(this.series?.records ?? []), record].map((item) => ({ record_id: item.recordId, csv_row: csvRow(item) }));
    const body = { api_key: settings.apiKey, event: "series_result", target_sheet: "match_records", source: "WRO RoboSports Assist", sent_at: timestamp(), record_id: record.recordId, payload: record, csv_columns: [...csvColumns], csv_row: csvRow(record), detail_sheet: "match_records_detail", detail_rows: details };
    el("record-status").textContent = "試合結果を保存しました。スプレッドシートへ送信中...";
    try {
      await fetch(settings.gasUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      el("record-status").textContent = "試合結果を保存し、スプレッドシートへ送信しました。";
    } catch {
      el("record-status").textContent = "試合結果は保存しました。スプレッドシート送信に失敗しました。";
    }
  }

  private nextMatch(): number {
    return (this.series?.records.length ?? 0) + 1;
  }

  private nextSeriesNumber(court: string): number {
    const seriesIds = new Set(
      this.records.filter((record) => record.court === court && record.seriesId).map((record) => record.seriesId),
    );
    return seriesIds.size + 1;
  }

  private isFinished(): boolean {
    return (this.series?.records.length ?? 0) >= 3;
  }
}

class ContentController {
  private rules: RuleSection[] = [];
  private news: NewsItem[] = [];
  private selectedRule = "";

  async init(): Promise<void> {
    this.renderLinks(false);
    el<HTMLInputElement>("rule-search").addEventListener("input", () => this.renderRules());
    el<HTMLSelectElement>("news-filter").addEventListener("change", () => this.renderNews());
    document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => el<HTMLDialogElement>((button as HTMLElement).dataset.close ?? "").close()));
    await Promise.all([this.loadRules(), this.loadNews()]);
  }

  renderLinks(secret: boolean): void {
    const sections = [
      { title: "WRO", links: [["WRO Japan ホームページ", "https://www.wroj.org/action/2026"], ["WRO 兵庫 ホームページ", "https://wro-hyogo.jp/"], ["WRO 東京 ホームページ", "https://www.wro-tokyo-competition.net/"], ["WRO 奈良 ホームページ", "https://sites.google.com/view/wro-nara/%E3%83%AD%E3%83%9C%E3%82%B9%E3%83%9D%E3%83%BC%E3%83%84"]] },
      { title: "公式資料", links: [["Q&A", "https://wro-association.org/competition/questions-answers/"], ["ルール", "https://wro-association.org/competition/2026-season/"], ["英語ルール PDF", "https://wro-association.org/wp-content/uploads/WRO-2026-RoboSports-Double-Tennis-General-Rules.pdf"], ["Google 翻訳ルール", "https://drive.google.com/file/d/16zFJ_bD8sfLZZF6QkRCWQ6azN_Dj3eUG/view?usp=sharing"], ["DeepL 翻訳ルール", "https://drive.google.com/file/d/1z_Q7M7lP2Q55Zo3qZgzH-bN_QqhCx-wJ/view?usp=sharing"]] },
      { title: "その他", links: [["YouTube まとめ", "https://youtube.com/playlist?list=PL5-Hc8xo0J3mKylDKfNnTaFIZ6hqDSZnh&si=ynhNr2ROkDVN0j4Y"], ...(secret ? [["旧テニスタイマー", "https://scratch.mit.edu/projects/1013694253"], ["旧 litlink", "https://lit.link/syukugawalink"]] : [])] },
    ];
    el("links-list").innerHTML = sections.map((section) => `<article class="link-section"><h3>${section.title}</h3><div class="link-grid">${section.links.map(([label, url]) => `<a class="button" target="_blank" rel="noopener" href="${url}">${label}</a>`).join("")}</div></article>`).join("");
  }

  private async loadRules(): Promise<void> {
    const response = await fetch(`${import.meta.env.BASE_URL}data/rules_sections.json`);
    const data = await response.json() as { sections: RuleSection[] };
    this.rules = data.sections;
    this.selectedRule = this.rules[0]?.id ?? "";
    this.renderRuleNav();
    this.renderRules();
  }

  private renderRuleNav(): void {
    const nav = el("rule-nav");
    nav.replaceChildren();
    this.rules.forEach((section) => {
      const button = document.createElement("button");
      button.className = `button ${section.id === this.selectedRule ? "primary" : ""}`;
      button.textContent = section.title;
      button.addEventListener("click", () => {
        this.selectedRule = section.id;
        this.renderRuleNav();
        this.renderRules();
      });
      nav.append(button);
    });
  }

  private renderRules(): void {
    const host = el("rule-content");
    const query = el<HTMLInputElement>("rule-search").value.trim().toLowerCase();
    const matches = query
      ? this.rules.filter((section) => JSON.stringify(section).toLowerCase().includes(query))
      : this.rules.filter((section) => section.id === this.selectedRule);
    if (!matches.length) {
      host.innerHTML = "<p>一致するルールがありません。</p>";
      return;
    }
    host.innerHTML = matches.map((section) => `<article class="${query ? "rule-result" : ""}"><p class="eyebrow">PAGES ${escapeText(section.pages)} / ${escapeText(section.subtitle)}</p><h2>${escapeText(section.title)}</h2><p>${escapeText(section.summary)}</p><ul>${section.points.map((point) => `<li>${escapeText(point)}</li>`).join("")}</ul></article>`).join("");
  }

  private async loadNews(): Promise<void> {
    const response = await fetch(`${import.meta.env.BASE_URL}data/news.json`);
    const data = await response.json() as { news: NewsItem[] };
    this.news = data.news;
    el("news-status").textContent = "最新情報を表示しています。";
    this.renderNews();
  }

  private renderNews(): void {
    const category = el<HTMLSelectElement>("news-filter").value;
    const visible = this.news.filter((item) => category === "すべて" || item.category === category);
    el("news-list").innerHTML = visible.map((item) => `<article class="news-card"><h3>${escapeText(item.title)}</h3><p class="muted">${escapeText(item.category)} | ${escapeText(item.date)}</p><p>${escapeText(item.summary)}</p><button class="button" data-news="${escapeText(item.id)}">詳細を見る</button></article>`).join("");
    document.querySelectorAll<HTMLButtonElement>("[data-news]").forEach((button) => button.addEventListener("click", () => this.openNews(button.dataset.news ?? "")));
  }

  private openNews(id: string): void {
    const item = this.news.find((candidate) => candidate.id === id);
    if (!item) return;
    el("news-detail-title").textContent = item.title;
    el("news-detail-meta").textContent = `${item.category} | ${item.date}`;
    el("news-detail-content").textContent = item.content;
    el<HTMLDialogElement>("news-dialog").showModal();
  }
}

class AdminController {
  private static readonly storageKey = "tennis-assist-admin-v1";
  private static readonly gateHash = "31749b1d44f155c116ce285a185146310ce0cd131f77cc1e4e1546d97feef275";

  constructor() {
    el<HTMLButtonElement>("admin-unlock").addEventListener("click", () => void this.unlock());
    el<HTMLButtonElement>("gas-save").addEventListener("click", () => this.save());
    el<HTMLButtonElement>("gas-test").addEventListener("click", () => void this.test());
    this.populate();
  }

  static settings(): AdminSettings {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) ?? "{}") as Partial<AdminSettings>;
      return { gasUrl: parsed.gasUrl ?? "", apiKey: parsed.apiKey ?? "", sendEnabled: Boolean(parsed.sendEnabled) };
    } catch {
      return { gasUrl: "", apiKey: "", sendEnabled: false };
    }
  }

  private populate(): void {
    const settings = AdminController.settings();
    el<HTMLInputElement>("gas-url").value = settings.gasUrl;
    el<HTMLInputElement>("gas-key").value = settings.apiKey;
    el<HTMLInputElement>("gas-enabled").checked = settings.sendEnabled;
  }

  private async unlock(): Promise<void> {
    const password = el<HTMLInputElement>("admin-password").value;
    const encoded = new TextEncoder().encode(password);
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
    const digest = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (digest !== AdminController.gateHash && !["rsam", "gas", "wrorsam"].includes(password)) {
      el("gas-status").textContent = "パスワードを確認してください。";
      return;
    }
    el("admin-settings").classList.remove("hidden");
    el("admin-gate").classList.add("hidden");
    el("gas-status").textContent = "管理者設定を表示しました。";
  }

  private save(): void {
    const settings: AdminSettings = {
      gasUrl: el<HTMLInputElement>("gas-url").value.trim(),
      apiKey: el<HTMLInputElement>("gas-key").value,
      sendEnabled: el<HTMLInputElement>("gas-enabled").checked,
    };
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    el("gas-status").textContent = "この端末に設定を保存しました。";
  }

  private async test(): Promise<void> {
    this.save();
    const settings = AdminController.settings();
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      el("gas-status").textContent = "GAS Web アプリ URL（/exec）と API キーを入力してください。";
      return;
    }
    el("gas-status").textContent = "テスト送信中...";
    try {
      const body = { api_key: settings.apiKey, event: "connection_test", source: "WRO RoboSports Assist", sent_at: timestamp(), payload: { message: "Web app connection test" } };
      await fetch(settings.gasUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      el("gas-status").textContent = "テスト送信を完了しました。スプレッドシート側も確認してください。";
    } catch {
      el("gas-status").textContent = "テスト送信に失敗しました。URL と公開設定を確認してください。";
    }
  }
}

class Application {
  private linksClicks = 0;
  private secret = false;
  private readonly timer: TimerController;
  private readonly balls: BallController;
  private readonly records: RecordsController;
  private readonly content = new ContentController();
  private recordTimerPending = false;

  constructor() {
    new AdminController();
    this.timer = new TimerController(() => {
      if (this.recordTimerPending) {
        this.recordTimerPending = false;
        this.clearFlow();
        this.show("records");
        this.records.timerFinished();
      }
    });
    this.balls = new BallController((match) => {
      this.setFlow(match, "タイマー待機中");
      this.recordTimerPending = true;
      this.timer.prepare();
      this.show("timer");
    });
    this.records = new RecordsController((event, match) => this.handleFlow(event, match));
    document.querySelectorAll<HTMLButtonElement>(".nav").forEach((button) => {
      button.addEventListener("click", () => {
        const screen = button.dataset.screen as Screen;
        if (screen === "links") this.visitLinks();
        else this.show(screen);
      });
    });
    document.querySelectorAll<HTMLButtonElement>(".jump").forEach((button) => button.addEventListener("click", () => this.show(button.dataset.target as Screen)));
    el<HTMLButtonElement>("admin-exit").addEventListener("click", () => this.deactivateSecret());
    void this.content.init();
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      window.addEventListener("load", () => {
        void navigator.serviceWorker
          .register(`${import.meta.env.BASE_URL}sw.js`)
          .then((registration) => registration.update());
      });
    }
  }

  private show(screen: Screen): void {
    document.querySelectorAll(".screen").forEach((element) => element.classList.remove("active"));
    el(`screen-${screen}`).classList.add("active");
    document.querySelectorAll<HTMLButtonElement>(".nav").forEach((button) => button.classList.toggle("active", button.dataset.screen === screen));
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  private handleFlow(event: "start" | "next" | "balls" | "timer" | "finished", match = 0): void {
    if (event === "finished") {
      this.clearFlow();
      return;
    }
    if (event === "timer") {
      this.setFlow(match, "タイマー確認中");
      this.recordTimerPending = true;
      this.show("timer");
      return;
    }
    this.setFlow(match, "ボール配置中");
    this.balls.beginWorkflow(match);
    this.show("balls");
  }

  private setFlow(match: number, text: string): void {
    const status = el("flow-status");
    status.textContent = `第${match}マッチ / ${text}`;
    status.classList.remove("hidden");
  }

  private clearFlow(): void {
    el("flow-status").classList.add("hidden");
  }

  private visitLinks(): void {
    this.linksClicks += 1;
    if (!this.secret && this.linksClicks >= 10) this.activateSecret();
    this.show("links");
  }

  private activateSecret(): void {
    this.secret = true;
    this.linksClicks = 0;
    document.documentElement.classList.add("secret");
    el("title").textContent = "WRO RoboSports Assist Master";
    el("development-nav").classList.remove("hidden");
    el("admin-exit").classList.remove("hidden");
    this.timer.setSecret(true);
    this.content.renderLinks(true);
  }

  private deactivateSecret(): void {
    this.secret = false;
    document.documentElement.classList.remove("secret");
    el("title").textContent = "WRO RoboSports Assist";
    el("development-nav").classList.add("hidden");
    el("admin-exit").classList.add("hidden");
    this.timer.setSecret(false);
    this.content.renderLinks(false);
    this.show("dashboard");
  }
}

new Application();
