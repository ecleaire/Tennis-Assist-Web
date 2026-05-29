import "./styles.css";

type Screen = "dashboard" | "timer" | "balls" | "records" | "rules" | "news" | "links" | "development";
type Category = "【終了・その時点で採点】（通常の試合停止）" | "【違反・自動敗北 / 失格】試合前・競技全般" | "【違反・自動敗北 / 失格】試合中の違反";
type FlowEvent = "start" | "next" | "balls" | "timer" | "finished" | "reset";

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
  sendStatus?: "pending" | "sent" | "failed" | "local-only";
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

type QrDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector;

type GasResponse = {
  ok?: boolean;
  error?: string;
};

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

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

function syncViewportMetrics(): void {
  const viewport = window.visualViewport;
  const width = viewport?.width ?? window.innerWidth;
  const height = viewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty("--viewport-width", `${Math.round(width)}px`);
  document.documentElement.style.setProperty("--viewport-height", `${Math.round(height)}px`);
  const mobilePhone =
    /Android.+Mobile|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && Math.min(screen.width, screen.height) <= 600);
  document.documentElement.classList.toggle("phone-portrait", mobilePhone && height > width);
}

function isPhonePortrait(): boolean {
  return document.documentElement.classList.contains("phone-portrait");
}

function recordKey(record: MatchRecord): string {
  return record.competitionId || `${record.recordKind}:${record.seriesId}:${record.court}:${record.seriesNumber}:${record.matchNumber}`;
}

function historyFingerprint(record: MatchRecord): string {
  return [
    record.timestamp,
    record.recordKind,
    record.court,
    record.seriesNumber,
    record.matchNumber,
    record.teamA,
    record.teamB,
    record.endReason,
    record.teamAOrange,
    record.teamAPurple,
    record.teamBOrange,
    record.teamBPurple,
    record.teamAScore,
    record.teamBScore,
  ].map((value) => String(value ?? "").trim()).join("|");
}

function isSheetPreviewRecord(record: MatchRecord): boolean {
  return record.notes?.includes("スプレッドシート確認用読み込み") ?? false;
}

function spreadsheetIdFromUrl(value: string): string | null {
  const text = value.trim();
  const match = text.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/) || text.match(/^[a-zA-Z0-9-_]{20,}$/);
  return match?.[1] ?? match?.[0] ?? null;
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

async function ensureGasSuccess(response: Response): Promise<void> {
  let result: GasResponse = {};
  try {
    result = await response.json() as GasResponse;
  } catch {
    result = {};
  }
  if (!response.ok || result.ok === false) {
    throw new Error(result.error || `GAS request failed: ${response.status}`);
  }
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
  private readonly dashboardSubCaption = el<HTMLElement>("dashboard-sub-caption");
  private readonly dashboardSubTime = el<HTMLOutputElement>("dashboard-sub-time");
  private readonly startButton = el<HTMLButtonElement>("timer-start");
  private readonly dashboardStartButton = el<HTMLButtonElement>("dashboard-timer-start");
  private readonly resetButton = el<HTMLButtonElement>("timer-reset");
  private readonly step = el<HTMLSelectElement>("timer-step");
  private readonly dashboardStep = el<HTMLSelectElement>("dashboard-timer-step");
  private total = 120;
  private remaining = 120;
  private running = false;
  private started = false;
  private notifiedFinish = false;
  private lastFrame = performance.now();
  private coldShown = false;
  private coldUntil = 0;
  private subRemaining = 0;
  private subCaption = "";
  private randomStep: number | "manual" = 5;
  private manualSeconds = 120;
  private initialReset = true;
  private secret = false;
  private stateVersion = 0;
  private autoResetTimer = 0;

  constructor(private readonly finished: () => void, private readonly activated: () => void) {
    this.startButton.addEventListener("click", () => this.toggle());
    this.dashboardStartButton.addEventListener("click", () => this.toggle());
    el<HTMLButtonElement>("timer-end").addEventListener("click", () => this.end());
    el<HTMLButtonElement>("dashboard-timer-end").addEventListener("click", () => this.end());
    this.resetButton.addEventListener("click", () => this.reset());
    el<HTMLButtonElement>("dashboard-timer-reset").addEventListener("click", () => this.reset());
    el<HTMLButtonElement>("timer-fullscreen").addEventListener("click", () => void this.toggleFullscreen());
    el<HTMLButtonElement>("timer-ten").addEventListener("click", () => this.toggleSubTimer(10, "コールドカウント"));
    el<HTMLButtonElement>("timer-five").addEventListener("click", () => this.toggleSubTimer(5, "オーバーボール"));
    el<HTMLButtonElement>("dashboard-timer-ten").addEventListener("click", () => this.toggleSubTimer(10, "コールドカウント"));
    el<HTMLButtonElement>("dashboard-timer-five").addEventListener("click", () => this.toggleSubTimer(5, "オーバーボール"));
    this.step.addEventListener("change", () => {
      this.dashboardStep.value = this.step.value;
      this.chooseStep();
    });
    this.dashboardStep.addEventListener("change", () => {
      this.step.value = this.dashboardStep.value;
      this.chooseStep();
    });
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

  noteActivity(): void {
    this.touchTimerState();
  }

  async leaveFullscreen(): Promise<void> {
    try {
      screen.orientation?.unlock?.();
    } catch {
      // Orientation locking is optional and browser dependent.
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen?.();
      } catch {
        // The normal in-page view is still restored below.
      }
    }
    this.setCompact(false);
  }

  private chooseStep(): void {
    this.touchTimerState();
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
    this.touchTimerState();
    const minutes = Number(el<HTMLSelectElement>("manual-minute").value);
    const seconds = Number(el<HTMLSelectElement>("manual-second").value);
    this.manualSeconds = Math.max(1, minutes * 60 + seconds);
    this.randomStep = "manual";
    this.step.value = "manual";
    this.dashboardStep.value = "manual";
    this.reset();
  }

  private generatedDuration(): number {
    if (this.randomStep === "manual") return this.manualSeconds;
    const count = Math.floor((120 - 60) / this.randomStep) + 1;
    return 60 + Math.floor(Math.random() * count) * this.randomStep;
  }

  private reset(): void {
    this.touchTimerState();
    this.running = false;
    this.started = false;
    this.notifiedFinish = false;
    this.total = this.initialReset ? 120 : this.generatedDuration();
    this.initialReset = false;
    this.remaining = this.total;
    this.mode.textContent = "試合準備完了";
    this.coldShown = false;
    this.coldUntil = 0;
    this.notice.textContent = "";
    this.subRemaining = 0;
    this.subTime.classList.add("hidden");
    this.dashboardSubTime.classList.add("hidden");
    this.dashboardSubCaption.textContent = "";
    this.dashboardSubCaption.classList.remove("count");
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
    this.touchTimerState();
    this.activated();
    void this.enterFullscreen(true);
    this.running = true;
    this.started = true;
    this.mode.textContent = "試合進行中";
    this.caption.textContent = "";
    this.notice.textContent = this.coldUntil > performance.now() ? "ここからコールドが適応されます" : "";
    this.syncControls();
  }

  private pause(): void {
    this.touchTimerState();
    this.running = false;
    this.mode.textContent = "一時停止中";
    this.caption.textContent = "Space / Enter: 再開　F: 全画面";
    this.notice.textContent = "タイマーを一時停止しています";
    this.syncControls();
  }

  private end(): void {
    this.touchTimerState();
    this.running = false;
    this.remaining = 0;
    this.mode.textContent = "終了";
    this.notice.textContent = "";
    this.caption.textContent = "ランダム再生成で新しいタイマーを作れます。";
    this.scheduleAutoReset();
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
        this.touchTimerState();
        this.running = false;
        this.mode.textContent = "終了";
        this.caption.textContent = "ランダム再生成で新しいタイマーを作れます。";
        this.scheduleAutoReset();
        this.syncControls();
        this.emitFinish();
      }
    }
    if (this.subRemaining > 0) {
      this.subRemaining = Math.max(0, this.subRemaining - delta);
      if (this.subRemaining === 0) {
        this.subTime.classList.add("hidden");
        this.dashboardSubTime.classList.add("hidden");
        this.dashboardSubCaption.textContent = "";
        this.dashboardSubCaption.classList.remove("count");
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
    if (this.subRemaining > 0) {
      const formattedSubTime = String(Math.ceil(this.subRemaining));
      this.subTime.textContent = formattedSubTime;
      this.dashboardSubTime.textContent = formattedSubTime;
    }
  }

  private syncControls(): void {
    const startLabel = this.running ? "停止" : this.remaining < this.total && this.remaining > 0 ? "再開" : "開始";
    document.body.classList.toggle("timer-running", this.running);
    document.body.classList.toggle("timer-started", this.started);
    document.body.classList.toggle("timer-ended", this.started && this.remaining <= 0);
    this.startButton.textContent = startLabel;
    this.dashboardStartButton.textContent = startLabel;
    this.resetButton.disabled = this.running;
    el<HTMLButtonElement>("dashboard-timer-reset").disabled = this.running;
    this.step.disabled = this.running;
    this.dashboardStep.disabled = this.running;
  }

  private toggleSubTimer(seconds: number, label: string): void {
    this.touchTimerState();
    if (this.subRemaining > 0 && this.subCaption === label) {
      this.subRemaining = 0;
      this.subTime.classList.add("hidden");
      this.dashboardSubTime.classList.add("hidden");
      this.dashboardSubCaption.textContent = "";
      this.dashboardSubCaption.classList.remove("count");
      this.caption.classList.remove("count");
      this.caption.textContent = this.running ? "" : "Space / Enter: 開始　F: 全画面";
      return;
    }
    this.subRemaining = seconds;
    this.subCaption = label;
    this.subTime.classList.remove("hidden");
    this.dashboardSubTime.classList.remove("hidden");
    this.dashboardSubCaption.textContent = label;
    this.dashboardSubCaption.classList.add("count");
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
    if (!document.fullscreenElement && !document.body.classList.contains("compact")) {
      await this.enterFullscreen();
    } else {
      await this.leaveFullscreen();
    }
  }

  private async enterFullscreen(rotatePhone = false): Promise<void> {
    const shouldRotate = rotatePhone && isPhonePortrait();
    this.setCompact(true);
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen?.();
      } catch {
        // Keep the timer in distraction-free view when native fullscreen is unavailable.
      }
    }
    if (shouldRotate) {
      try {
        await (screen.orientation as LockableScreenOrientation | undefined)?.lock?.("landscape");
      } catch {
        // Android browsers that deny orientation lock still keep the focused timer view.
      }
    }
  }

  private setCompact(compact: boolean): void {
    document.body.classList.toggle("compact", compact);
    el<HTMLButtonElement>("timer-fullscreen").textContent = compact ? "全画面解除" : "全画面";
  }

  private touchTimerState(): void {
    this.stateVersion += 1;
    if (this.autoResetTimer) {
      window.clearTimeout(this.autoResetTimer);
      this.autoResetTimer = 0;
    }
  }

  private scheduleAutoReset(): void {
    const version = this.stateVersion;
    if (this.autoResetTimer) window.clearTimeout(this.autoResetTimer);
    this.autoResetTimer = window.setTimeout(() => {
      this.autoResetTimer = 0;
      if (this.stateVersion === version && this.started && !this.running && this.remaining <= 0) {
        this.reset();
      }
    }, 180000);
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
    el<HTMLButtonElement>("dashboard-balls-reset").addEventListener("click", () => this.reset());
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

  resetWorkflow(): void {
    this.workflowMatch = 0;
    el<HTMLButtonElement>("balls-ready").classList.add("hidden");
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
  private agreementPending: "a" | "b" | null = null;
  private awaitingNextMatch = false;
  private completionResetTimer = 0;
  private retryingPendingSends = false;

  constructor(private readonly flow: (event: FlowEvent, match?: number) => void, private readonly qrScanner: QrScanner) {
    this.records = this.loadRecords();
    this.loadTeams();
    this.setupInputs();
    el<HTMLButtonElement>("series-start").addEventListener("click", () => this.startSeries());
    el<HTMLButtonElement>("series-reset").addEventListener("click", () => this.resetSeries());
    el<HTMLButtonElement>("record-save").addEventListener("click", () => this.confirmSave());
    el<HTMLButtonElement>("confirm-save").addEventListener("click", () => this.save());
    el<HTMLButtonElement>("next-match").addEventListener("click", () => this.continueToNextMatch());
    el<HTMLButtonElement>("next-match-bye").addEventListener("click", () => this.beginByeMatch());
    el<HTMLButtonElement>("back-balls").addEventListener("click", () => { if (this.series && !this.isFinished()) this.flow("balls", this.nextMatch()); });
    el<HTMLButtonElement>("back-timer").addEventListener("click", () => { if (this.series && !this.isFinished()) this.flow("timer", this.nextMatch()); });
    el<HTMLButtonElement>("agree-a").addEventListener("click", () => this.requestAgreement("a"));
    el<HTMLButtonElement>("agree-b").addEventListener("click", () => this.requestAgreement("b"));
    el<HTMLButtonElement>("agreement-accept").addEventListener("click", () => this.acceptAgreement());
    el<HTMLButtonElement>("agreement-cancel").addEventListener("click", () => this.cancelAgreement());
    el<HTMLButtonElement>("finalize").addEventListener("click", () => void this.finalize());
    el<HTMLButtonElement>("completion-reset").addEventListener("click", () => this.completeSeriesReset());
    el<HTMLSelectElement>("stats-team").addEventListener("change", () => this.syncTeamHistoryFilter());
    el<HTMLSelectElement>("stats-period").addEventListener("change", () => this.renderHistory());
    ["history-team", "history-result", "history-kind", "history-sort"].forEach((id) => {
      el<HTMLSelectElement>(id).addEventListener("change", () => this.renderHistory());
    });
    el<HTMLButtonElement>("team-save").addEventListener("click", () => this.saveTeams());
    el<HTMLButtonElement>("team-reset").addEventListener("click", () => this.resetTeams());
    el<HTMLButtonElement>("team-import").addEventListener("click", () => el<HTMLInputElement>("team-file").click());
    el<HTMLButtonElement>("team-sheet-scan").addEventListener("click", () => void this.importTeamsFromSpreadsheetQr());
    el<HTMLButtonElement>("team-sheet-load").addEventListener("click", () => void this.importTeamsFromSpreadsheet(el<HTMLInputElement>("team-sheet-url").value));
    el<HTMLInputElement>("team-file").addEventListener("change", (event) => void this.importTeams(event));
    el<HTMLButtonElement>("history-export").addEventListener("click", () => this.exportHistory());
    el<HTMLButtonElement>("history-import").addEventListener("click", () => el<HTMLInputElement>("history-file").click());
    el<HTMLButtonElement>("history-sheet-import").addEventListener("click", () => void this.importHistoryFromSpreadsheet());
    el<HTMLButtonElement>("history-sheet-scan").addEventListener("click", () => void this.importHistoryFromSpreadsheetQr());
    el<HTMLInputElement>("history-file").addEventListener("change", (event) => void this.importHistory(event));
    el<HTMLButtonElement>("history-clear").addEventListener("click", () => this.clearHistory());
    window.addEventListener("online", () => void this.retryPendingSends("online"));
    this.resetSeries(false);
    this.renderHistory();
    if (navigator.onLine) window.setTimeout(() => void this.retryPendingSends("startup"), 1200);
  }

  timerFinished(): void {
    if (!this.series || this.isFinished()) return;
    this.awaitingNextMatch = false;
    this.setNextMatchPrompt(false);
    this.updateRecordVisibility();
    el("record-status").textContent = "試合結果を入力して、「このマッチを保存」から確認してください。";
    window.setTimeout(() => el("record-input").scrollIntoView({ behavior: "smooth", block: "start" }), 80);
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
    rangeOptions(el<HTMLSelectElement>("b-purple"), 2, 0);
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
    this.agreementPending = null;
    this.awaitingNextMatch = false;
    this.clearCompletionResetTimer();
    this.setCompletionPanel(false);
    this.setNextMatchPrompt(false);
    this.resetInput();
    this.renderSeries();
    this.updateRecordVisibility();
    el("record-status").textContent = "対戦カードを開始しました。ボール配置から進行します。";
    this.flow("start", 1);
  }

  private resetSeries(notify = true): void {
    this.series = null;
    this.editing = 0;
    this.agreedA = false;
    this.agreedB = false;
    this.finalized = false;
    this.agreementPending = null;
    this.awaitingNextMatch = false;
    this.clearCompletionResetTimer();
    this.setCompletionPanel(false);
    this.setNextMatchPrompt(false);
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
    this.updateRecordVisibility();
    if (notify) this.flow("reset");
  }

  private resetInput(): void {
    el<HTMLSelectElement>("reason-category").value = scoringCategory;
    this.refreshEndReasons();
    el<HTMLSelectElement>("a-orange").value = "0";
    el<HTMLSelectElement>("b-orange").value = "0";
    el<HTMLSelectElement>("a-purple").value = "0";
    el<HTMLSelectElement>("b-purple").value = "0";
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
    if (category === scoringCategory) {
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
    if (this.shouldWarnUnplayedMatch()) {
      const accepted = window.confirm("マッチが行われていません。次のマッチへ進む前のため、通常の試合結果として保存してよいですか？");
      if (!accepted) {
        el("record-status").textContent = "マッチが行われていません。通常の結果を入力する場合は「次のマッチへ進む」を押してから保存してください。";
        return;
      }
    }
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
      this.agreementPending = null;
    } else {
      this.series.records.push(record);
      this.records.unshift(record);
    }
    this.saveStoredRecords();
    this.resetInput();
    this.renderSeries();
    this.renderHistory();
    if (this.isFinished()) {
      el("record-status").textContent = `第${record.matchNumber}マッチを保存しました。代表同意後に結果を確定します。`;
      this.awaitingNextMatch = false;
      this.setNextMatchPrompt(false);
      this.renderAgreement();
      this.updateRecordVisibility();
      el("final-results").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      el("record-status").textContent = `第${record.matchNumber}マッチを保存しました。次のマッチの準備をしてください。`;
      this.awaitingNextMatch = true;
      this.setNextMatchPrompt(true);
      this.updateRecordVisibility();
      el("next-match-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  private setNextMatchPrompt(visible: boolean): void {
    el("next-match-panel").classList.toggle("hidden", !visible);
    if (visible) {
      const match = Math.min(this.nextMatch(), 3);
      el<HTMLButtonElement>("next-match-bye").textContent = `第${match}マッチを不戦勝にする`;
    }
  }

  private continueToNextMatch(): void {
    if (!this.series || this.isFinished()) return;
    this.awaitingNextMatch = false;
    this.setNextMatchPrompt(false);
    this.updateRecordVisibility();
    this.flow("next", this.nextMatch());
  }

  private beginByeMatch(): void {
    if (!this.series || this.isFinished() || !this.awaitingNextMatch) return;
    const match = this.nextMatch();
    if (!window.confirm("本当に不戦勝にしますか？")) return;
    this.awaitingNextMatch = false;
    this.setNextMatchPrompt(false);
    this.editing = 0;
    this.resetInput();
    el<HTMLSelectElement>("reason-category").value = prematchCategory;
    this.refreshEndReasons();
    this.renderSeries();
    this.updateRecordVisibility();
    el("record-status").textContent = `第${match}マッチを不戦勝として入力します。対象チームを選択して保存してください。`;
    el("record-input").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  private shouldWarnUnplayedMatch(): boolean {
    if (!this.awaitingNextMatch || this.editing || !this.series || this.isFinished()) return false;
    const category = el<HTMLSelectElement>("reason-category").value as Category;
    const reason = el<HTMLSelectElement>("end-reason").value;
    return category !== prematchCategory && !reason.includes("6.32.9");
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
    this.updateRecordVisibility();
  }

  private editRecord(matchNumber: number): void {
    if (!this.series) return;
    const record = this.series.records.find((item) => item.matchNumber === matchNumber);
    if (!record) return;
    this.editing = matchNumber;
    this.awaitingNextMatch = false;
    this.setNextMatchPrompt(false);
    el<HTMLSelectElement>("reason-category").value = record.reasonCategory;
    this.refreshEndReasons();
    el<HTMLSelectElement>("end-reason").value = record.endReason;
    el<HTMLSelectElement>("target-team").value = record.targetTeam;
    el<HTMLSelectElement>("a-orange").value = String(record.teamAOrange);
    el<HTMLSelectElement>("a-purple").value = String(record.teamAPurple);
    el<HTMLSelectElement>("b-orange").value = String(record.teamBOrange);
    el<HTMLSelectElement>("b-purple").value = String(record.teamBPurple);
    this.renderSeries();
    this.updateRecordVisibility();
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

  private updateRecordVisibility(): void {
    const hasSeries = Boolean(this.series);
    const entries = this.series?.records.length ?? 0;
    const finished = Boolean(this.series && this.isFinished());
    el("team-management-panel").classList.toggle("hidden", hasSeries);
    el("history-stats-panel").classList.toggle("hidden", hasSeries);
    el("record-input").classList.toggle("hidden", !hasSeries || this.awaitingNextMatch || this.finalized);
    el("intermediate-results").classList.toggle("hidden", !hasSeries || entries === 0);
    el("final-results").classList.toggle("hidden", !hasSeries || (!finished && !this.finalized));
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
    const matches = el<HTMLTableElement>("final-matches");
    matches.innerHTML = "<thead><tr><th>マッチ</th><th>終了理由</th><th>チームA 橙/紫/得点</th><th>チームB 橙/紫/得点</th><th>勝敗結果</th></tr></thead>";
    const table = el<HTMLTableElement>("final-table");
    table.innerHTML = "<thead><tr><th>チーム</th><th>勝利数</th><th>総橙</th><th>総紫</th><th>違反</th><th>総スコア</th><th>状態</th></tr></thead>";
    if (!this.series?.records.length) {
      el("final-summary").textContent = "3マッチ終了後、最終試合結果を確認できます。";
      el("series-finished").classList.add("hidden");
      this.setCompletionPanel(false);
      return;
    }
    const matchesBody = matches.createTBody();
    this.series.records.forEach((record) => {
      const row = matchesBody.insertRow();
      row.className = "win";
      row.innerHTML = `<td>第${record.matchNumber}マッチ</td><td>${escapeText(record.endReason)}</td><td>${record.teamAOrange} / ${record.teamAPurple} / ${record.teamAScore}</td><td>${record.teamBOrange} / ${record.teamBPurple} / ${record.teamBScore}</td><td>勝者: ${escapeText(record.winner)}</td>`;
    });
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
    el("series-finished").classList.toggle("hidden", !this.finalized);
  }

  private renderAgreement(): void {
    const box = el("agreement");
    const visible = Boolean(this.series && this.isFinished());
    box.classList.toggle("hidden", !visible);
    if (!visible || !this.series) {
      this.cancelAgreement();
      return;
    }
    const agreeA = el<HTMLButtonElement>("agree-a");
    const agreeB = el<HTMLButtonElement>("agree-b");
    agreeA.textContent = `${this.series.teamA}代表: ${this.agreedA ? "同意済み" : "同意する"}`;
    agreeB.textContent = `${this.series.teamB}代表: ${this.agreedB ? "同意済み" : "同意する"}`;
    agreeA.classList.toggle("agreed", this.agreedA);
    agreeB.classList.toggle("agreed", this.agreedB);
    agreeA.disabled = this.agreedA || this.finalized;
    agreeB.disabled = this.agreedB || this.finalized;
    el<HTMLButtonElement>("finalize").disabled = this.finalized || !(this.agreedA && this.agreedB);
  }

  private requestAgreement(side: "a" | "b"): void {
    if (!this.series || !this.isFinished() || this.finalized || (side === "a" ? this.agreedA : this.agreedB)) return;
    this.renderFinal();
    this.agreementPending = side;
    const team = side === "a" ? this.series.teamA : this.series.teamB;
    el("agreement-confirm-team").textContent = `${team}代表が確認しています。上の試合結果をもう一度確認してください。`;
    el("agreement-confirm").classList.remove("hidden");
    el("final-results").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  private acceptAgreement(): void {
    if (!this.agreementPending) return;
    if (this.agreementPending === "a") this.agreedA = true;
    else this.agreedB = true;
    this.cancelAgreement();
    this.renderAgreement();
  }

  private cancelAgreement(): void {
    this.agreementPending = null;
    el("agreement-confirm").classList.add("hidden");
  }

  private async finalize(): Promise<void> {
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
      sendStatus: AdminController.settings().sendEnabled ? "pending" : "local-only",
    };
    this.records.unshift(record);
    this.saveStoredRecords();
    this.renderFinal();
    this.renderHistory();
    el("record-status").textContent = "試合が終了しました。おつかれさまでした。結果を保存しています。";
    this.renderAgreement();
    this.updateRecordVisibility();
    this.flow("finished");
    el("final-results").scrollIntoView({ behavior: "smooth", block: "start" });
    await this.sendSeriesResult(record);
    el("completion-status").textContent = `${el("record-status").textContent ?? "試合結果を保存しました。"} 3分後に自動で次の対戦準備へ戻ります。`;
    this.setCompletionPanel(true);
    this.clearCompletionResetTimer();
    this.completionResetTimer = window.setTimeout(() => this.completeSeriesReset(), 180000);
  }

  private setCompletionPanel(visible: boolean): void {
    el("completion-panel").classList.toggle("hidden", !visible);
  }

  private clearCompletionResetTimer(): void {
    if (!this.completionResetTimer) return;
    window.clearTimeout(this.completionResetTimer);
    this.completionResetTimer = 0;
  }

  private completeSeriesReset(): void {
    const wasCompleted = this.finalized;
    this.clearCompletionResetTimer();
    this.resetSeries();
    if (wasCompleted) {
      el("record-status").textContent = "保存済みです。次の対戦を開始できます。";
    }
    el("screen-records").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  private renderHistory(): void {
    const host = el("history");
    host.replaceChildren();
    const statsTeam = el<HTMLSelectElement>("stats-team").value;
    const team = statsTeam !== "チームを選択" ? statsTeam : el<HTMLSelectElement>("history-team").value;
    const result = el<HTMLSelectElement>("history-result").value;
    const kind = el<HTMLSelectElement>("history-kind").value;
    const since = this.historySince();
    const visible = this.records.filter((record) => {
      if (new Date(record.timestamp.replace(" ", "T")).getTime() < since) return false;
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
      const sendState = record.recordKind === "試合結果" ? this.sendStateLabel(record.sendStatus) : "";
      card.innerHTML = `<h3>${escapeText(record.teamA)} vs ${escapeText(record.teamB)}</h3><p class="muted">${escapeText(record.timestamp)} | ${escapeText(record.court)} 第${record.seriesNumber}試合 | ${number}</p><p>終了理由: ${escapeText(record.endReason)}<br>A 橙${record.teamAOrange} 紫${record.teamAPurple} 得点${record.teamAScore} / B 橙${record.teamBOrange} 紫${record.teamBPurple} 得点${record.teamBScore} / 勝者 ${escapeText(winner)}</p>${sendState}`;
      if (record.recordKind === "試合結果" && (record.sendStatus === "pending" || record.sendStatus === "failed")) {
        const retry = document.createElement("button");
        retry.className = "button history-retry";
        retry.textContent = "未送信の結果を再送する";
        retry.addEventListener("click", () => void this.retrySend(record));
        card.append(retry);
      }
      host.append(card);
    });
    const storedCount = this.records.filter((record) => !isSheetPreviewRecord(record)).length;
    const previewCount = this.records.length - storedCount;
    el("history-status").textContent = `保存済み ${storedCount}件 / 確認用 ${previewCount}件 / 表示 ${visible.length}件`;
    this.renderStats();
  }

  private sendStateLabel(status: MatchRecord["sendStatus"]): string {
    if (status === "sent") return '<p class="sync-status sent">GAS送信済み</p>';
    if (status === "pending") return '<p class="sync-status pending">GAS送信待ち</p>';
    if (status === "failed") return '<p class="sync-status failed">GAS未送信</p>';
    if (status === "local-only") return '<p class="sync-status local">端末保存のみ</p>';
    return "";
  }

  private renderStats(): void {
    const team = el<HTMLSelectElement>("stats-team").value;
    const host = el("stats-cards");
    if (team === "チームを選択") {
      host.replaceChildren();
      return;
    }
    const since = this.historySince();
    const related = this.records.filter((record) => record.recordKind === "マッチ" && (record.teamA === team || record.teamB === team) && new Date(record.timestamp.replace(" ", "T")).getTime() >= since);
    const wins = related.filter((record) => record.winner === team).length;
    const draws = related.filter((record) => record.winner === "引き分け").length;
    const violations = related.filter((record) => record.reasonCategory !== scoringCategory && record.targetTeam === team).length;
    const teamPurple = related.reduce((sum, record) => sum + (record.teamA === team ? record.teamAPurple : record.teamBPurple), 0);
    const totalPurple = related.reduce((sum, record) => sum + record.teamAPurple + record.teamBPurple, 0);
    const rate = related.length ? (wins / related.length) * 100 : 0;
    const purpleRate = totalPurple ? (teamPurple / totalPurple) * 100 : 0;
    const stats = [["マッチ数", related.length.toString()], ["勝敗", `${wins}勝 ${related.length - wins - draws}敗 ${draws}分`], ["勝率", `${rate.toFixed(1)}%`], ["紫取得率", `${purpleRate.toFixed(1)}%`], ["違反数", String(violations)]];
    host.innerHTML = stats.map(([label, value]) => `<article class="stat"><span class="muted">${label}</span><b>${value}</b></article>`).join("");
  }

  private historySince(): number {
    const period = el<HTMLSelectElement>("stats-period").value;
    const now = new Date();
    if (period === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return start.getTime();
    }
    const days = { week: 7, month: 31 }[period] ?? 1;
    return Date.now() - days * 86400000;
  }

  private syncTeamHistoryFilter(): void {
    const selected = el<HTMLSelectElement>("stats-team").value;
    el<HTMLSelectElement>("history-team").value = selected === "チームを選択" ? "すべてのチーム" : selected;
    this.renderStats();
    this.renderHistory();
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

  private async importTeamsFromSpreadsheetQr(): Promise<void> {
    const scanned = await this.qrScanner.scan({
      title: "チームリストシート QRコード読取",
      hint: "QRコードには Google スプレッドシートのURL、またはスプレッドシートIDを入れてください。読み込み専用です。",
      applyLabel: "このシートを読み込む",
      validator: (value) => Boolean(spreadsheetIdFromUrl(value)),
      invalidMessage: "Google スプレッドシートURL、またはスプレッドシートIDではありません。",
    });
    if (!scanned) return;
    await this.importTeamsFromSpreadsheet(scanned);
  }

  private async importTeamsFromSpreadsheet(value?: string): Promise<void> {
    const source = value ?? window.prompt("チームリストを読み込むスプレッドシートURL、またはIDを入力してください。");
    const spreadsheetId = source ? spreadsheetIdFromUrl(source) : null;
    if (!spreadsheetId) {
      el("team-status").textContent = "スプレッドシートURL、またはIDを確認してください。";
      return;
    }
    const settings = AdminController.settings();
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      el("team-status").textContent = "GAS Web アプリ URLとAPIキーを管理者設定で保存してください。";
      return;
    }
    el("team-status").textContent = "スプレッドシートからチームリストを読み込んでいます...";
    try {
      const url = `${settings.gasUrl}?action=teams&api_key=${encodeURIComponent(settings.apiKey)}&spreadsheet_id=${encodeURIComponent(spreadsheetId)}`;
      const response = await fetch(url);
      const data = await response.json() as { ok?: boolean; error?: string; teams?: string[]; row_count?: number; sheet_name?: string };
      if (!response.ok || data.ok === false) throw new Error(data.error || "failed");
      const nextTeams = (data.teams ?? []).map(String).filter(Boolean);
      this.applyTeams(nextTeams);
      el("team-status").textContent = `${data.sheet_name ?? "スプレッドシート"} から${nextTeams.length}チームを読み込み、この端末の一覧に反映しました。`;
    } catch {
      el("team-status").textContent = "チームリストを読み込めませんでした。GASのdoGet更新、URL、APIキー、共有設定を確認してください。";
    }
  }

  private exportHistory(): void {
    const storedRecords = this.records.filter((record) => !isSheetPreviewRecord(record));
    if (!storedRecords.length) {
      el("history-status").textContent = "エクスポートできる履歴がありません。";
      return;
    }
    const text = "\uFEFF" + [csvColumns.map(csvEscape).join(","), ...[...storedRecords].reverse().map((record) => csvRow(record).map(csvEscape).join(","))].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    link.download = `tennis_assist_history_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    el("history-status").textContent = `${storedRecords.length}件をCSVに保存しました。確認用に読み込んだ履歴は出力していません。`;
  }

  private async importHistory(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const rows = parseCsv((await file.text()).replace(/^\uFEFF/, ""));
    const imported = this.recordsFromCsvRows(rows);
    const result = this.mergeImportedRecords(imported, true);
    el("history-status").textContent = `${file.name} から${result.added}件を追加しました。重複${result.skipped}件はスキップしました。`;
    (event.target as HTMLInputElement).value = "";
  }

  private recordsFromCsvRows(rows: string[][]): MatchRecord[] {
    const names = rows.shift() ?? [];
    const at = (row: string[], name: string): string => row[names.indexOf(name)] ?? "";
    return rows.map((row): MatchRecord => ({
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
  }

  private mergeImportedRecords(imported: MatchRecord[], persist: boolean): { added: number; skipped: number } {
    const keys = new Set(this.records.map(recordKey));
    const fingerprints = new Set(this.records.map(historyFingerprint));
    const additions = imported.filter((record) => !keys.has(recordKey(record)) && !fingerprints.has(historyFingerprint(record)));
    additions.forEach((record) => {
      record.sendStatus = undefined;
    });
    this.records = [...additions.reverse(), ...this.records];
    if (persist) this.saveStoredRecords();
    this.renderHistory();
    return { added: additions.length, skipped: imported.length - additions.length };
  }

  private async importHistoryFromSpreadsheetQr(): Promise<void> {
    const scanned = await this.qrScanner.scan({
      title: "対戦履歴シート QRコード読取",
      hint: "QRコードには Google スプレッドシートのURL、またはスプレッドシートIDを入れてください。履歴確認用に読み込みます。",
      applyLabel: "このシートを読み込む",
      validator: (value) => Boolean(spreadsheetIdFromUrl(value)),
      invalidMessage: "Google スプレッドシートURL、またはスプレッドシートIDではありません。",
    });
    if (!scanned) return;
    await this.importHistoryFromSpreadsheet(scanned);
  }

  private async importHistoryFromSpreadsheet(value?: string): Promise<void> {
    const source = value ?? window.prompt("対戦履歴を読み込むスプレッドシートURL、またはIDを入力してください。");
    const spreadsheetId = source ? spreadsheetIdFromUrl(source) : null;
    if (!spreadsheetId) {
      el("history-status").textContent = "スプレッドシートURL、またはIDを確認してください。";
      return;
    }
    const settings = AdminController.settings();
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      el("history-status").textContent = "GAS Web アプリ URLとAPIキーを管理者設定で保存してください。";
      return;
    }
    el("history-status").textContent = "スプレッドシートから対戦履歴を読み込んでいます...";
    try {
      const url = `${settings.gasUrl}?action=history&api_key=${encodeURIComponent(settings.apiKey)}&spreadsheet_id=${encodeURIComponent(spreadsheetId)}`;
      const response = await fetch(url);
      const data = await response.json() as { ok?: boolean; error?: string; csv_columns?: string[]; csv_rows?: string[][]; row_count?: number; sheet_name?: string };
      if (!response.ok || data.ok === false) throw new Error(data.error || "failed");
      const imported = this.recordsFromCsvRows([[...(data.csv_columns ?? [])], ...(data.csv_rows ?? [])]);
      imported.forEach((record) => {
        record.notes = record.notes ? `${record.notes} / スプレッドシート確認用読み込み` : "スプレッドシート確認用読み込み";
      });
      const result = this.mergeImportedRecords(imported, false);
      el("history-status").textContent = `${data.sheet_name ?? "対戦履歴"} から確認用履歴を${result.added}件読み込みました。重複${result.skipped}件はスキップしました。読み込んだ履歴は一時表示のみで、GASへ再送しません。`;
    } catch {
      el("history-status").textContent = "対戦履歴を読み込めませんでした。GASのdoGet更新、URL、APIキー、共有設定を確認してください。";
    }
  }

  private clearHistory(): void {
    const storedCount = this.records.filter((record) => !isSheetPreviewRecord(record)).length;
    if (!storedCount || !window.confirm(`この端末に保存された対戦履歴 ${storedCount}件をすべて削除しますか？確認用に読み込んだ履歴はページ更新で消えます。`)) return;
    this.records = this.records.filter(isSheetPreviewRecord);
    localStorage.setItem(this.storageKey, "[]");
    this.renderHistory();
    el("history-status").textContent = "この端末の対戦履歴をすべて削除しました。";
  }

  private updateSendStatus(record: MatchRecord, status: NonNullable<MatchRecord["sendStatus"]>): void {
    record.sendStatus = status;
    const stored = this.records.find((item) => item.recordId === record.recordId);
    if (stored) stored.sendStatus = status;
    this.saveStoredRecords();
    this.renderHistory();
  }

  private async retrySend(record: MatchRecord): Promise<void> {
    this.updateSendStatus(record, "pending");
    el("history-status").textContent = "未送信の試合結果を再送しています...";
    await this.sendSeriesResult(record);
  }

  private async retryPendingSends(reason: "startup" | "online"): Promise<void> {
    if (this.retryingPendingSends || !navigator.onLine) return;
    const settings = AdminController.settings();
    if (!settings.sendEnabled || !settings.gasUrl.endsWith("/exec") || !settings.apiKey) return;
    const pending = this.records.filter((record) => !isSheetPreviewRecord(record) && record.recordKind === "試合結果" && (record.sendStatus === "pending" || record.sendStatus === "failed"));
    if (!pending.length) return;
    this.retryingPendingSends = true;
    el("history-status").textContent = reason === "online" ? `オンライン復帰を検知しました。未送信 ${pending.length}件を送信しています...` : `未送信 ${pending.length}件を確認しました。送信しています...`;
    try {
      for (const record of pending) {
        await this.sendSeriesResult(record);
      }
    } finally {
      this.retryingPendingSends = false;
      this.renderHistory();
    }
  }

  private async sendSeriesResult(record: MatchRecord): Promise<void> {
    const settings = AdminController.settings();
    if (!settings.sendEnabled) {
      this.updateSendStatus(record, "local-only");
      el("record-status").textContent = "試合結果を保存しました。スプレッドシート送信はOFFです。";
      return;
    }
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      this.updateSendStatus(record, "failed");
      el("record-status").textContent = "試合結果は保存しました。GAS URLまたはAPIキーを確認し、履歴から再送してください。";
      return;
    }
    this.updateSendStatus(record, "pending");
    const matches = this.records
      .filter((item) => !isSheetPreviewRecord(item) && item.seriesId === record.seriesId && item.recordKind === "マッチ")
      .sort((a, b) => a.matchNumber - b.matchNumber);
    const details = [...matches, record].map((item) => ({ record_id: item.recordId, csv_row: csvRow(item) }));
    const body = { api_key: settings.apiKey, event: "series_result", target_sheet: "試合結果", source: "WRO RoboSports Assist", sent_at: timestamp(), record_id: record.recordId, payload: record, csv_columns: [...csvColumns], csv_row: csvRow(record), detail_sheet: "対戦履歴", detail_rows: details };
    el("record-status").textContent = "試合結果を保存しました。スプレッドシートへ送信中...";
    try {
      const response = await fetch(settings.gasUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      await ensureGasSuccess(response);
      this.updateSendStatus(record, "sent");
      el("record-status").textContent = "試合結果を保存し、スプレッドシートへ送信しました。";
    } catch {
      this.updateSendStatus(record, "failed");
      el("record-status").textContent = "試合結果は保存しました。スプレッドシート送信に失敗しました。履歴から再送できます。";
    }
  }

  private nextMatch(): number {
    return (this.series?.records.length ?? 0) + 1;
  }

  private nextSeriesNumber(court: string): number {
    const seriesIds = new Set(
      this.records.filter((record) => !isSheetPreviewRecord(record) && record.court === court && record.seriesId).map((record) => record.seriesId),
    );
    return seriesIds.size + 1;
  }

  private saveStoredRecords(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.records.filter((record) => !isSheetPreviewRecord(record))));
  }

  private isFinished(): boolean {
    return (this.series?.records.length ?? 0) >= 3;
  }
}

class ContentController {
  private rules: RuleSection[] = [];
  private news: NewsItem[] = [];
  private selectedRule = "";
  private rulesRequested = false;
  private newsRequested = false;

  init(): void {
    el<HTMLInputElement>("rule-search").addEventListener("input", () => this.renderRules());
    el<HTMLSelectElement>("news-filter").addEventListener("change", () => this.renderNews());
    document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => el<HTMLDialogElement>((button as HTMLElement).dataset.close ?? "").close()));
  }

  open(screen: Screen, secret: boolean): void {
    if (screen === "rules" && !this.rulesRequested) {
      this.rulesRequested = true;
      el("rule-content").innerHTML = "<p>ルールを読み込み中...</p>";
      void this.loadRules();
    }
    if (screen === "news" && !this.newsRequested) {
      this.newsRequested = true;
      el("news-status").textContent = "最新情報を読み込み中...";
      void this.loadNews();
    }
    if (screen === "links") this.renderLinks(secret);
  }

  renderLinks(secret: boolean): void {
    const sections = [
      { title: "WRO", links: [["WRO Japan ホームページ", "https://www.wroj.org/action/2026"], ["WRO 兵庫 ホームページ", "https://wro-hyogo.jp/"], ["WRO 東京 ホームページ", "https://www.wro-tokyo-competition.net/"], ["WRO 奈良 ホームページ", "https://sites.google.com/view/wro-nara/%E3%83%9B%E3%83%BC%E3%83%A0?authuser=0"], ["WRO 三重 ホームページ", "https://miraido.net/"], ["WRO 国際 ホームページ", "https://wro-association.org/"]] },
      { title: "ルール関連", links: [["Q&A", "https://wro-association.org/competition/questions-answers/"], ["ルール", "https://wro-association.org/competition/2026-season/#:~:text=ROBOSPORTS-,GENERAL%20%26%20GAME%20RULES,-PLAYFIELD%20DOUBLE%20TENNIS"], ["英語ルール PDF", "https://wro-association.org/wp-content/uploads/WRO-2026-RoboSports-Double-Tennis-General-Rules.pdf"], ["Google 翻訳ルール", "https://drive.google.com/file/d/16zFJ_bD8sfLZZF6QkRCWQ6azN_Dj3eUG/view?usp=sharing"], ["DeepL 翻訳ルール", "https://drive.google.com/file/d/1z_Q7M7lP2Q55Zo3qZgzH-bN_QqhCx-wJ/view?usp=sharing"]] },
      { title: "その他", links: [["YouTube関連動画", "https://youtube.com/playlist?list=PL5-Hc8xo0J3mKylDKfNnTaFIZ6hqDSZnh&si=ynhNr2ROkDVN0j4Y"], ...(secret ? [["旧テニスタイマー", "https://scratch.mit.edu/projects/1013694253"], ["旧 litlink", "https://lit.link/syukugawalink"]] : [])] },
    ];
    el("links-list").innerHTML = sections.map((section) => `<article class="link-section"><h3>${section.title}</h3><div class="link-grid">${section.links.map(([label, url]) => `<a class="button" target="_blank" rel="noopener" href="${url}">${label}</a>`).join("")}</div></article>`).join("");
  }

  private async loadRules(): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/rules_sections.json`);
      const data = await response.json() as { sections: RuleSection[] };
      this.rules = data.sections;
      this.selectedRule = this.rules[0]?.id ?? "";
      this.renderRuleNav();
      this.renderRules();
    } catch {
      this.rulesRequested = false;
      el("rule-content").innerHTML = "<p>ルールを読み込めませんでした。もう一度ルール画面を開いてください。</p>";
    }
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
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}data/news.json`);
      const data = await response.json() as { news: NewsItem[] };
      this.news = data.news;
      el("news-status").textContent = "最新情報を表示しています。";
      this.renderNews();
    } catch {
      this.newsRequested = false;
      el("news-status").textContent = "ニュースを読み込めませんでした。もう一度ニュース画面を開いてください。";
    }
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

type QrScanOptions = {
  title: string;
  hint: string;
  applyLabel: string;
  validator: (value: string) => boolean;
  invalidMessage: string;
};

class QrScanner {
  private cameraStream: MediaStream | null = null;
  private scanFrame = 0;
  private scannedValue = "";
  private resolveScan: ((value: string | null) => void) | null = null;
  private currentOptions: QrScanOptions | null = null;

  constructor() {
    el<HTMLButtonElement>("qr-close").addEventListener("click", () => this.close(null));
    el<HTMLButtonElement>("qr-cancel").addEventListener("click", () => this.close(null));
    el<HTMLButtonElement>("qr-retry").addEventListener("click", () => void this.startScanner());
    el<HTMLButtonElement>("qr-apply").addEventListener("click", () => this.close(this.scannedValue || null));
    el<HTMLDialogElement>("qr-dialog").addEventListener("close", () => this.stopScanner());
    el<HTMLDialogElement>("qr-dialog").addEventListener("cancel", () => this.stopScanner());
  }

  async scan(options: QrScanOptions): Promise<string | null> {
    this.currentOptions = options;
    this.scannedValue = "";
    el("qr-title").textContent = options.title;
    el("qr-hint").textContent = options.hint;
    el<HTMLButtonElement>("qr-apply").textContent = options.applyLabel;
    const dialog = el<HTMLDialogElement>("qr-dialog");
    if (!dialog.open) dialog.showModal();
    const result = new Promise<string | null>((resolve) => {
      this.resolveScan = resolve;
    });
    await this.startScanner();
    return result;
  }

  private async startScanner(): Promise<void> {
    const dialog = el<HTMLDialogElement>("qr-dialog");
    if (!dialog.open || !this.currentOptions) return;
    this.stopScanner();
    this.scannedValue = "";
    el("qr-status").textContent = "カメラを起動しています。QRコードを枠内に写してください。";
    el("qr-result").classList.add("hidden");
    el("qr-retry").classList.add("hidden");
    el("qr-apply").classList.add("hidden");
    try {
      const BarcodeDetector = (window as Window & { BarcodeDetector?: QrDetectorConstructor }).BarcodeDetector;
      if (BarcodeDetector) {
        try {
          await this.startNativeScanner(BarcodeDetector);
          return;
        } catch (error) {
          this.stopScanner();
          if (error instanceof DOMException && ["NotAllowedError", "NotFoundError", "NotReadableError"].includes(error.name)) throw error;
        }
      }
      await this.startFallbackScanner();
    } catch {
      this.stopScanner();
      el("qr-status").textContent = "カメラを使用できませんでした。カメラの許可とブラウザ設定を確認してください。";
      el("qr-retry").classList.remove("hidden");
    }
  }

  private async startNativeScanner(BarcodeDetector: QrDetectorConstructor): Promise<void> {
    const dialog = el<HTMLDialogElement>("qr-dialog");
    const video = el<HTMLVideoElement>("qr-video");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
    if (!dialog.open) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.cameraStream = stream;
    video.srcObject = stream;
    await video.play();
    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    el("qr-status").textContent = "QRコードをカメラに写してください。";
    const scan = async (): Promise<void> => {
      if (!dialog.open || !this.cameraStream || this.scannedValue) return;
      try {
        const [result] = await detector.detect(video);
        if (result?.rawValue) {
          this.reviewScannedValue(result.rawValue);
          return;
        }
      } catch {
        // Keep scanning.
      }
      this.scanFrame = requestAnimationFrame(() => void scan());
    };
    this.scanFrame = requestAnimationFrame(() => void scan());
  }

  private async startFallbackScanner(): Promise<void> {
    const dialog = el<HTMLDialogElement>("qr-dialog");
    const { default: jsQR } = await import("jsqr");
    if (!dialog.open) return;
    const video = el<HTMLVideoElement>("qr-video");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" } } });
    if (!dialog.open) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.cameraStream = stream;
    video.srcObject = stream;
    await video.play();
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Camera canvas is unavailable.");
    el("qr-status").textContent = "QRコードをカメラに写してください。";
    let lastScan = 0;
    const scan = (time: number): void => {
      if (!dialog.open || !this.cameraStream || this.scannedValue) return;
      if (time - lastScan < 120) {
        this.scanFrame = requestAnimationFrame(scan);
        return;
      }
      lastScan = time;
      if (video.videoWidth && video.videoHeight) {
        const scale = Math.min(1, 720 / video.videoWidth);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" });
        if (result?.data) {
          this.reviewScannedValue(result.data);
          return;
        }
      }
      this.scanFrame = requestAnimationFrame(scan);
    };
    this.scanFrame = requestAnimationFrame(scan);
  }

  private reviewScannedValue(value: string): void {
    this.stopScanner();
    const scanned = value.trim();
    const options = this.currentOptions;
    if (!options || !options.validator(scanned)) {
      el("qr-status").textContent = options?.invalidMessage ?? "読み取ったQRコードを使用できません。";
      el("qr-result").textContent = scanned;
      el("qr-result").classList.remove("hidden");
      el("qr-retry").classList.remove("hidden");
      return;
    }
    this.scannedValue = scanned;
    el("qr-status").textContent = "QRコードを読み取りました。内容を確認して入力してください。";
    el("qr-result").textContent = scanned;
    el("qr-result").classList.remove("hidden");
    el("qr-retry").classList.remove("hidden");
    el("qr-apply").classList.remove("hidden");
  }

  private close(value: string | null): void {
    this.stopScanner();
    const dialog = el<HTMLDialogElement>("qr-dialog");
    if (dialog.open) dialog.close();
    const resolve = this.resolveScan;
    this.resolveScan = null;
    this.currentOptions = null;
    this.scannedValue = "";
    resolve?.(value);
  }

  private stopScanner(): void {
    cancelAnimationFrame(this.scanFrame);
    this.scanFrame = 0;
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;
    const video = el<HTMLVideoElement>("qr-video");
    const stream = video.srcObject as MediaStream | null;
    stream?.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

class AdminController {
  private static readonly storageKey = "tennis-assist-admin-v1";
  private static readonly gateHash = "31749b1d44f155c116ce285a185146310ce0cd131f77cc1e4e1546d97feef275";

  constructor(private readonly qrScanner: QrScanner) {
    el<HTMLButtonElement>("admin-unlock").addEventListener("click", () => void this.unlock());
    el<HTMLButtonElement>("gas-save").addEventListener("click", () => this.save());
    el<HTMLButtonElement>("gas-test").addEventListener("click", () => void this.test());
    el<HTMLButtonElement>("gas-scan").addEventListener("click", () => void this.openScanner());
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

  private async openScanner(): Promise<void> {
    const scanned = await this.qrScanner.scan({
      title: "GAS URL QRコード読取",
      hint: "QRコードには GAS Web アプリ URL（/exec）のみを入れてください。API キーは読み取りません。",
      applyLabel: "このURLを入力",
      validator: (value) => this.isGasDeploymentUrl(value),
      invalidMessage: "GAS Web アプリ URL（/exec）のQRコードではありません。",
    });
    if (!scanned) return;
    el<HTMLInputElement>("gas-url").value = scanned;
    el("gas-status").textContent = "QRコードからURLを入力しました。設定を保存するかテスト送信で確認してください。";
  }

  private isGasDeploymentUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && url.hostname === "script.google.com" && /^\/macros\/s\/[^/]+\/exec$/.test(url.pathname);
    } catch {
      return false;
    }
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
      const body = { api_key: settings.apiKey, event: "connection_test", target_sheet: "送信テスト", source: "WRO RoboSports Assist", sent_at: timestamp(), payload: { message: "Web app connection test" } };
      const response = await fetch(settings.gasUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      await ensureGasSuccess(response);
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
  private readonly qrScanner = new QrScanner();
  private recordTimerPending = false;
  private admin: AdminController | null = null;
  private ballsFullscreen = false;

  constructor() {
    syncViewportMetrics();
    window.addEventListener("resize", syncViewportMetrics);
    window.visualViewport?.addEventListener("resize", syncViewportMetrics);
    this.timer = new TimerController(
      () => {
        if (this.recordTimerPending) {
          this.recordTimerPending = false;
          void this.timer.leaveFullscreen();
          this.clearFlow();
          this.show("records");
          this.records.timerFinished();
        }
      },
      () => this.show("timer"),
    );
    this.balls = new BallController((match) => {
      this.setFlow(match, "タイマー待機中");
      this.recordTimerPending = true;
      this.timer.prepare();
      this.show("timer");
    });
    this.records = new RecordsController((event, match) => this.handleFlow(event, match), this.qrScanner);
    document.querySelectorAll<HTMLButtonElement>(".nav").forEach((button) => {
      button.addEventListener("click", () => {
        const screen = button.dataset.screen as Screen;
        if (screen === "links") this.visitLinks();
        else this.show(screen);
      });
    });
    document.querySelectorAll<HTMLButtonElement>(".jump").forEach((button) => button.addEventListener("click", () => this.show(button.dataset.target as Screen)));
    el<HTMLButtonElement>("dashboard-balls-fullscreen").addEventListener("click", () => void this.enterBallsFullscreen());
    el<HTMLButtonElement>("balls-fullscreen").addEventListener("click", () => void this.toggleBallsFullscreen());
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && this.ballsFullscreen) this.setBallsFullscreen(false);
    });
    el<HTMLButtonElement>("admin-exit").addEventListener("click", () => this.deactivateSecret());
    this.content.init();
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      window.addEventListener("load", () => {
        void navigator.serviceWorker
          .register(`${import.meta.env.BASE_URL}sw.js`)
          .then((registration) => registration.update());
      });
    }
  }

  private show(screen: Screen): void {
    this.timer.noteActivity();
    if (screen !== "balls" && this.ballsFullscreen) void this.leaveBallsFullscreen();
    document.querySelectorAll(".screen").forEach((element) => element.classList.remove("active"));
    el(`screen-${screen}`).classList.add("active");
    document.querySelectorAll<HTMLButtonElement>(".nav").forEach((button) => button.classList.toggle("active", button.dataset.screen === screen));
    this.content.open(screen, this.secret);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  private async enterBallsFullscreen(): Promise<void> {
    this.show("balls");
    this.setBallsFullscreen(true);
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {
      // The in-page fullscreen layout still maximizes the court.
    }
  }

  private async toggleBallsFullscreen(): Promise<void> {
    if (this.ballsFullscreen) {
      await this.leaveBallsFullscreen();
    } else {
      await this.enterBallsFullscreen();
    }
  }

  private async leaveBallsFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen?.();
      } catch {
        // The in-page layout can still be restored.
      }
    }
    this.setBallsFullscreen(false);
  }

  private setBallsFullscreen(active: boolean): void {
    this.ballsFullscreen = active;
    document.body.classList.toggle("balls-compact", active);
    el<HTMLButtonElement>("balls-fullscreen").textContent = active ? "全画面解除" : "全画面表示";
  }

  private handleFlow(event: FlowEvent, match = 0): void {
    if (event === "finished") {
      this.clearFlow();
      return;
    }
    if (event === "reset") {
      this.recordTimerPending = false;
      this.clearFlow();
      this.balls.resetWorkflow();
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
    this.admin ??= new AdminController(this.qrScanner);
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
