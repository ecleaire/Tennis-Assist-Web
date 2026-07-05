import "./styles.css";

declare const __APP_VERSION__: string;

type Screen = "dashboard" | "operation" | "timer" | "referee" | "balls" | "records" | "rules" | "news" | "links" | "development";
type Category = "【終了・その時点で採点】（通常の試合停止）" | "【違反・自動敗北 / 失格】試合前・競技全般" | "【違反・自動敗北 / 失格】試合中の違反";
type FlowEvent = "start" | "next" | "balls" | "timer" | "finished" | "reset";
type MatchType = "練習試合" | "公式試合";

interface MatchRecord {
  recordId: string;
  timestamp: string;
  recordKind: "マッチ" | "試合結果";
  seriesId: string;
  seriesNumber: number;
  court: string;
  competitionId: string;
  matchNumber: number;
  matchType: MatchType;
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
  sendError?: string;
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
  accentMode: "standard" | "admin" | "light";
  matchType: MatchType;
  gasConnectedAt?: string;
  gasConnectedUrl?: string;
  dayCheckAt?: string;
}

type TimerSettingSource = "sheet" | "manual" | "default";

interface ExternalTimerSetting {
  mode: "random" | "fixed";
  minSeconds: number;
  maxSeconds: number;
  stepSeconds: number;
  fixedSeconds: number;
  source: TimerSettingSource;
  loadedAt: string;
}

type TeamImportResult = {
  status: "loaded" | "default" | "failed";
  message: string;
  count: number;
};

type TimerSettingLoadResult = {
  status: "loaded" | "cached" | "failed";
  message: string;
};

type AdminMode = "standard" | "hyogo" | "mie" | "rsam";
type AppVariant = "venue" | "general";

type AppVariantConfig = {
  id: AppVariant;
  titleSuffix: string;
  showNews: boolean;
  allowLightUi: boolean;
  allowTokyoClock: boolean;
};

type ManagedGasConfig = {
  label: string;
  url: string;
  spreadsheetUrl: string;
};

type QrDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

type QrDetectorConstructor = new (options: { formats: string[] }) => QrDetector;

type GasResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

type BallLayout = ReadonlyArray<readonly [string, number, number]>;

type LockableScreenOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
};

const defaultTeams = [
  "ALFA", "BRAVO", "CHARLIE", "DELTA", "ECHO", "FOXTROT", "GOLF", "HOTEL",
  "INDIA", "JULIETT", "KILO", "LIMA", "MIKE", "NOVEMBER", "OSCAR", "PAPA",
  "QUEBEC", "SIERRA", "TANGO", "UNIFORM", "VICTOR", "WHISKEY", "YANKEE", "ZULU",
] as const;

const appVariants: Record<AppVariant, AppVariantConfig> = {
  venue: {
    id: "venue",
    titleSuffix: "大会用",
    showNews: false,
    allowLightUi: true,
    allowTokyoClock: false,
  },
  general: {
    id: "general",
    titleSuffix: "general",
    showNews: true,
    allowLightUi: true,
    allowTokyoClock: true,
  },
};

const managedSheets = {
  hyogo: "https://docs.google.com/spreadsheets/d/1pxTMvdcpTMFeSfroOeTyh2hziLgfAvLxe0Nh79sMk_0/edit?usp=sharing",
  mie: "https://docs.google.com/spreadsheets/d/185jPLjc-nBri49aOr-CVw1baUI1qaxqjgcWLRS2-oxo/edit?usp=sharing",
  shared: "https://docs.google.com/spreadsheets/d/1BTByUtO5IAdwdTYCMNhFUtqeRy2yIWpAnCZRQw_b0HU/edit?usp=sharing",
  self: "https://docs.google.com/spreadsheets/d/1PKAZgb8HZFww-P9CZTkzVqleAtIOFgkl8Ngk6lZwcTA/edit?usp=sharing",
} as const;

const managedGasUrlsByPassword = new Map<string, ManagedGasConfig>([
  ["HYOGO", { label: "WRO兵庫", url: "https://script.google.com/macros/s/AKfycbw0wWKqqar4adDt9SXKmQdO82twKvUjomcrfYGvb7_2mi1cP5rVW7QR62Ijuc5uNpJRgQ/exec", spreadsheetUrl: managedSheets.hyogo }],
  ["hyogo", { label: "WRO兵庫", url: "https://script.google.com/macros/s/AKfycbw0wWKqqar4adDt9SXKmQdO82twKvUjomcrfYGvb7_2mi1cP5rVW7QR62Ijuc5uNpJRgQ/exec", spreadsheetUrl: managedSheets.hyogo }],
  ["mie", { label: "WRO三重", url: "https://script.google.com/macros/s/AKfycbx6OkFR799hYZ3DaYWxfluCTuDKf6sE34HtVuzMHTfJQd5Hs0YcQujZiVxtEOxzvN5-/exec", spreadsheetUrl: managedSheets.mie }],
  ["MIE", { label: "WRO三重", url: "https://script.google.com/macros/s/AKfycbx6OkFR799hYZ3DaYWxfluCTuDKf6sE34HtVuzMHTfJQd5Hs0YcQujZiVxtEOxzvN5-/exec", spreadsheetUrl: managedSheets.mie }],
  ["mie_judge", { label: "WRO三重", url: "https://script.google.com/macros/s/AKfycbx6OkFR799hYZ3DaYWxfluCTuDKf6sE34HtVuzMHTfJQd5Hs0YcQujZiVxtEOxzvN5-/exec", spreadsheetUrl: managedSheets.mie }],
  ["JUDGE", { label: "WRO共有確認用", url: "https://script.google.com/macros/s/AKfycbyniW9kgzwtMI0i5X5ZtDlnqGz1yaeuHnXZZ7s67fIS54tdzg1U__sZUzLDoLqUY8lt/exec", spreadsheetUrl: managedSheets.shared }],
  ["judge", { label: "WRO共有確認用", url: "https://script.google.com/macros/s/AKfycbyniW9kgzwtMI0i5X5ZtDlnqGz1yaeuHnXZZ7s67fIS54tdzg1U__sZUzLDoLqUY8lt/exec", spreadsheetUrl: managedSheets.shared }],
  ["rsam", { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", spreadsheetUrl: managedSheets.self }],
  ["gas", { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", spreadsheetUrl: managedSheets.self }],
  ["wrorsam", { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", spreadsheetUrl: managedSheets.self }],
]);

const managedGasUrls = new Set(Array.from(managedGasUrlsByPassword.values(), (config) => config.url));

function currentAppVariant(): AppVariantConfig {
  return window.location.pathname.split("/").filter(Boolean).includes("general") ? appVariants.general : appVariants.venue;
}

let teams: string[] = [...defaultTeams];
const csvColumns = [
  "日時", "記録種別", "種別", "対戦ID", "コート", "試合番号", "マッチ番号", "チームA", "チームB",
  "チームA勝数", "チームA敗数", "チームAオレンジ", "チームA紫", "チームA得点", "チームA違反数",
  "チームB勝数", "チームB敗数", "チームBオレンジ", "チームB紫", "チームB得点", "チームB違反数",
  "引き分け数", "総合勝者", "マッチ勝者", "結果", "終了カテゴリ", "終了理由", "対象チーム", "メモ",
] as const;

const LINKS = {
  japanFinalRule: "https://drive.google.com/file/d/1JMmggxMfSWABUcA5sbM9U3qffb-ZMb2U/view?usp=sharing",
  worldRules: "https://wro-association.org/competition/2026-season/#:~:text=ROBOSPORTS-,GENERAL%20%26%20GAME%20RULES,-PLAYFIELD%20DOUBLE%20TENNIS",
  officialQa: "https://wro-association.org/competition/questions-answers/",
  googleRules: "https://drive.google.com/file/d/16zFJ_bD8sfLZZF6QkRCWQ6azN_Dj3eUG/view?usp=sharing",
  deeplRules: "https://drive.google.com/file/d/1z_Q7M7lP2Q55Zo3qZgzH-bN_QqhCx-wJ/view?usp=sharing",
  wroJapan: "https://www.wroj.org/action/2026",
  wroInternational: "https://wro-association.org/",
  wroHyogo: "https://wro-hyogo.jp/",
  wroTokyo: "https://www.wro-tokyo-competition.net/",
  wroMie: "https://miraido.net/",
  wroNara: "https://sites.google.com/view/wro-nara/%E3%83%9B%E3%83%BC%E3%83%A0?authuser=0",
  youtube: "https://youtube.com/playlist?list=PL5-Hc8xo0J3mKylDKfNnTaFIZ6hqDSZnh&si=ynhNr2ROkDVN0j4Y",
  legacyTimer: "https://scratch.mit.edu/projects/1013694253",
  legacyLitlink: "https://lit.link/syukugawalink",
} as const;

const screenLabels: Record<Screen, string> = {
  dashboard: "ホーム",
  operation: "試合運営",
  timer: "タイマー",
  referee: "審判タイマー",
  balls: "ボール配置",
  records: "試合記録",
  rules: "ルール",
  news: "ニュース",
  links: "リンク",
  development: "管理",
};

const scoringCategory: Category = "【終了・その時点で採点】（通常の試合停止）";
const prematchCategory: Category = "【違反・自動敗北 / 失格】試合前・競技全般";
const inmatchCategory: Category = "【違反・自動敗北 / 失格】試合中の違反";
const countdownAudioStartRemainingSeconds = 9.95;
const courtOptions = Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)}コート`);
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

const elementCache = new Map<string, HTMLElement>();

function el<T extends HTMLElement>(id: string): T {
  const cached = elementCache.get(id);
  if (cached?.isConnected) return cached as T;
  const found = document.getElementById(id);
  if (!found) throw new Error(`Missing element: ${id}`);
  elementCache.set(id, found);
  return found as T;
}

function els<T extends HTMLElement>(id: string): T[] {
  return Array.from(document.querySelectorAll<T>(`[id="${id}"], [data-sync-id="${id}"]`));
}

function setText(elements: HTMLElement[], text: string | null): void {
  elements.forEach((element) => {
    element.textContent = text;
  });
}

function toggleClass(elements: HTMLElement[], className: string, force?: boolean): void {
  elements.forEach((element) => element.classList.toggle(className, force));
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

function linkifyText(text: string): string {
  const escaped = escapeText(text);
  return escaped.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const cleanUrl = url.replace(/[。、，．)）\]]+$/, "");
    const suffix = url.slice(cleanUrl.length);
    return `<a class="text-link" href="${cleanUrl}" target="_blank" rel="noopener noreferrer">${cleanUrl}</a>${suffix}`;
  });
}

function timestamp(): string {
  const date = new Date();
  const two = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())} ${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
}

function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function defaultExternalTimerSetting(source: TimerSettingSource = "default"): ExternalTimerSetting {
  return { mode: "random", minSeconds: 60, maxSeconds: 120, stepSeconds: 1, fixedSeconds: 120, source, loadedAt: timestamp() };
}

function normalizeExternalTimerSetting(raw: unknown, source: TimerSettingSource): ExternalTimerSetting {
  const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const readNumber = (...keys: string[]): number | null => {
    for (const key of keys) {
      const value = data[key];
      if (value === undefined || value === null || value === "") continue;
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) return Math.floor(number);
    }
    return null;
  };
  const setting = defaultExternalTimerSetting(source);
  const mode = String(data.mode ?? "").toLowerCase();
  setting.mode = mode === "fixed" || data.mode === "固定" ? "fixed" : "random";
  setting.minSeconds = readNumber("minSeconds", "min_seconds", "min", "最小秒数") ?? setting.minSeconds;
  setting.maxSeconds = readNumber("maxSeconds", "max_seconds", "max", "最大秒数") ?? setting.maxSeconds;
  setting.stepSeconds = readNumber("stepSeconds", "step_seconds", "step", "間隔秒数") ?? setting.stepSeconds;
  setting.fixedSeconds = readNumber("fixedSeconds", "fixed_seconds", "fixed", "固定秒数") ?? setting.fixedSeconds;
  if (setting.maxSeconds < setting.minSeconds) [setting.minSeconds, setting.maxSeconds] = [setting.maxSeconds, setting.minSeconds];
  setting.stepSeconds = Math.max(1, setting.stepSeconds);
  setting.fixedSeconds = Math.max(1, setting.fixedSeconds || setting.maxSeconds);
  setting.loadedAt = typeof data.loadedAt === "string" && data.loadedAt ? data.loadedAt : timestamp();
  return setting;
}

function externalTimerSettingText(setting: ExternalTimerSetting, prefix = "ローカルルールを適用しています。"): string {
  if (setting.mode === "fixed") {
    return `${prefix} タイマーは ${formatClock(setting.fixedSeconds)} 固定です。`;
  }
  return `${prefix} タイマーランダム範囲は ${formatClock(setting.minSeconds)}〜${formatClock(setting.maxSeconds)} です。秒数ランダム間隔は ${setting.stepSeconds}秒間隔です。`;
}

function deviceSource(): string {
  const width = Math.round(window.visualViewport?.width ?? window.innerWidth);
  const height = Math.round(window.visualViewport?.height ?? window.innerHeight);
  const device =
    isPhonePortrait() ? "phone-portrait" :
      navigator.maxTouchPoints > 0 ? "touch-device" :
        "desktop";
  const dpr = Math.round((window.devicePixelRatio || 1) * 100) / 100;
  return `RoboSports Assist / ${device} / ${width}x${height} css / dpr ${dpr}`;
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

let viewportSyncFrame = 0;
function scheduleViewportMetricsSync(): void {
  if (viewportSyncFrame) return;
  viewportSyncFrame = window.requestAnimationFrame(() => {
    viewportSyncFrame = 0;
    syncViewportMetrics();
  });
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
    if (result.error === "lock_busy") {
      throw new Error(result.message || "同時送信が集中しています。少し待ってから履歴で再送してください。");
    }
    throw new Error(result.message || result.error || `GAS request failed: ${response.status}`);
  }
}

class TimerAudioCueController {
  private context: AudioContext | null = null;
  private readonly scheduledSources: AudioScheduledSourceNode[] = [];
  private countdownBuffer: AudioBuffer | null = null;
  private thirtyBuffer: AudioBuffer | null = null;
  private loading: Promise<void> | null = null;
  private scheduled = false;

  async prepare(): Promise<void> {
    const context = this.audioContext();
    if (context?.state === "suspended") void context.resume();
    await this.loadBuffers();
    if (context?.state === "suspended") await context.resume().catch(() => {});
  }

  playThirtySeconds(): void {
    if (!this.playBuffer(this.thirtyBuffer)) this.beep(1175, 0.18, "sine", 0.16);
  }

  playFinish(): void {
    // Finish sound is intentionally disabled for match operation.
  }

  playCountdown(remaining = 10): void {
    const offset = this.countdownOffset(remaining);
    if (!this.playBuffer(this.countdownBuffer, offset)) this.beep(1200, 0.08, "sine", 0.12);
  }

  scheduleMainCues(remaining: number, total: number): boolean {
    const context = this.audioContext();
    if (!context || !this.countdownBuffer || !this.thirtyBuffer || remaining <= 0) return false;
    this.stopScheduled();
    const elapsed = total - remaining;
    const now = context.currentTime;
    if (elapsed < 30 && remaining > 0) this.scheduleBuffer(this.thirtyBuffer, now + Math.max(0, 30 - elapsed));
    if (remaining > countdownAudioStartRemainingSeconds) {
      this.scheduleBuffer(this.countdownBuffer, now + (remaining - countdownAudioStartRemainingSeconds));
    } else {
      this.scheduleBuffer(this.countdownBuffer, now, this.countdownOffset(remaining));
    }
    this.scheduled = this.scheduledSources.length > 0;
    return this.scheduled;
  }

  hasScheduledMainCues(): boolean {
    return this.scheduled;
  }

  stopScheduled(): void {
    for (const source of this.scheduledSources.splice(0)) {
      try {
        source.stop();
      } catch {
        // The source may already have finished.
      }
    }
    this.scheduled = false;
  }

  private audioContext(): AudioContext | null {
    if (this.context) return this.context;
    const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    try {
      this.context = new AudioContextCtor();
    } catch {
      this.context = null;
    }
    return this.context;
  }

  private async loadBuffers(): Promise<void> {
    if (this.countdownBuffer && this.thirtyBuffer) return;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      const [countdown, thirty] = await Promise.all([
        this.fetchBuffer(`${import.meta.env.BASE_URL}assets/countdown-10.aac`),
        this.fetchBuffer(`${import.meta.env.BASE_URL}assets/thirty-seconds.mp3`),
      ]);
      this.countdownBuffer = countdown;
      this.thirtyBuffer = thirty;
    })().catch(() => {
      this.countdownBuffer = null;
      this.thirtyBuffer = null;
    }).finally(() => {
      this.loading = null;
    });
    await this.loading;
  }

  private async fetchBuffer(url: string): Promise<AudioBuffer | null> {
    const context = this.audioContext();
    if (!context) return null;
    const response = await fetch(url);
    const data = await response.arrayBuffer();
    return context.decodeAudioData(data.slice(0));
  }

  private playBuffer(buffer: AudioBuffer | null, offset = 0): boolean {
    const context = this.audioContext();
    if (!context || !buffer) return false;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0, Math.min(offset, Math.max(0, buffer.duration - 0.05)));
    return true;
  }

  private scheduleBuffer(buffer: AudioBuffer, when: number, offset = 0): void {
    const context = this.audioContext();
    if (!context) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.addEventListener("ended", () => {
      const index = this.scheduledSources.indexOf(source);
      if (index >= 0) this.scheduledSources.splice(index, 1);
      if (this.scheduledSources.length === 0) this.scheduled = false;
    }, { once: true });
    source.start(Math.max(context.currentTime, when), Math.min(offset, Math.max(0, buffer.duration - 0.05)));
    this.scheduledSources.push(source);
  }

  private countdownOffset(remaining: number): number {
    return Math.max(0, Math.min(9.9, countdownAudioStartRemainingSeconds - remaining));
  }

  private beep(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    const context = this.audioContext();
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}

class TimerController {
  private readonly mode = el<HTMLElement>("timer-mode");
  private readonly time = el<HTMLOutputElement>("timer-time");
  private readonly progress = el<HTMLProgressElement>("timer-progress");
  private readonly notice = el<HTMLElement>("cold-notice");
  private readonly caption = el<HTMLElement>("sub-caption");
  private readonly subTime = el<HTMLOutputElement>("sub-time");
  private readonly dashboardTimes = els<HTMLOutputElement>("dashboard-time");
  private readonly dashboardModes = els<HTMLElement>("dashboard-mode");
  private readonly dashboardSubCaptions = els<HTMLElement>("dashboard-sub-caption");
  private readonly dashboardSubTimes = els<HTMLOutputElement>("dashboard-sub-time");
  private readonly startButton = el<HTMLButtonElement>("timer-start");
  private readonly dashboardStartButtons = els<HTMLButtonElement>("dashboard-timer-start");
  private readonly resetButton = el<HTMLButtonElement>("timer-reset");
  private readonly step = el<HTMLSelectElement>("timer-step");
  private readonly dashboardSteps = els<HTMLSelectElement>("dashboard-timer-step");
  private readonly endConfirmDialog = el<HTMLDialogElement>("timer-end-confirm-dialog");
  private total = 120;
  private remaining = 120;
  private running = false;
  private started = false;
  private notifiedFinish = false;
  private lastFrame = performance.now();
  private endAt = 0;
  private coldShown = false;
  private coldUntil = 0;
  private subRemaining = 0;
  private subCaption = "";
  private randomStep: number | "manual" | "tokyo" = 5;
  private manualSeconds = 120;
  private fixedSeconds: number | null = null;
  private externalTimerSetting: ExternalTimerSetting | null = null;
  private initialReset = true;
  private secret = false;
  private hyogo = false;
  private stateVersion = 0;
  private autoResetTimer = 0;
  private dashboardOverride: string | null = null;
  private readonly audioCues = new TimerAudioCueController();
  private thirtyCuePlayed = false;
  private countdownCuePlayed = false;
  private finishCuePlayed = false;
  private endWarningArmed = false;
  private stopWarningArmed = false;
  private stopWarningTimer = 0;

  constructor(
    private readonly finished: (naturalEnd?: boolean) => void,
    private readonly activated: () => void,
    private readonly displayFullscreenExited: () => void = () => {},
  ) {
    this.startButton.addEventListener("click", () => void this.toggle());
    this.dashboardStartButtons.forEach((button) => button.addEventListener("click", () => void this.toggle()));
    el<HTMLButtonElement>("timer-end").addEventListener("click", () => this.requestEnd());
    els<HTMLButtonElement>("dashboard-timer-end").forEach((button) => button.addEventListener("click", () => this.requestEnd()));
    el<HTMLButtonElement>("timer-end-confirm").addEventListener("click", () => this.forceEndFromConfirm());
    this.endConfirmDialog.addEventListener("close", () => {
      if (this.endConfirmDialog.returnValue !== "default") this.endWarningArmed = false;
    });
    this.resetButton.addEventListener("click", () => this.reset());
    els<HTMLButtonElement>("dashboard-timer-reset").forEach((button) => button.addEventListener("click", () => this.reset()));
    el<HTMLButtonElement>("timer-fullscreen").addEventListener("click", () => void this.toggleFullscreen());
    el<HTMLButtonElement>("timer-ten").addEventListener("click", () => this.toggleSubTimer(10, "コールドカウント"));
    el<HTMLButtonElement>("timer-five").addEventListener("click", () => this.toggleSubTimer(5, "オーバーボール"));
    els<HTMLButtonElement>("dashboard-timer-ten").forEach((button) => button.addEventListener("click", () => this.toggleSubTimer(10, "コールドカウント")));
    els<HTMLButtonElement>("dashboard-timer-five").forEach((button) => button.addEventListener("click", () => this.toggleSubTimer(5, "オーバーボール")));
    this.step.addEventListener("change", () => {
      this.dashboardSteps.forEach((step) => { step.value = this.step.value; });
      this.chooseStep();
    });
    this.dashboardSteps.forEach((step) => step.addEventListener("change", () => {
      this.step.value = step.value;
      this.dashboardSteps.forEach((other) => { other.value = step.value; });
      this.chooseStep();
    }));
    this.setupManualOptions();
    el<HTMLButtonElement>("manual-apply").addEventListener("click", () => this.applyManual());
    document.addEventListener("keydown", (event) => this.onKey(event));
    document.addEventListener("fullscreenchange", () => {
      const timerFullscreen = document.fullscreenElement === el("timer-shell");
      if (!document.fullscreenElement) {
        try {
          screen.orientation?.unlock?.();
        } catch {
          // Orientation locking is optional and browser dependent.
        }
      }
      if (!document.fullscreenElement || timerFullscreen) this.setCompact(timerFullscreen);
    });
    this.step.value = String(this.randomStep);
    this.dashboardSteps.forEach((step) => { step.value = String(this.randomStep); });
    this.reset();
    requestAnimationFrame((now) => this.frame(now));
  }

  setPracticeTimerPresetsAvailable(active: boolean): void {
    const presets = [
      ["preset-60", "練習プリセット: 1分"],
      ["preset-90", "練習プリセット: 1分30秒"],
      ["preset-120", "練習プリセット: 2分"],
    ] as const;
    const sync = (select: HTMLSelectElement): void => {
      presets.forEach(([value, label]) => {
        const existing = select.querySelector<HTMLOptionElement>(`option[value="${value}"]`);
        if (active && !existing) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = label;
          select.append(option);
        }
        if (!active && existing) existing.remove();
      });
      if (!active && select.value.startsWith("preset-")) select.value = "5";
    };
    sync(this.step);
    this.dashboardSteps.forEach(sync);
    if (!active && this.fixedSeconds !== null) {
      this.fixedSeconds = null;
      this.randomStep = 5;
      this.reset();
    }
  }

  setSecret(active: boolean): void {
    this.secret = active;
    this.setupManualOptions();
  }

  setHyogoMode(active: boolean): void {
    this.hyogo = active;
    if (active) {
      this.randomStep = 5;
      this.step.value = "5";
      this.dashboardSteps.forEach((step) => { step.value = "5"; });
    }
    if (!this.running && !this.started) this.reset();
  }

  setExternalTimerSetting(setting: ExternalTimerSetting | null): void {
    this.externalTimerSetting = setting;
    if (!this.running && !this.started && this.randomStep !== "tokyo") this.reset();
  }

  setTokyoClockModeAvailable(active: boolean): void {
    const sync = (select: HTMLSelectElement): void => {
      const existing = select.querySelector<HTMLOptionElement>('option[value="tokyo"]');
      if (active && !existing) {
        const option = document.createElement("option");
        option.value = "tokyo";
        option.textContent = "東京現在時刻表示";
        select.append(option);
      }
      if (!active && existing) existing.remove();
      if (!active && select.value === "tokyo") select.value = "5";
    };
    sync(this.step);
    this.dashboardSteps.forEach(sync);
    if (!active && this.randomStep === "tokyo") {
      this.randomStep = 5;
      this.reset();
    }
  }

  prepare(): void {
    this.reset();
  }

  resetDefault(): void {
    this.touchTimerState();
    this.clearStopWarning();
    this.endWarningArmed = false;
    if (this.endConfirmDialog.open) this.endConfirmDialog.close("cancel");
    this.running = false;
    this.started = false;
    this.notifiedFinish = false;
    this.endAt = 0;
    this.audioCues.stopScheduled();
    this.thirtyCuePlayed = false;
    this.countdownCuePlayed = false;
    this.finishCuePlayed = false;
    this.total = 120;
    this.remaining = 120;
    this.mode.textContent = "試合準備完了";
    this.coldShown = false;
    this.coldUntil = 0;
    this.notice.textContent = "";
    this.subRemaining = 0;
    this.subTime.classList.add("hidden");
    toggleClass(this.dashboardSubTimes, "hidden", true);
    setText(this.dashboardSubCaptions, "");
    toggleClass(this.dashboardSubCaptions, "count", false);
    this.caption.textContent = "";
    this.caption.classList.remove("count");
    this.dashboardOverride = null;
    this.syncControls();
    this.render();
  }

  displayText(): string {
    return this.time.textContent || "02 : 00";
  }

  setDashboardOverride(value: string | null): void {
    this.dashboardOverride = value;
    this.render();
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
    this.displayFullscreenExited();
  }

  async enterDisplayFullscreen(): Promise<void> {
    await this.enterFullscreen(true);
  }

  private chooseStep(): void {
    this.touchTimerState();
    if (this.step.value === "manual") {
      el<HTMLDialogElement>("manual-dialog").showModal();
      return;
    }
    if (this.step.value === "tokyo") {
      this.fixedSeconds = null;
      this.randomStep = "tokyo";
      this.running = false;
      this.started = false;
      this.notifiedFinish = false;
      this.endAt = 0;
      this.audioCues.stopScheduled();
      this.mode.textContent = "東京現在時刻";
      this.dashboardSteps.forEach((step) => { step.value = "tokyo"; });
      this.syncControls();
      this.render();
      return;
    }
    if (this.step.value.startsWith("preset-")) {
      this.fixedSeconds = Number(this.step.value.replace("preset-", "")) || 120;
      this.randomStep = 5;
      this.reset();
      return;
    }
    this.fixedSeconds = null;
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
    this.dashboardSteps.forEach((step) => { step.value = "manual"; });
    this.reset();
  }

  private generatedDuration(): number {
    if (this.fixedSeconds !== null) return this.fixedSeconds;
    if (this.randomStep === "tokyo") return 120;
    if (this.externalTimerSetting) {
      if (this.externalTimerSetting.mode === "fixed") return this.externalTimerSetting.fixedSeconds;
      const { minSeconds, maxSeconds, stepSeconds } = this.externalTimerSetting;
      const count = Math.floor((maxSeconds - minSeconds) / stepSeconds) + 1;
      return minSeconds + Math.floor(Math.random() * count) * stepSeconds;
    }
    if (this.hyogo) {
      const candidates = [90, 95, 100, 105, 110, 115, 120];
      return candidates[Math.floor(Math.random() * candidates.length)] ?? 120;
    }
    if (this.randomStep === "manual") return this.manualSeconds;
    const count = Math.floor((120 - 60) / this.randomStep) + 1;
    return 60 + Math.floor(Math.random() * count) * this.randomStep;
  }

  private reset(): void {
    this.touchTimerState();
    this.clearStopWarning();
    this.endWarningArmed = false;
    if (this.endConfirmDialog.open) this.endConfirmDialog.close("cancel");
    this.running = false;
    this.started = false;
    this.notifiedFinish = false;
    this.endAt = 0;
    this.audioCues.stopScheduled();
    this.thirtyCuePlayed = false;
    this.countdownCuePlayed = false;
    this.finishCuePlayed = false;
    if (this.randomStep === "tokyo") {
      this.total = 120;
      this.remaining = 120;
      this.mode.textContent = "東京現在時刻";
      this.syncControls();
      this.render();
      return;
    }
    this.total = this.initialReset ? 120 : this.generatedDuration();
    this.initialReset = false;
    this.remaining = this.total;
    this.mode.textContent = "試合準備完了";
    this.coldShown = false;
    this.coldUntil = 0;
    this.notice.textContent = "";
    this.subRemaining = 0;
    this.subTime.classList.add("hidden");
    toggleClass(this.dashboardSubTimes, "hidden", true);
    setText(this.dashboardSubCaptions, "");
    toggleClass(this.dashboardSubCaptions, "count", false);
    this.caption.textContent = "";
    this.caption.classList.remove("count");
    this.syncControls();
    this.render();
  }

  private async toggle(): Promise<void> {
    if (this.randomStep === "tokyo") return;
    if (this.running) this.requestPause();
    else await this.start();
  }

  private async start(): Promise<void> {
    if (this.remaining <= 0) return;
    this.touchTimerState();
    this.clearStopWarning();
    await this.audioCues.prepare();
    this.activated();
    void this.enterFullscreen(true);
    this.endAt = performance.now() + this.remaining * 1000;
    this.audioCues.scheduleMainCues(this.remaining, this.total);
    this.running = true;
    this.started = true;
    this.mode.textContent = "試合進行中";
    this.caption.textContent = "";
    this.notice.textContent = this.coldUntil > performance.now() ? "ここからコールドが適応されます" : "";
    this.syncControls();
  }

  private requestPause(): void {
    this.touchTimerState();
    if (!this.running) return;
    if (!this.stopWarningArmed) {
      this.stopWarningArmed = true;
      this.notice.textContent = "タイマー作動中です。停止する場合はもう一度「停止」を押してください。";
      this.syncControls();
      window.clearTimeout(this.stopWarningTimer);
      this.stopWarningTimer = window.setTimeout(() => this.clearStopWarning(), 3000);
      return;
    }
    this.pause();
  }

  private pause(): void {
    this.touchTimerState();
    this.clearStopWarning();
    if (this.endAt) this.remaining = Math.max(0, (this.endAt - performance.now()) / 1000);
    this.endAt = 0;
    this.audioCues.stopScheduled();
    this.running = false;
    this.endWarningArmed = false;
    this.mode.textContent = "一時停止中";
    this.caption.textContent = "";
    this.notice.textContent = "タイマーを一時停止しています";
    this.syncControls();
  }

  private requestEnd(): void {
    this.touchTimerState();
    this.clearStopWarning();
    if (!this.running || this.remaining <= 0) {
      this.end();
      return;
    }
    if (!this.endWarningArmed) {
      this.endWarningArmed = true;
      this.notice.textContent = "タイマー作動中です。終了する場合はもう一度「終了」を押してください。";
      return;
    }
    if (!this.endConfirmDialog.open) this.endConfirmDialog.showModal();
  }

  private forceEndFromConfirm(): void {
    this.endWarningArmed = false;
    this.clearStopWarning();
    this.end();
  }

  private end(): void {
    this.touchTimerState();
    this.clearStopWarning();
    this.endWarningArmed = false;
    if (this.endConfirmDialog.open) this.endConfirmDialog.close("default");
    this.audioCues.stopScheduled();
    this.running = false;
    this.endAt = 0;
    this.remaining = 0;
    this.mode.textContent = "終了";
    this.notice.textContent = "";
    this.caption.textContent = "ランダム再生成で新しいタイマーを作れます。";
    this.playFinishCue();
    this.scheduleAutoReset();
    this.syncControls();
    this.render();
    this.emitFinish(true, false);
  }

  private emitFinish(force = false, naturalEnd = false): void {
    if (this.started && (force || !this.notifiedFinish)) {
      this.notifiedFinish = true;
      this.finished(naturalEnd);
    }
  }

  private frame(now: number): void {
    const delta = Math.max(0, now - this.lastFrame) / 1000;
    this.lastFrame = now;
    if (this.running) {
      this.remaining = this.endAt ? Math.max(0, (this.endAt - now) / 1000) : Math.max(0, this.remaining - delta);
      if (!this.coldShown && this.total - this.remaining >= 30) {
        this.coldShown = true;
        this.coldUntil = now + 10000;
        this.playThirtySecondCue();
      }
      this.playCountdownCue();
      if (this.coldUntil > now) this.notice.textContent = "ここからコールドが適応されます";
      else if (this.endWarningArmed) this.notice.textContent = "タイマー作動中です。終了する場合はもう一度「終了」を押してください。";
      else if (this.stopWarningArmed) this.notice.textContent = "タイマー作動中です。停止する場合はもう一度「停止」を押してください。";
      else if (this.notice.textContent !== "タイマーを一時停止しています") this.notice.textContent = "";
      if (this.remaining === 0) {
        this.touchTimerState();
        this.clearStopWarning();
        this.endWarningArmed = false;
        if (this.endConfirmDialog.open) this.endConfirmDialog.close("cancel");
        this.running = false;
        this.endAt = 0;
        this.mode.textContent = "終了";
        this.caption.textContent = "ランダム再生成で新しいタイマーを作れます。";
        this.playFinishCue();
        this.scheduleAutoReset();
        this.syncControls();
        this.emitFinish(false, true);
      }
    }
    if (this.subRemaining > 0) {
      this.subRemaining = Math.max(0, this.subRemaining - delta);
      if (this.subRemaining === 0) {
        this.subTime.classList.add("hidden");
        toggleClass(this.dashboardSubTimes, "hidden", true);
        setText(this.dashboardSubCaptions, "");
        toggleClass(this.dashboardSubCaptions, "count", false);
        this.caption.classList.remove("count");
        this.caption.textContent = "";
      }
    }
    this.render();
    requestAnimationFrame((next) => this.frame(next));
  }

  private render(): void {
    if (this.randomStep === "tokyo") {
      const parts = new Intl.DateTimeFormat("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      const value = (type: string): string => parts.find((part) => part.type === type)?.value ?? "00";
      const formattedClock = `${value("hour")} : ${value("minute")} : ${value("second")}`;
      this.time.textContent = formattedClock;
      setText(this.dashboardTimes, this.dashboardOverride ?? formattedClock);
      setText(this.dashboardModes, this.mode.textContent);
      this.progress.value = 100;
      this.time.classList.remove("warning");
      this.progress.classList.remove("warning");
      return;
    }
    const whole = Math.ceil(this.remaining);
    const formatted = `${String(Math.floor(whole / 60)).padStart(2, "0")} : ${String(whole % 60).padStart(2, "0")}`;
    this.time.textContent = formatted;
    setText(this.dashboardTimes, this.dashboardOverride ?? formatted);
    setText(this.dashboardModes, this.mode.textContent);
    this.progress.value = this.total ? (this.remaining / this.total) * 100 : 0;
    const warning = this.remaining <= 10;
    this.time.classList.toggle("warning", warning);
    this.progress.classList.toggle("warning", warning);
    if (this.subRemaining > 0) {
      const formattedSubTime = String(Math.ceil(this.subRemaining));
      this.subTime.textContent = formattedSubTime;
      setText(this.dashboardSubTimes, formattedSubTime);
    }
  }

  private playThirtySecondCue(): void {
    if (this.thirtyCuePlayed) return;
    this.thirtyCuePlayed = true;
    if (this.audioCues.hasScheduledMainCues()) return;
    this.audioCues.playThirtySeconds();
  }

  private playCountdownCue(): void {
    if (!this.started || this.remaining <= 0 || this.remaining > 10) return;
    if (this.countdownCuePlayed) return;
    this.countdownCuePlayed = true;
    if (this.audioCues.hasScheduledMainCues()) return;
    this.audioCues.playCountdown(this.remaining);
  }

  private playFinishCue(): void {
    if (this.finishCuePlayed) return;
    this.finishCuePlayed = true;
    if (this.audioCues.hasScheduledMainCues()) return;
    this.audioCues.playFinish();
  }

  private syncControls(): void {
    const clockMode = this.randomStep === "tokyo";
    const startLabel = clockMode ? "時計表示中" : this.running ? this.stopWarningArmed ? "もう一度押すと停止" : "停止" : this.remaining < this.total && this.remaining > 0 ? "再開" : "開始";
    document.body.classList.toggle("timer-running", this.running);
    document.body.classList.toggle("timer-started", this.started);
    document.body.classList.toggle("timer-ended", this.started && this.remaining <= 0);
    this.startButton.textContent = startLabel;
    setText(this.dashboardStartButtons, startLabel);
    this.startButton.disabled = clockMode;
    this.dashboardStartButtons.forEach((button) => { button.disabled = clockMode; });
    this.resetButton.disabled = this.running || clockMode;
    els<HTMLButtonElement>("dashboard-timer-reset").forEach((button) => { button.disabled = this.running || clockMode; });
    this.step.disabled = this.running;
    this.dashboardSteps.forEach((step) => { step.disabled = this.running; });
  }

  private clearStopWarning(): void {
    this.stopWarningArmed = false;
    if (this.stopWarningTimer) {
      window.clearTimeout(this.stopWarningTimer);
      this.stopWarningTimer = 0;
    }
    this.syncControls();
  }

  private toggleSubTimer(seconds: number, label: string): void {
    this.touchTimerState();
    if (this.subRemaining > 0 && this.subCaption === label) {
      this.subRemaining = 0;
      this.subTime.classList.add("hidden");
      toggleClass(this.dashboardSubTimes, "hidden", true);
      setText(this.dashboardSubCaptions, "");
      toggleClass(this.dashboardSubCaptions, "count", false);
      this.caption.classList.remove("count");
      this.caption.textContent = "";
      return;
    }
    this.subRemaining = seconds;
    this.subCaption = label;
    this.subTime.classList.remove("hidden");
    toggleClass(this.dashboardSubTimes, "hidden", false);
    setText(this.dashboardSubCaptions, label);
    toggleClass(this.dashboardSubCaptions, "count", true);
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
      await this.enterFullscreen(true);
    } else {
      await this.leaveFullscreen();
    }
  }

  private async enterFullscreen(rotatePhone = false): Promise<void> {
    const shouldRotate = rotatePhone && isPhonePortrait();
    this.setCompact(true);
    if (!document.fullscreenElement) {
      try {
        await el("timer-shell").requestFullscreen?.();
      } catch {
        // Keep the timer in distraction-free view when native fullscreen is unavailable.
      }
    }
    if (shouldRotate) {
      try {
        await (screen.orientation as LockableScreenOrientation | undefined)?.lock?.("landscape");
      } catch {
        // Android browsers that deny orientation lock still keep the focused timer view.
        this.caption.textContent = "見やすくするには端末を横向きにしてください。";
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

class RefereeTimerController {
  private readonly shell = el<HTMLElement>("referee-shell");
  private readonly label = el<HTMLElement>("referee-label");
  private readonly time = el<HTMLOutputElement>("referee-time");
  private readonly progress = el<HTMLProgressElement>("referee-progress");
  private readonly fullscreenButton = el<HTMLButtonElement>("referee-fullscreen");
  private total = 10;
  private remaining = 10;
  private running = false;
  private lastFrame = performance.now();
  private activeLabel = "10カウント / 5カウントを選択";

  constructor() {
    el<HTMLButtonElement>("referee-ten").addEventListener("click", () => this.start(10, "コールドカウント"));
    el<HTMLButtonElement>("referee-five").addEventListener("click", () => this.start(5, "オーバーボール"));
    el<HTMLButtonElement>("referee-reset").addEventListener("click", () => this.reset());
    this.fullscreenButton.addEventListener("click", () => void this.toggleFullscreen());
    document.addEventListener("fullscreenchange", () => {
      const active = document.fullscreenElement === this.shell;
      this.setCompact(active);
    });
    this.render();
    requestAnimationFrame((now) => this.frame(now));
  }

  async leaveFullscreen(): Promise<void> {
    if (document.fullscreenElement === this.shell) {
      try {
        await document.exitFullscreen?.();
      } catch {
        // The in-page layout can still be restored.
      }
    }
    this.setCompact(false);
  }

  private start(seconds: 10 | 5, label: string): void {
    this.total = seconds;
    this.remaining = seconds;
    this.activeLabel = label;
    if (this.running) {
      this.running = false;
      this.render();
      return;
    }
    this.running = true;
    this.lastFrame = performance.now();
    this.render();
  }

  private reset(): void {
    this.total = 10;
    this.remaining = 10;
    this.running = false;
    this.activeLabel = "10カウント / 5カウントを選択";
    this.render();
  }

  private frame(now: number): void {
    const delta = Math.max(0, now - this.lastFrame) / 1000;
    this.lastFrame = now;
    if (this.running) {
      this.remaining = Math.max(0, this.remaining - delta);
      if (this.remaining <= 0) this.running = false;
      this.render();
    }
    requestAnimationFrame((next) => this.frame(next));
  }

  private render(): void {
    const whole = Math.ceil(this.remaining);
    this.label.textContent = this.remaining <= 0 && this.activeLabel !== "10カウント / 5カウントを選択" ? `${this.activeLabel} 終了` : this.activeLabel;
    this.time.textContent = String(whole).padStart(2, "0");
    this.progress.max = this.total;
    this.progress.value = this.remaining;
    this.progress.classList.toggle("warning", this.remaining <= 3 && this.remaining > 0);
    this.time.classList.toggle("warning", this.remaining <= 3 && this.remaining > 0);
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement === this.shell || document.body.classList.contains("referee-compact")) {
      await this.leaveFullscreen();
      return;
    }
    this.setCompact(true);
    try {
      await this.shell.requestFullscreen?.();
    } catch {
      // Keep the focused referee count view when native fullscreen is unavailable.
    }
  }

  private setCompact(active: boolean): void {
    document.body.classList.toggle("referee-compact", active);
    this.fullscreenButton.textContent = active ? "全画面解除" : "全画面表示";
  }
}

class BallController {
  private readonly court = el<HTMLElement>("court");
  private readonly dashboardCourts = els<HTMLElement>("dashboard-court");
  private workflowMatch = 0;
  private hyogo = false;
  private seriesOrangeSide: number[] | null = null;
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
    els<HTMLButtonElement>("dashboard-random").forEach((button) => button.addEventListener("click", () => this.randomize()));
    el<HTMLButtonElement>("balls-reset").addEventListener("click", () => this.reset());
    els<HTMLButtonElement>("dashboard-balls-reset").forEach((button) => button.addEventListener("click", () => this.reset()));
    el<HTMLButtonElement>("balls-ready").addEventListener("click", () => this.completeWorkflow());
    this.draw(this.defaults);
  }

  setHyogoMode(active: boolean): void {
    this.hyogo = active;
    if (!active) this.seriesOrangeSide = null;
  }

  beginWorkflow(match: number): void {
    this.workflowMatch = match;
    if (!this.hyogo || match === 1 || !this.seriesOrangeSide) this.seriesOrangeSide = null;
    this.randomize();
    el<HTMLButtonElement>("balls-ready").classList.remove("hidden");
  }

  private reset(): void {
    this.draw(this.defaults);
    el("balls-status").textContent = "ボール配置を初期位置に戻しました。";
    if (this.workflowMatch) el("balls-ready").classList.add("hidden");
  }

  randomize(): void {
    const side = this.hyogo && this.workflowMatch
      ? this.seriesOrangeSide ?? this.leftRows.map(() => Math.round(Math.random()))
      : this.leftRows.map(() => Math.round(Math.random()));
    if (this.hyogo && this.workflowMatch && !this.seriesOrangeSide) this.seriesOrangeSide = side;
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
    el("balls-status").textContent = this.hyogo && this.workflowMatch ? "ボール配置を生成しました。" : "ボール配置を生成しました。";
  }

  private draw(layout: BallLayout): void {
    [this.court, ...this.dashboardCourts].forEach((court) => {
      if (!court.children.length) layout.forEach(() => court.append(document.createElement("span")));
      layout.forEach(([color, x, y], index) => {
        const ball = court.children[index] as HTMLElement;
        ball.className = `ball ${color}`;
        ball.style.left = `${x}%`;
        ball.style.top = `${y}%`;
      });
    });
  }

  completeWorkflow(): void {
    if (!this.workflowMatch) return;
    const match = this.workflowMatch;
    this.workflowMatch = 0;
    el<HTMLButtonElement>("balls-ready").classList.add("hidden");
    this.ready(match);
  }

  resetWorkflow(): void {
    this.workflowMatch = 0;
    this.seriesOrangeSide = null;
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
    el<HTMLButtonElement>("completion-reset").addEventListener("click", () => this.returnHomeAfterCompletion());
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
    el<HTMLButtonElement>("history-series-export").addEventListener("click", () => this.exportSeriesHistory());
    el<HTMLButtonElement>("history-import").addEventListener("click", () => el<HTMLInputElement>("history-file").click());
    el<HTMLButtonElement>("history-sheet-import").addEventListener("click", () => void this.importHistoryFromSpreadsheet());
    el<HTMLButtonElement>("history-sheet-scan").addEventListener("click", () => void this.importHistoryFromSpreadsheetQr());
    el<HTMLInputElement>("history-file").addEventListener("change", (event) => void this.importHistory(event));
    el<HTMLButtonElement>("history-clear").addEventListener("click", () => this.confirmClearHistory());
    el<HTMLButtonElement>("history-retry-all").addEventListener("click", () => void this.retryPendingSends("manual"));
    el<HTMLButtonElement>("history-clear-confirm").addEventListener("click", () => this.clearHistory());
    window.addEventListener("online", () => void this.retryPendingSends("online"));
    this.resetSeries(false);
    this.renderHistory();
    if (navigator.onLine) window.setTimeout(() => void this.retryPendingSends("startup"), 1200);
  }

  syncSummary(): { pending: number; failed: number; unsent: number; configured: boolean; gasText: string; reason: string } {
    let pending = 0;
    let failed = 0;
    for (const record of this.records) {
      if (isSheetPreviewRecord(record) || record.recordKind !== "試合結果") continue;
      if (record.sendStatus === "pending") pending += 1;
      if (record.sendStatus === "failed") failed += 1;
    }
    const settings = AdminController.settings();
    const connectionVerified = Boolean(settings.gasConnectedAt && settings.gasConnectedUrl && settings.gasConnectedUrl === settings.gasUrl && settings.apiKey);
    const configured = settings.gasUrl.endsWith("/exec") && Boolean(settings.apiKey) && connectionVerified;
    const latestFailed = this.records.find((record) => !isSheetPreviewRecord(record) && record.recordKind === "試合結果" && record.sendStatus === "failed" && record.sendError);
    return {
      pending,
      failed,
      unsent: pending + failed,
      configured,
      gasText: configured ? "GAS接続: 確認済み" : "GAS接続: 未確認",
      reason: this.sendIssueReason(settings, latestFailed?.sendError),
    };
  }

  teamOptions(): string[] {
    return [...teams];
  }

  private sendIssueReason(settings: AdminSettings, latestError = ""): string {
    if (!settings.sendEnabled) return "送信OFF";
    if (!settings.gasUrl.endsWith("/exec")) return "GAS URL未設定";
    if (!settings.apiKey) return "APIキー未入力";
    if (!navigator.onLine) return "オフライン";
    if (/api|key|認証|unauthorized|forbidden|invalid/i.test(latestError)) return "APIキー確認";
    if (/failed to fetch|network|ネットワーク|fetch/i.test(latestError)) return "ネットワークエラー";
    if (/gas|script|spreadsheet|sheet/i.test(latestError)) return "GASエラー";
    return latestError ? "送信エラー" : "原因確認中";
  }

  currentMatchNumber(): number {
    return Math.min(this.editing || this.nextMatch(), 3);
  }

  currentSeriesLabel(): string {
    if (!this.series) return "対戦カード未選択";
    return `${this.series.teamA} vs ${this.series.teamB}`;
  }

  completionMessage(): string {
    if (!this.series) return "ただいまの試合結果を保存しました。";
    const sum = this.summary();
    const side = this.overallWinner(sum);
    const result = side === "draw" ? "引き分け" : `${side === "a" ? this.series.teamA : this.series.teamB}チームの勝利`;
    return `ただいまの試合結果は ${this.series.teamA} VS ${this.series.teamB} で ${result} となります。`;
  }

  completionMessageLines(): { lead: string; winner: string } {
    if (!this.series) return { lead: "ただいまの試合結果を保存しました。", winner: "" };
    const sum = this.summary();
    const side = this.overallWinner(sum);
    const score = `${sum.teamAWins} VS ${sum.teamBWins}`;
    if (side === "draw") return { lead: `ただいまの試合結果は ${score} で`, winner: "引き分け となります。" };
    return {
      lead: `ただいまの試合結果は ${score} で`,
      winner: `${side === "a" ? this.series.teamA : this.series.teamB}チームの勝利 となります。`,
    };
  }

  startSeriesForOperation(teamA: string, teamB: string, court: string): boolean {
    el<HTMLSelectElement>("team-a").value = teamA;
    el<HTMLSelectElement>("team-b").value = teamB;
    el<HTMLSelectElement>("court-select").value = court;
    this.startSeries();
    return Boolean(this.series);
  }

  continueForOperation(): void {
    this.continueToNextMatch();
  }

  resetForOperation(): void {
    this.completeSeriesReset();
  }

  returnHomeAfterCompletion(): void {
    this.clearCompletionResetTimer();
    this.completeSeriesReset();
    document.dispatchEvent(new CustomEvent("series-home-requested"));
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
    options(el<HTMLSelectElement>("court-select"), courtOptions, "Aコート");
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

  private inputMatchNumber(): number {
    return Math.min(this.editing || this.nextMatch(), 3);
  }

  private resultSidesSwapped(matchNumber = this.inputMatchNumber()): boolean {
    return matchNumber === 2;
  }

  private resultInputCounts(matchNumber = this.inputMatchNumber()): Pick<MatchRecord, "teamAOrange" | "teamAPurple" | "teamBOrange" | "teamBPurple"> {
    const leftOrange = Number(el<HTMLSelectElement>("a-orange").value);
    const leftPurple = Number(el<HTMLSelectElement>("a-purple").value);
    const rightOrange = Number(el<HTMLSelectElement>("b-orange").value);
    const rightPurple = Number(el<HTMLSelectElement>("b-purple").value);
    if (this.resultSidesSwapped(matchNumber)) {
      return { teamAOrange: rightOrange, teamAPurple: rightPurple, teamBOrange: leftOrange, teamBPurple: leftPurple };
    }
    return { teamAOrange: leftOrange, teamAPurple: leftPurple, teamBOrange: rightOrange, teamBPurple: rightPurple };
  }

  private scoreData(): Pick<MatchRecord, "teamAScore" | "teamBScore" | "winner" | "result" | "targetTeam"> {
    const teamA = this.series?.teamA ?? "チームA";
    const teamB = this.series?.teamB ?? "チームB";
    const category = el<HTMLSelectElement>("reason-category").value as Category;
    const violation = category !== scoringCategory;
    const targetTeam = el<HTMLSelectElement>("target-team").value;
    const counts = this.resultInputCounts();
    let teamAScore = counts.teamAOrange - counts.teamAPurple * 2;
    let teamBScore = counts.teamBOrange - counts.teamBPurple * 2;
    if (violation && targetTeam === teamA) [teamAScore, teamBScore] = [9, -4];
    if (violation && targetTeam === teamB) [teamAScore, teamBScore] = [-4, 9];
    const result = teamAScore < teamBScore ? "勝ち" : teamBScore < teamAScore ? "負け" : "引き分け";
    const winner = result === "勝ち" ? teamA : result === "負け" ? teamB : "引き分け";
    return { teamAScore, teamBScore, winner, result, targetTeam: violation ? targetTeam : winner };
  }

  private renderScores(): void {
    const score = this.scoreData();
    const swapped = this.resultSidesSwapped();
    const leftScore = swapped ? score.teamBScore : score.teamAScore;
    const rightScore = swapped ? score.teamAScore : score.teamBScore;
    el("a-score").textContent = `得点 ${leftScore}`;
    el("b-score").textContent = `得点 ${rightScore}`;
    el("winner-preview").textContent = `${leftScore} VS ${rightScore} / 勝者: ${score.winner}`;
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
      el("record-status").textContent = "オレンジボールの合計は、終了理由に関係なく8個または9個にしてください。";
      return null;
    }
    const purpleTotal = Number(el<HTMLSelectElement>("a-purple").value) + Number(el<HTMLSelectElement>("b-purple").value);
    if (purpleTotal !== 2) {
      el("record-status").textContent = "紫ボールの合計は、終了理由に関係なく必ず2個にしてください。";
      return null;
    }
    const matchNumber = this.inputMatchNumber();
    const counts = this.resultInputCounts(matchNumber);
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
      matchType: AdminController.settings().matchType,
      teamA: this.series.teamA,
      teamB: this.series.teamB,
      reasonCategory: category,
      endReason: el<HTMLSelectElement>("end-reason").value,
      ...counts,
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
    const violation = record.reasonCategory !== scoringCategory;
    const scoreLine = `${record.teamAScore} VS ${record.teamBScore}`;
    const violationNotice = violation
      ? `<p class="confirm-auto-score"><span>違反時の自動スコア</span><strong>${escapeText(record.targetTeam)} は自動敗北として 9点、相手チームは -4点で記録します。</strong></p>`
      : "";
    el("confirm-detail").innerHTML =
      `<p class="confirm-match">第${record.matchNumber}マッチ / ${escapeText(record.teamA)} vs ${escapeText(record.teamB)}</p>` +
      `<section class="confirm-judge-summary"><div class="confirm-judge-winner"><span>勝者</span><strong>${escapeText(record.winner)}</strong></div><div class="confirm-judge-score"><span>得点差</span><strong>${scoreLine}</strong></div><div class="${record.reasonCategory.includes("違反") ? "confirm-judge-reason warning" : "confirm-judge-reason"}"><span>終了理由</span><strong>${escapeText(record.endReason)}</strong></div></section>` +
      `<p class="confirm-reason"><span>終了カテゴリ</span><strong>${escapeText(record.reasonCategory)}</strong></p>` +
      violationNotice +
      `<div class="confirm-score-grid"><p><span>${escapeText(record.teamA)}</span><strong>${record.teamAScore}点</strong><small><b class="confirm-orange">オレンジ ${record.teamAOrange}個</b><b class="confirm-purple">紫 ${record.teamAPurple}個</b></small></p><p><span>${escapeText(record.teamB)}</span><strong>${record.teamBScore}点</strong><small><b class="confirm-orange">オレンジ ${record.teamBOrange}個</b><b class="confirm-purple">紫 ${record.teamBPurple}個</b></small></p></div>` +
      `<p class="confirm-winner"><span>勝者チーム</span><strong>${escapeText(record.winner)}</strong></p>`;
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
    const savedMatch = record.matchNumber;
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
    document.dispatchEvent(new CustomEvent("series-match-saved", { detail: { match: savedMatch, finished: this.isFinished() } }));
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
    const number = this.inputMatchNumber();
    const swapped = this.resultSidesSwapped(number);
    const leftTeam = swapped ? this.series.teamB : this.series.teamA;
    const rightTeam = swapped ? this.series.teamA : this.series.teamB;
    el("series-label").textContent = `対戦カード: ${this.series.teamA} vs ${this.series.teamB} / ${this.series.court} 第${this.series.seriesNumber}試合`;
    el("match-progress").textContent = `進行状況: 第${number}マッチ / 全3マッチ`;
    el("match-title").textContent = `第${number}マッチ リザルト入力`;
    el("match-teams").textContent = `${leftTeam} vs ${rightTeam}`;
    el("a-name").textContent = leftTeam;
    el("b-name").textContent = rightTeam;
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
    if (this.resultSidesSwapped(matchNumber)) {
      el<HTMLSelectElement>("a-orange").value = String(record.teamBOrange);
      el<HTMLSelectElement>("a-purple").value = String(record.teamBPurple);
      el<HTMLSelectElement>("b-orange").value = String(record.teamAOrange);
      el<HTMLSelectElement>("b-purple").value = String(record.teamAPurple);
    } else {
      el<HTMLSelectElement>("a-orange").value = String(record.teamAOrange);
      el<HTMLSelectElement>("a-purple").value = String(record.teamAPurple);
      el<HTMLSelectElement>("b-orange").value = String(record.teamBOrange);
      el<HTMLSelectElement>("b-purple").value = String(record.teamBPurple);
    }
    this.renderSeries();
    this.updateRecordVisibility();
    el("record-status").textContent = `保存すると第${matchNumber}マッチの結果を上書きします。`;
    el("record-input").scrollIntoView({ behavior: "smooth", block: "start" });
    document.dispatchEvent(new CustomEvent("series-match-edit", { detail: { match: matchNumber } }));
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
    el("record-input").classList.toggle("hidden", !hasSeries || this.awaitingNextMatch || this.finalized || (finished && !this.editing));
    el("intermediate-results").classList.toggle("hidden", !hasSeries || entries === 0 || finished);
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
    return "draw";
  }

  private drawDecisionNote(sum: Summary): string {
    if (!this.series) return "";
    if (sum.teamAViolations !== sum.teamBViolations) {
      const side = sum.teamAViolations < sum.teamBViolations ? this.series.teamA : this.series.teamB;
      return `決着が必要な場合の参考: 違反数が少ない ${side} が優先候補です。`;
    }
    if (sum.teamAScore !== sum.teamBScore) {
      const side = sum.teamAScore > sum.teamBScore ? this.series.teamA : this.series.teamB;
      return `決着が必要な場合の参考: 相手コートへ送り込んだボールの総スコアが高い ${side} が優先候補です。`;
    }
    return "決着が必要な場合の参考: 違反数・総スコアも同じため、追加マッチで確認してください。";
  }

  private finalSummaryHtml(sum: Summary, winner: "a" | "b" | "draw"): string {
    if (!this.series) return escapeText("3マッチ終了後、最終試合結果を確認できます。");
    const score = `${sum.teamAWins} VS ${sum.teamBWins}`;
    if (!this.isFinished()) {
      return `<span class="final-result-label">途中集計</span><strong class="final-result-score">${score}</strong><span class="final-result-note">引き分け ${sum.draws} / 3マッチ終了後に最終結果を確認できます。</span>`;
    }
    const result = winner === "draw" ? "引き分け" : `${winner === "a" ? this.series.teamA : this.series.teamB}チームの勝利`;
    const note = winner === "draw" ? `${this.drawDecisionNote(sum)} 誤入力の場合、各マッチは再入力できます。` : "誤入力の場合、各マッチは再入力できます。";
    return `<span class="final-result-label">最終試合結果</span><strong class="final-result-score">${score}</strong><span class="final-result-winner">で ${escapeText(result)}</span><span class="final-result-note">${escapeText(note)}</span>`;
  }

  private renderFinal(): void {
    const matches = el<HTMLTableElement>("final-matches");
    matches.innerHTML = "<thead><tr><th>マッチ</th><th>終了理由</th><th>チームA 橙/紫/得点</th><th>チームB 橙/紫/得点</th><th>勝敗結果</th><th></th></tr></thead>";
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
      row.innerHTML = `<td>第${record.matchNumber}マッチ</td><td>${escapeText(record.endReason)}</td><td>${record.teamAOrange} / ${record.teamAPurple} / ${record.teamAScore}</td><td>${record.teamBOrange} / ${record.teamBPurple} / ${record.teamBScore}</td><td>勝者: ${escapeText(record.winner)}</td><td><button class="button tiny">再入力</button></td>`;
      row.querySelector("button")?.addEventListener("click", () => this.editRecord(record.matchNumber));
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
    el("final-summary").innerHTML = this.finalSummaryHtml(sum, winner);
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
      matchType: AdminController.settings().matchType,
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
    this.setCompletionPanel(true);
    this.updateCompletionState(record.sendStatus ?? "pending", "送信状態を確認しています。");
    el("final-results").scrollIntoView({ behavior: "smooth", block: "start" });
    this.clearCompletionResetTimer();
    document.dispatchEvent(new CustomEvent("series-finalized", { detail: this.completionMessageLines() }));
    this.completionResetTimer = window.setTimeout(() => this.completeSeriesReset(), 120000);
    const sendStatus = await this.sendSeriesResult(record);
    this.setCompletionPanel(true);
    if (sendStatus === "sent") {
      el("completion-status").textContent = "この結果は保存済みで、スプレッドシートへ送信済みです。";
    }
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
    let usedFallback = false;
    let visible = this.records.filter((record) => {
      if (new Date(record.timestamp.replace(" ", "T")).getTime() < since) return false;
      if (team !== "すべてのチーム" && record.teamA !== team && record.teamB !== team) return false;
      if (kind === "match" && record.recordKind !== "マッチ") return false;
      if (kind === "series" && record.recordKind !== "試合結果") return false;
      if (result === "all") return true;
      const winner = record.overallWinner || record.winner;
      if (team === "すべてのチーム") return result === "draw" ? winner === "引き分け" : true;
      const judged = winner === team ? "win" : winner === "引き分け" ? "draw" : "loss";
      return judged === result;
    });
    if (el<HTMLSelectElement>("history-sort").value === "old") visible.reverse();
    if (!visible.length && this.records.length) {
      usedFallback = true;
      visible = [...this.records]
        .sort((a, b) => new Date(b.timestamp.replace(" ", "T")).getTime() - new Date(a.timestamp.replace(" ", "T")).getTime())
        .slice(0, 6);
    }
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
    const suffix = usedFallback ? " / フィルタ該当なしのため最新6件を表示" : "";
    el("history-status").textContent = `保存済み ${storedCount}件 / 確認用 ${previewCount}件 / 表示 ${visible.length}件${suffix}`;
    this.renderSyncAlert();
    this.renderStats();
  }

  private renderSyncAlert(): void {
    const pending: MatchRecord[] = [];
    const failed: MatchRecord[] = [];
    for (const record of this.records) {
      if (isSheetPreviewRecord(record) || record.recordKind !== "試合結果") continue;
      if (record.sendStatus === "pending") pending.push(record);
      if (record.sendStatus === "failed") failed.push(record);
    }
    const targets = [...pending, ...failed];
    const panel = el("sync-alert-panel");
    const list = el("sync-alert-list");
    panel.classList.toggle("hidden", !targets.length);
    if (!targets.length) {
      list.replaceChildren();
      return;
    }
    el("sync-alert-summary").textContent = `未送信 ${pending.length}件 / 送信失敗 ${failed.length}件。GAS設定と通信状態を確認して一斉再送信できます。`;
    el<HTMLButtonElement>("history-retry-all").disabled = this.retryingPendingSends;
    list.replaceChildren(...targets.map((record) => {
      const item = document.createElement("article");
      item.className = `sync-alert-item ${record.sendStatus ?? ""}`;
      item.innerHTML = `<strong>${record.sendStatus === "pending" ? "未送信" : "送信失敗"}</strong><span>${escapeText(record.teamA)} vs ${escapeText(record.teamB)}</span><small>${escapeText(record.timestamp)} / ${escapeText(record.court)} 第${record.seriesNumber}試合${record.sendError ? ` / ${escapeText(record.sendError)}` : ""}</small>`;
      const retry = document.createElement("button");
      retry.className = "button tiny sync-alert-retry";
      retry.textContent = "1件再送信";
      retry.addEventListener("click", () => void this.retrySend(record));
      item.append(retry);
      return item;
    }));
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
    if (period === "all") return 0;
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
        matchType: record.matchType === "公式試合" ? "公式試合" : "練習試合",
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

  private applyTeams(next: string[], persist = true, message?: string): void {
    teams = Array.from(new Set(next.map((team) => team.trim()).filter(Boolean)));
    if (teams.length < 2) {
      el("team-status").textContent = "チームは2件以上入力してください。";
      return;
    }
    if (persist) localStorage.setItem(this.teamStorageKey, JSON.stringify(teams));
    const currentA = el<HTMLSelectElement>("team-a").value;
    const currentB = el<HTMLSelectElement>("team-b").value;
    options(el<HTMLSelectElement>("team-a"), teams, teams.includes(currentA) ? currentA : teams[0]);
    options(el<HTMLSelectElement>("team-b"), teams, teams.includes(currentB) ? currentB : teams[1]);
    options(el<HTMLSelectElement>("stats-team"), ["チームを選択", ...teams]);
    options(el<HTMLSelectElement>("history-team"), ["すべてのチーム", ...teams]);
    el<HTMLTextAreaElement>("team-editor").value = teams.join("\n");
    el("team-status").textContent = message ?? (persist ? `${teams.length}チームをこの端末に保存しました。` : `${teams.length}チームを読み込みました。端末に残す場合は「チームリストを端末に保存」を押してください。`);
  }

  private saveTeams(): void {
    this.applyTeams(el<HTMLTextAreaElement>("team-editor").value.split(/\r?\n|,/));
  }

  private resetTeams(): void {
    localStorage.removeItem(this.teamStorageKey);
    teams = [...defaultTeams];
    this.applyTeams(teams);
  }

  private async importTeams(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const rows = parseCsv(await file.text());
    const header = rows[0]?.map((cell) => cell.trim()) ?? [];
    const nameIndex = header.indexOf("チーム名");
    const names = rows.slice(nameIndex >= 0 ? 1 : 0).map((row) => row[nameIndex >= 0 ? nameIndex : row.length - 1]);
    this.applyTeams(names, false);
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
      await this.importTeamsFromGas({ spreadsheetId });
    } catch {
      el("team-status").textContent = "チームリストを読み込めませんでした。GASのdoGet更新、URL、APIキー、共有設定を確認してください。";
    }
  }

  async importTeamsFromGasConnection(): Promise<TeamImportResult> {
    try {
      return await this.importTeamsFromGas({});
    } catch {
      const result = { status: "failed", message: "チームリストの読み込みに失敗しました。GASのdoGet更新、SPREADSHEET_ID、チームリストシートを確認してください。", count: 0 } satisfies TeamImportResult;
      el("team-status").textContent = result.message;
      return result;
    }
  }

  private async importTeamsFromGas(options: { spreadsheetId?: string }): Promise<TeamImportResult> {
    const settings = AdminController.settings();
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      throw new Error("GAS settings are missing.");
    }
    const params = new URLSearchParams({
      action: "teams",
      api_key: settings.apiKey,
      sheet: "チームリスト",
    });
    if (options.spreadsheetId) params.set("spreadsheet_id", options.spreadsheetId);
    const response = await fetch(`${settings.gasUrl}?${params.toString()}`);
    const data = await response.json() as { ok?: boolean; error?: string; teams?: string[]; row_count?: number; sheet_name?: string };
    if (!response.ok || data.ok === false) throw new Error(data.error || "failed");
    const nextTeams = (data.teams ?? []).map(String).filter(Boolean);
    if (nextTeams.length < 2) {
      const message = "チームリストに入力がないので初期チームリストを反映しました。スプレッドシートを確認してください。";
      this.applyTeams([...defaultTeams], false, message);
      return { status: "default", message, count: defaultTeams.length };
    }
    const message = `${data.sheet_name ?? "チームリスト"} から${nextTeams.length}チームを読み込みました。端末に残す場合は「チームリストを端末に保存」を押してください。`;
    this.applyTeams(nextTeams, false, message);
    return { status: "loaded", message, count: nextTeams.length };
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

  private exportSeriesHistory(): void {
    const seriesRecords = this.records.filter((record) => !isSheetPreviewRecord(record) && record.recordKind === "試合結果");
    if (!seriesRecords.length) {
      el("history-status").textContent = "出力できる試合結果がありません。";
      return;
    }
    const text = "\uFEFF" + [csvColumns.map(csvEscape).join(","), ...[...seriesRecords].reverse().map((record) => csvRow(record).map(csvEscape).join(","))].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    link.download = `tennis_assist_series_results_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    el("history-status").textContent = `試合結果 ${seriesRecords.length}件をCSVに保存しました。`;
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
      matchType: at(row, "種別") === "公式試合" ? "公式試合" : "練習試合",
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

  private confirmClearHistory(): void {
    const storedCount = this.records.filter((record) => !isSheetPreviewRecord(record)).length;
    if (!storedCount) {
      el("history-status").textContent = "削除できる端末保存履歴はありません。";
      return;
    }
    el("history-clear-detail").textContent =
      `スプレッドシートに送信できていない履歴は、本体履歴から削除すると復元できません。\n\n` +
      `この端末に保存された対戦履歴 ${storedCount}件 をすべて削除しますか？\n\n` +
      `確認用に読み込んだ履歴はページ更新で消えます。\n\n` +
      `本当に削除しますか？`;
    el<HTMLDialogElement>("history-clear-dialog").showModal();
  }

  private clearHistory(): void {
    this.records = this.records.filter(isSheetPreviewRecord);
    localStorage.setItem(this.storageKey, "[]");
    this.renderHistory();
    el("history-status").textContent = "この端末の対戦履歴をすべて削除しました。";
  }

  private updateSendStatus(record: MatchRecord, status: NonNullable<MatchRecord["sendStatus"]>, sendError = ""): void {
    record.sendStatus = status;
    record.sendError = sendError;
    const stored = this.records.find((item) => item.recordId === record.recordId);
    if (stored) {
      stored.sendStatus = status;
      stored.sendError = sendError;
    }
    this.saveStoredRecords();
    this.renderHistory();
  }

  private async retrySend(record: MatchRecord): Promise<void> {
    this.updateSendStatus(record, "pending");
    el("history-status").textContent = "未送信の試合結果を再送しています...";
    await this.sendSeriesResult(record);
  }

  async retryPendingSends(reason: "startup" | "online" | "manual"): Promise<void> {
    if (this.retryingPendingSends || !navigator.onLine) return;
    const settings = AdminController.settings();
    if (!settings.sendEnabled || !settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      if (reason === "manual") el("history-status").textContent = "GAS送信設定が未設定またはOFFです。管理者設定のGAS URL、APIキー、送信ONを確認してください。";
      return;
    }
    const pending = this.records.filter((record) => !isSheetPreviewRecord(record) && record.recordKind === "試合結果" && (record.sendStatus === "pending" || record.sendStatus === "failed"));
    if (!pending.length) return;
    this.retryingPendingSends = true;
    this.renderSyncAlert();
    el("history-status").textContent = reason === "online" ? `オンライン復帰を検知しました。未送信 ${pending.length}件を送信しています...` : reason === "manual" ? `未送信・送信失敗 ${pending.length}件を一斉再送信しています...` : `未送信 ${pending.length}件を確認しました。送信しています...`;
    try {
      for (const record of pending) {
        await this.sendSeriesResult(record);
      }
    } finally {
      this.retryingPendingSends = false;
      this.renderHistory();
      document.dispatchEvent(new CustomEvent("records-storage-updated"));
    }
  }

  private async sendSeriesResult(record: MatchRecord): Promise<NonNullable<MatchRecord["sendStatus"]>> {
    const settings = AdminController.settings();
    if (!settings.sendEnabled) {
      this.updateSendStatus(record, "local-only", "送信OFF");
      this.updateCompletionState("local-only", "スプレッドシート送信はOFFです。端末内に保存しました。");
      el("record-status").textContent = "試合結果を保存しました。スプレッドシート送信はOFFです。";
      return "local-only";
    }
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      const reason = !settings.gasUrl.endsWith("/exec") ? "GAS URL未設定" : "APIキー未入力";
      this.updateSendStatus(record, "failed", reason);
      this.updateCompletionState("failed", `${reason}です。`);
      el("record-status").textContent = `試合結果は保存しました。${reason}のため送信できません。履歴から再送してください。`;
      return "failed";
    }
    this.updateSendStatus(record, "pending");
    this.updateCompletionState("pending");
    const matches = this.records
      .filter((item) => !isSheetPreviewRecord(item) && item.seriesId === record.seriesId && item.recordKind === "マッチ")
      .sort((a, b) => a.matchNumber - b.matchNumber);
    const details = [...matches, record].map((item) => ({ record_id: item.recordId, csv_row: csvRow(item) }));
    const body = { api_key: settings.apiKey, event: "series_result", target_sheet: "試合結果", source: deviceSource(), sent_at: timestamp(), record_id: record.recordId, payload: record, csv_columns: [...csvColumns], csv_row: csvRow(record), detail_sheet: "対戦履歴", detail_rows: details };
    el("record-status").textContent = "試合結果を保存しました。スプレッドシートへ送信中...";
    try {
      const response = await fetch(settings.gasUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      await ensureGasSuccess(response);
      this.updateSendStatus(record, "sent");
      this.updateCompletionState("sent", "スプレッドシートへ送信できました。");
      el("record-status").textContent = "試合結果を保存し、スプレッドシートへ送信しました。";
      return "sent";
    } catch (error) {
      const reason = this.sendIssueReason(settings, error instanceof Error ? error.message : "");
      this.updateSendStatus(record, "failed", reason);
      this.updateCompletionState("failed", reason);
      el("record-status").textContent = `試合結果は保存しました。${reason}のため送信できません。履歴から再送できます。`;
      return "failed";
    }
  }

  private updateCompletionState(status: NonNullable<MatchRecord["sendStatus"]>, detail = ""): void {
    const panel = el("completion-panel");
    const badge = el("completion-badge");
    panel.classList.remove("sent", "pending", "failed", "local-only");
    panel.classList.add(status);
    const labels: Record<NonNullable<MatchRecord["sendStatus"]>, string> = {
      sent: "保存済み・送信済み",
      pending: "端末内に保存済み・送信待ち",
      failed: "端末内に保存済み・未送信",
      "local-only": "端末内に保存済み",
    };
    badge.textContent = labels[status];
    if (status === "failed") {
      el("completion-status").textContent = "この結果は端末内に保存済みですが、送信できていません。1度ホームへ戻って「対戦履歴」から再送信してください。";
    } else if (status === "pending") {
      el("completion-status").textContent = "この結果は端末内に保存済みです。送信待ちのため、必要に応じてホームへ戻って「対戦履歴」から再送信してください。";
    } else if (detail) {
      el("completion-status").textContent = `この結果は端末内に保存済みです。${detail}`;
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
    document.dispatchEvent(new CustomEvent("records-storage-updated"));
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
  private ruleMenuOpen = false;

  init(): void {
    el<HTMLInputElement>("rule-search").addEventListener("input", () => this.renderRules());
    el<HTMLButtonElement>("rule-menu-toggle").addEventListener("click", (event) => {
      event.stopPropagation();
      this.setRuleMenu(!this.ruleMenuOpen);
    });
    document.addEventListener("click", (event) => {
      const target = event.target as Node;
      if (this.ruleMenuOpen && !el("rule-nav").contains(target) && !el("rule-menu-toggle").contains(target)) this.setRuleMenu(false);
    });
    document.getElementById("news-filter")?.addEventListener("change", () => this.renderNews());
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
    el("app-version").textContent = `アプリバージョン v${__APP_VERSION__}`;
    const sections = [
      { title: "WRO 全国 国際ホームページ", links: [["WRO Japan", LINKS.wroJapan], ["WRO 国際", LINKS.wroInternational]] },
      { title: "WRO 公認予選会", links: [["WRO兵庫", LINKS.wroHyogo], ["WRO東京", LINKS.wroTokyo], ["WRO三重", LINKS.wroMie], ["WRO奈良", LINKS.wroNara]] },
      { title: "ルール関連", links: [["Japan決勝大会ルール", LINKS.japanFinalRule], ["世界大会ルール", LINKS.worldRules], ["Q&A", LINKS.officialQa], ["Google翻訳", LINKS.googleRules], ["DeepL翻訳", LINKS.deeplRules]] },
      { title: "その他", links: [["YouTube関連動画", LINKS.youtube], ...(secret ? [["旧テニスタイマー", LINKS.legacyTimer], ["旧 litlink", LINKS.legacyLitlink]] : [])] },
    ];
    const credits = `
      <article class="link-section credit-section">
        <h3>ライセンス / クレジット</h3>
        <p class="muted">本アプリでは、以下の素晴らしい素材を利用しています。公開してくださっている制作者の皆さまに心より感謝いたします。</p>
        <div class="credit-list">
          <div>
            <strong>DSEG（7セグメントフォント）</strong>
            <p>タイマー表示に使用しています。</p>
            <p><a target="_blank" rel="noopener" href="https://www.keshikan.net/fonts.html">公式サイト</a> / <a target="_blank" rel="noopener" href="https://github.com/keshikan/DSEG">GitHub</a></p>
          </div>
          <div>
            <strong>効果音ラボ（システム音声・効果音）</strong>
            <p>案内音声やシステム効果音の一部に使用しています。</p>
            <p><a target="_blank" rel="noopener" href="https://soundeffect-lab.info/">公式サイト</a></p>
          </div>
          <p>WRO、RoboSports、競技ルールに関する正式な情報は WRO 公式サイトを参照してください。</p>
          <p>開発支援: OpenAI ChatGPT / Codex</p>
        </div>
      </article>
    `;
    el("links-list").innerHTML = `${sections.map((section) => `<article class="link-section"><h3>${section.title}</h3><div class="link-grid">${section.links.map(([label, url]) => `<a class="button" target="_blank" rel="noopener" href="${url}">${label}</a>`).join("")}</div></article>`).join("")}${credits}`;
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
        this.setRuleMenu(false);
      });
      nav.append(button);
    });
    el("rule-menu-toggle").textContent = `ルール項目を選択: ${this.rules.find((section) => section.id === this.selectedRule)?.title ?? ""}`;
  }

  private setRuleMenu(open: boolean): void {
    this.ruleMenuOpen = open;
    el("screen-rules").classList.toggle("rule-menu-open", open);
    el<HTMLButtonElement>("rule-menu-toggle").setAttribute("aria-expanded", String(open));
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
    el("news-detail-content").innerHTML = linkifyText(item.content);
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
    el("qr-status").textContent = "QR読み取り機能を準備しています...";
    const { default: jsQR } = await import("jsqr");
    if (!dialog.open || !this.cameraStream) return;
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
  private static readonly timerSettingStorageKey = "tennis-assist-timer-setting-v1";
  private static readonly gateHash = "31749b1d44f155c116ce285a185146310ce0cd131f77cc1e4e1546d97feef275";
  private static readonly plainPasswords = new Set(["rsam", "gas", "wrorsam", "JUDGE", "judge", "HYOGO", "hyogo", "mie", "MIE", "mie_judge"]);
  private mode: AdminMode = "standard";
  private connectionVerified = false;
  private timerSettingLoaded = Boolean(AdminController.timerSetting());

  constructor(
    private readonly qrScanner: QrScanner,
    private readonly onConnected?: () => Promise<TeamImportResult>,
    private readonly onModeChanged?: (mode: AdminMode, settings: AdminSettings) => void,
    private readonly onTimerSettingChanged?: (setting: ExternalTimerSetting | null) => void,
    private readonly syncSummaryProvider?: () => { pending: number; failed: number; unsent: number; configured: boolean; gasText: string; reason: string },
  ) {
    el<HTMLButtonElement>("admin-unlock").addEventListener("click", () => void this.unlock());
    el<HTMLButtonElement>("admin-password-toggle").addEventListener("click", () => this.toggleSecretInput("admin-password", "admin-password-toggle"));
    el<HTMLButtonElement>("gas-save").addEventListener("click", () => this.save());
    el<HTMLButtonElement>("gas-test").addEventListener("click", () => void this.test());
    el<HTMLButtonElement>("admin-day-check").addEventListener("click", () => void this.dayCheck());
    el<HTMLButtonElement>("gas-team-load").addEventListener("click", () => void this.loadTeamList());
    el<HTMLButtonElement>("gas-key-toggle").addEventListener("click", () => this.toggleSecretInput("gas-key", "gas-key-toggle"));
    el<HTMLButtonElement>("admin-open-sheet").addEventListener("click", () => this.openManagedSpreadsheet());
    el<HTMLInputElement>("gas-key").addEventListener("input", () => {
      this.clearStoredConnection();
      this.clearConnectionSummary();
      this.updateConnectionCard();
    });
    el<HTMLInputElement>("gas-url").addEventListener("input", () => {
      el<HTMLInputElement>("gas-url").dataset.autoGasUrl = "false";
      this.clearStoredConnection();
      this.clearConnectionSummary();
      this.updateConnectionCard();
    });
    el<HTMLButtonElement>("timer-setting-load").addEventListener("click", () => void this.loadTimerSetting());
    el<HTMLButtonElement>("timer-setting-apply").addEventListener("click", () => this.applyManualTimerSetting());
    el<HTMLButtonElement>("timer-setting-clear").addEventListener("click", () => this.clearTimerSetting());
    el<HTMLSelectElement>("timer-setting-mode").addEventListener("change", () => this.updateTimerSettingModeFields());
    el<HTMLButtonElement>("gas-scan").addEventListener("click", () => void this.openScanner());
    el<HTMLSelectElement>("venue-color").addEventListener("change", () => this.applyColor());
    el<HTMLSelectElement>("match-type").addEventListener("change", () => this.save());
    this.populate();
  }

  private static variant(): AppVariantConfig {
    return currentAppVariant();
  }

  private static normalizeAccentMode(value: unknown, allowLight = this.variant().allowLightUi): AdminSettings["accentMode"] {
    if (value === "admin") return "admin";
    if (value === "light" && allowLight) return "light";
    return "standard";
  }

  static settings(): AdminSettings {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.storageKey) ?? "{}") as Partial<AdminSettings>;
      const accentMode = this.normalizeAccentMode(parsed.accentMode);
      const matchType = parsed.matchType === "公式試合" ? "公式試合" : "練習試合";
      return {
        gasUrl: parsed.gasUrl ?? "",
        apiKey: parsed.apiKey ?? "",
        sendEnabled: parsed.sendEnabled !== false,
        accentMode,
        matchType,
        gasConnectedAt: parsed.gasConnectedAt,
        gasConnectedUrl: parsed.gasConnectedUrl,
        dayCheckAt: parsed.dayCheckAt,
      };
    } catch {
      return { gasUrl: "", apiKey: "", sendEnabled: true, accentMode: "standard", matchType: "練習試合" };
    }
  }

  static timerSetting(): ExternalTimerSetting | null {
    try {
      const raw = localStorage.getItem(this.timerSettingStorageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      const source = ((parsed as { source?: unknown }).source === "manual" ? "manual" : (parsed as { source?: unknown }).source === "default" ? "default" : "sheet") satisfies TimerSettingSource;
      return normalizeExternalTimerSetting(parsed, source);
    } catch {
      return null;
    }
  }

  private populate(): void {
    const settings = AdminController.settings();
    const gasUrlInput = el<HTMLInputElement>("gas-url");
    gasUrlInput.value = settings.gasUrl;
    gasUrlInput.dataset.autoGasUrl = !settings.gasUrl || managedGasUrls.has(settings.gasUrl) ? "true" : "false";
    el<HTMLDetailsElement>("admin-advanced-details").open = false;
    el<HTMLDetailsElement>("admin-connection-card").open = false;
    el<HTMLDetailsElement>("gas-url-details").open = false;
    el<HTMLDetailsElement>("timer-setting-details").open = false;
    el("admin-login-context").textContent = "";
    el<HTMLInputElement>("gas-key").value = settings.apiKey;
    el<HTMLInputElement>("gas-enabled").checked = settings.sendEnabled !== false;
    const colorSelect = el<HTMLSelectElement>("venue-color");
    colorSelect.value = Array.from(colorSelect.options).some((option) => option.value === settings.accentMode) ? settings.accentMode : "standard";
    el<HTMLSelectElement>("match-type").value = settings.matchType;
    this.connectionVerified = this.storedConnectionValid(settings);
    this.populateTimerSetting(this.effectiveTimerSetting());
    this.updateConnectionCard();
  }

  private storedConnectionValid(settings = AdminController.settings()): boolean {
    return Boolean(settings.gasConnectedAt && settings.gasConnectedUrl && settings.gasConnectedUrl === settings.gasUrl && settings.apiKey);
  }

  private saveConnectionVerified(): void {
    const settings = AdminController.settings();
    settings.gasConnectedAt = timestamp();
    settings.gasConnectedUrl = settings.gasUrl;
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    this.connectionVerified = true;
    document.dispatchEvent(new CustomEvent("admin-settings-updated"));
  }

  private clearStoredConnection(): void {
    const settings = AdminController.settings();
    settings.gasConnectedAt = "";
    settings.gasConnectedUrl = "";
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    this.connectionVerified = false;
    document.dispatchEvent(new CustomEvent("admin-settings-updated"));
  }

  private defaultTimerSettingForMode(): ExternalTimerSetting | null {
    if (this.mode === "mie") {
      return { mode: "fixed", minSeconds: 120, maxSeconds: 120, stepSeconds: 1, fixedSeconds: 120, source: "default", loadedAt: timestamp() };
    }
    if (this.mode === "hyogo") {
      return { mode: "random", minSeconds: 90, maxSeconds: 120, stepSeconds: 5, fixedSeconds: 120, source: "default", loadedAt: timestamp() };
    }
    return null;
  }

  private effectiveTimerSetting(): ExternalTimerSetting | null {
    return AdminController.timerSetting() ?? this.defaultTimerSettingForMode();
  }

  private applyEffectiveTimerSetting(): void {
    const setting = this.effectiveTimerSetting();
    this.populateTimerSetting(setting);
    this.onTimerSettingChanged?.(setting);
  }

  private updateColorOptions(): void {
    const colorSelect = el<HTMLSelectElement>("venue-color");
    const lightOption = Array.from(colorSelect.options).find((option) => option.value === "light");
    if (!lightOption) return;
    const allowLight = AdminController.variant().allowLightUi && this.mode === "rsam";
    lightOption.hidden = !allowLight;
    lightOption.disabled = !allowLight;
    if (!allowLight && colorSelect.value === "light") colorSelect.value = "standard";
  }

  private async unlock(): Promise<void> {
    const password = el<HTMLInputElement>("admin-password").value;
    const encoded = new TextEncoder().encode(password);
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
    const digest = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (digest !== AdminController.gateHash && !AdminController.plainPasswords.has(password)) {
      el("gas-status").textContent = "パスワードを確認してください。";
      return;
    }
    this.mode =
      password === "HYOGO" || password === "hyogo" ? "hyogo" :
        password === "mie" || password === "MIE" || password === "mie_judge" ? "mie" :
          password === "rsam" ? "rsam" :
            "standard";
    el("admin-login-context").textContent = `${this.adminContextLabel(password)}で管理画面にログインしています。APIキーを入力してください。`;
    el("admin-settings").classList.remove("hidden");
    el("admin-gate").classList.add("hidden");
    el("venue-color-setting").classList.remove("hidden");
    el<HTMLDetailsElement>("venue-color-setting").open = false;
    el<HTMLDetailsElement>("timer-setting-details").open = false;
    this.updateColorOptions();
    const managedUrlApplied = this.applyManagedGasUrl(password);
    this.onModeChanged?.(this.mode, AdminController.settings());
    this.applyEffectiveTimerSetting();
    this.updateConnectionCard();
    if (!managedUrlApplied) el("gas-status").textContent = "管理者設定を表示しました。APIキーを入力してください。";
  }

  private applyManagedGasUrl(password: string): boolean {
    const config = managedGasUrlsByPassword.get(password);
    if (!config) return false;
    const gasUrl = config.url;
    const gasUrlInput = el<HTMLInputElement>("gas-url");
    const current = gasUrlInput.value.trim();
    const isAutoManaged = gasUrlInput.dataset.autoGasUrl !== "false" || !current || managedGasUrls.has(current);
    if (!isAutoManaged) {
      el("gas-status").textContent = "手動指定のGAS URLを保持しています。";
      return true;
    }
    gasUrlInput.value = gasUrl;
    gasUrlInput.dataset.autoGasUrl = "true";
    el<HTMLDetailsElement>("gas-url-details").open = false;
    const settings = AdminController.settings();
    settings.gasUrl = gasUrl;
    settings.gasConnectedAt = "";
    settings.gasConnectedUrl = "";
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    el("gas-status").textContent = `${config.label}用GAS Web アプリ URLを自動入力しました。APIキーを入力してください。URLを手動で変更する場合は「GAS Web アプリ URL」を開いてください。`;
    this.updateConnectionCard();
    return true;
  }

  private save(): void {
    const settings: AdminSettings = {
      gasUrl: el<HTMLInputElement>("gas-url").value.trim(),
      apiKey: el<HTMLInputElement>("gas-key").value,
      sendEnabled: el<HTMLInputElement>("gas-enabled").checked,
      accentMode: AdminController.normalizeAccentMode(el<HTMLSelectElement>("venue-color").value, this.mode === "rsam" && AdminController.variant().allowLightUi),
      matchType: el<HTMLSelectElement>("match-type").value === "公式試合" ? "公式試合" : "練習試合",
      gasConnectedAt: AdminController.settings().gasConnectedAt,
      gasConnectedUrl: AdminController.settings().gasConnectedUrl,
      dayCheckAt: AdminController.settings().dayCheckAt,
    };
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    this.onModeChanged?.(this.mode, settings);
    document.dispatchEvent(new CustomEvent("admin-settings-updated"));
    this.updateConnectionCard();
    el("gas-status").textContent = "この端末に設定を保存しました。";
  }

  private applyColor(): void {
    const settings = AdminController.settings();
    settings.accentMode = AdminController.normalizeAccentMode(el<HTMLSelectElement>("venue-color").value, this.mode === "rsam" && AdminController.variant().allowLightUi);
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    this.onModeChanged?.(this.mode, settings);
    document.dispatchEvent(new CustomEvent("admin-settings-updated"));
  }

  private populateTimerSetting(setting: ExternalTimerSetting | null): void {
    const current = setting ?? defaultExternalTimerSetting("default");
    el<HTMLSelectElement>("timer-setting-mode").value = current.mode;
    this.writeDurationFields("timer-setting-min", current.minSeconds);
    this.writeDurationFields("timer-setting-max", current.maxSeconds);
    el<HTMLInputElement>("timer-setting-step").value = String(current.stepSeconds);
    this.writeDurationFields("timer-setting-fixed", current.fixedSeconds);
    this.updateTimerSettingModeFields();
    el("timer-setting-status").textContent = setting ? externalTimerSettingText(setting) : "外部タイマー設定は未適用です。通常のタイマー設定を使用します。";
    this.updateTimerSettingSummary(current, Boolean(setting));
  }

  private updateTimerSettingModeFields(): void {
    const fixed = el<HTMLSelectElement>("timer-setting-mode").value === "fixed";
    document.querySelectorAll<HTMLElement>(".timer-setting-random-field").forEach((field) => {
      field.classList.toggle("hidden", fixed);
      field.toggleAttribute("hidden", fixed);
    });
    const fixedField = el<HTMLElement>("timer-setting-fixed-field");
    fixedField.classList.toggle("hidden", !fixed);
    fixedField.toggleAttribute("hidden", !fixed);
  }

  private writeDurationFields(prefix: string, seconds: number): void {
    const safeSeconds = Math.max(1, Math.floor(seconds));
    el<HTMLInputElement>(`${prefix}-minute`).value = String(Math.floor(safeSeconds / 60));
    el<HTMLInputElement>(`${prefix}-second`).value = String(safeSeconds % 60);
  }

  private readDurationFields(prefix: string): number {
    const minutes = Math.max(0, Math.floor(Number(el<HTMLInputElement>(`${prefix}-minute`).value) || 0));
    const seconds = Math.max(0, Math.min(59, Math.floor(Number(el<HTMLInputElement>(`${prefix}-second`).value) || 0)));
    return Math.max(1, minutes * 60 + seconds);
  }

  private saveTimerSetting(setting: ExternalTimerSetting): void {
    localStorage.setItem(AdminController.timerSettingStorageKey, JSON.stringify(setting));
    this.populateTimerSetting(setting);
    this.onTimerSettingChanged?.(setting);
    this.timerSettingLoaded = true;
    this.updateConnectionCard();
  }

  private async loadTimerSetting(): Promise<void> {
    this.save();
    const settings = AdminController.settings();
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      el("timer-setting-status").textContent = "GAS Web アプリ URL（/exec）と API キーを入力してください。";
      this.updateConnectionCard();
      return;
    }
    el("timer-setting-status").textContent = "スプレッドシートのタイマー設定を読み込んでいます...";
    const result = await this.loadTimerSettingFromGas(settings);
    el("timer-setting-status").textContent = result.message;
    this.timerSettingLoaded = result.status === "loaded" || result.status === "cached";
    this.updateConnectionCard();
  }

  private async loadTimerSettingFromGas(settings: AdminSettings): Promise<TimerSettingLoadResult> {
    const cached = AdminController.timerSetting();
    try {
      const url = new URL(settings.gasUrl);
      url.searchParams.set("action", "timer_setting");
      url.searchParams.set("api_key", settings.apiKey);
      const response = await fetch(url);
      const data = await response.json() as GasResponse & { timer_setting?: unknown };
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || "timer_setting_failed");
      const setting = normalizeExternalTimerSetting(data.timer_setting, "sheet");
      this.saveTimerSetting(setting);
      return { status: "loaded", message: externalTimerSettingText(setting) };
    } catch {
      if (cached) {
        this.onTimerSettingChanged?.(cached);
        this.populateTimerSetting(cached);
        return { status: "cached", message: `スプレッドシート設定を読み込めませんでした。端末に保存済みの設定を使用しています。${externalTimerSettingText(cached, "")}` };
      }
      const fallback = this.defaultTimerSettingForMode();
      if (fallback) {
        this.populateTimerSetting(fallback);
        this.onTimerSettingChanged?.(fallback);
        return { status: "failed", message: `タイマー設定の読み込みに失敗しました。${externalTimerSettingText(fallback, "管理パスワードのデフォルト設定を適用しています。")}` };
      }
      this.onTimerSettingChanged?.(null);
      return { status: "failed", message: "タイマー設定の読み込みに失敗しました。通常のタイマー設定を使用します。" };
    }
  }

  private applyManualTimerSetting(): void {
    const raw = {
      mode: el<HTMLSelectElement>("timer-setting-mode").value,
      minSeconds: this.readDurationFields("timer-setting-min"),
      maxSeconds: this.readDurationFields("timer-setting-max"),
      stepSeconds: el<HTMLInputElement>("timer-setting-step").value,
      fixedSeconds: this.readDurationFields("timer-setting-fixed"),
      loadedAt: timestamp(),
    };
    const setting = normalizeExternalTimerSetting(raw, "manual");
    this.saveTimerSetting(setting);
    el("timer-setting-status").textContent = externalTimerSettingText(setting, "手動タイマー設定を適用しています。");
  }

  private clearTimerSetting(): void {
    localStorage.removeItem(AdminController.timerSettingStorageKey);
    this.timerSettingLoaded = false;
    const fallback = this.defaultTimerSettingForMode();
    this.populateTimerSetting(fallback);
    this.onTimerSettingChanged?.(fallback);
    el("timer-setting-status").textContent = fallback
      ? externalTimerSettingText(fallback, "管理パスワードのデフォルト設定を適用しています。")
      : "外部タイマー設定は未適用です。通常のタイマー設定を使用します。";
    this.updateConnectionCard();
  }

  lock(): void {
    this.mode = "standard";
    el<HTMLInputElement>("admin-password").value = "";
    el("admin-login-context").textContent = "";
    el("admin-settings").classList.add("hidden");
    el("admin-gate").classList.remove("hidden");
    el("venue-color-setting").classList.add("hidden");
    el<HTMLDetailsElement>("admin-advanced-details").open = false;
    el<HTMLDetailsElement>("admin-connection-card").open = false;
    el<HTMLDetailsElement>("gas-url-details").open = false;
    el<HTMLDetailsElement>("venue-color-setting").open = false;
    el<HTMLDetailsElement>("timer-setting-details").open = false;
    this.updateColorOptions();
    this.connectionVerified = false;
    this.timerSettingLoaded = Boolean(AdminController.timerSetting());
    this.updateConnectionCard();
    el("gas-status").textContent = "";
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
    el<HTMLInputElement>("gas-url").dataset.autoGasUrl = "false";
    this.connectionVerified = false;
    this.updateConnectionCard();
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
      this.connectionVerified = false;
      this.clearConnectionSummary();
      this.updateConnectionCard();
      return;
    }
    el("gas-status").textContent = "接続確認と設定読み込みを実行しています...";
    try {
      const body = { api_key: settings.apiKey, event: "connection_test", target_sheet: "送信テスト", source: deviceSource(), sent_at: timestamp(), payload: { message: "Web app connection test" } };
      const response = await fetch(settings.gasUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
      await ensureGasSuccess(response);
      this.saveConnectionVerified();
      this.updateConnectionCard();
      this.setSummaryChip("admin-summary-test", "OK", "ok");
      el("gas-status").textContent = "接続確認を完了しました。チームリストを読み込んでいます...";
      if (this.onConnected) {
        const loaded = await this.onConnected();
        this.setSummaryChip("admin-summary-team", this.teamImportSummaryLabel(loaded), loaded.status === "loaded" ? "ok" : loaded.status === "default" ? "warn" : "danger");
      } else {
        this.setSummaryChip("admin-summary-team", "チーム未確認", "warn");
      }
      el("gas-status").textContent = "タイマー設定を読み込んでいます...";
      const timerResult = await this.loadTimerSettingFromGas(settings);
      el("timer-setting-status").textContent = timerResult.message;
      this.timerSettingLoaded = timerResult.status === "loaded" || timerResult.status === "cached";
      this.updateConnectionCard();
      this.setSummaryChip("admin-summary-timer", this.timerSettingSummary(AdminController.timerSetting() ?? this.effectiveTimerSetting()), timerResult.status === "failed" ? "danger" : timerResult.status === "cached" ? "warn" : "ok");
      el("admin-success-summary").classList.remove("hidden");
      el("gas-status").textContent = "";
    } catch (error) {
      this.connectionVerified = false;
      this.clearConnectionSummary();
      this.updateConnectionCard();
      el("gas-status").textContent = this.gasConnectionErrorMessage(error);
    }
  }

  private gasConnectionErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error || "");
    if (message.includes("invalid_api_key")) {
      return "接続・設定読込に失敗しました。APIキーが一致していません。GAS側の API_KEY / API_KEY1 / API_KEY2 など、API_KEYで始まるプロパティの値を確認してください。";
    }
    if (message.includes("API_KEY is missing")) {
      return "接続・設定読込に失敗しました。GAS側に API_KEY で始まるスクリプトプロパティが設定されていません。";
    }
    if (message.includes("SPREADSHEET_ID is missing")) {
      return "接続・設定読込に失敗しました。GAS側の SPREADSHEET_ID が未設定です。";
    }
    if (message.includes("Failed to fetch")) {
      return "接続・設定読込に失敗しました。ネットワーク、GAS Web アプリ URL、公開設定を確認してください。";
    }
    return `接続・設定読込に失敗しました。試合記録は同期できていません。チームリストとタイマー設定の読み込みは実行していません。${message || "URL と公開設定を確認してください。"}`;
  }

  private async loadTeamList(): Promise<void> {
    const settings = AdminController.settings();
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      el("gas-status").textContent = "GAS Web アプリ URL（/exec）と API キーを入力してください。試合記録の同期は実行していません。";
      return;
    }
    if (!this.onConnected) {
      el("gas-status").textContent = "チームリスト読み込み機能を初期化できていません。試合記録の同期は実行していません。";
      return;
    }
    el("gas-status").textContent = "チームリストを読み込んでいます...";
    const result = await this.onConnected();
    el("gas-status").textContent = this.teamImportGasStatusMessage("チームリスト読み込みを実行しました。試合記録の同期は実行していません。", result);
  }

  private teamImportGasStatusMessage(prefix: string, result: TeamImportResult): string {
    if (result.status === "loaded") return `${prefix} チームリストも読み込みました。${result.count}チームを反映しています。`;
    if (result.status === "default") return `${prefix} ${result.message}`;
    return `${prefix} ${result.message}`;
  }

  private teamImportSummaryLabel(result: TeamImportResult): string {
    if (result.status === "loaded") return `チーム ${result.count}件`;
    if (result.status === "default") return "初期リスト";
    return "チーム失敗";
  }

  private async dayCheck(): Promise<void> {
    el("gas-status").textContent = "当日チェックを実行しています...";
    await this.test();
    const sync = this.syncSummaryProvider?.();
    if (!sync) return;
    const settings = AdminController.settings();
    settings.dayCheckAt = timestamp();
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    const syncText = sync.unsent ? `未送信 ${sync.unsent}件` : "未送信 0件";
    const syncState = sync.unsent ? "warn" : "ok";
    this.setSummaryChip("admin-summary-test", this.connectionVerified ? "OK" : "接続失敗", this.connectionVerified ? "ok" : "danger");
    this.setStatusChip("admin-status-unsent", syncText, syncState);
    el("admin-success-summary").classList.remove("hidden");
    el("gas-status").textContent = this.connectionVerified && !sync.unsent ? "運用準備OKです。" : "確認が必要な項目があります。";
    this.updateConnectionCard();
  }

  private setSummaryChip(id: string, text: string, state: "ok" | "warn" | "danger" | "pending"): void {
    const chip = el(id);
    chip.textContent = text;
    chip.classList.remove("ok", "warn", "danger", "pending");
    chip.classList.add(state);
  }

  private adminContextLabel(password: string): string {
    return managedGasUrlsByPassword.get(password)?.label ?? "標準の管理設定";
  }

  private updateConnectionCard(): void {
    const gasUrlInput = el<HTMLInputElement>("gas-url");
    const apiKey = el<HTMLInputElement>("gas-key").value.trim();
    const gasUrl = gasUrlInput.value.trim();
    const urlAuto = Boolean(gasUrl) && gasUrlInput.dataset.autoGasUrl !== "false";
    const managedConfig = this.activeManagedConfig(gasUrl);
    const sheetButton = el<HTMLButtonElement>("admin-open-sheet");
    const sync = this.syncSummaryProvider?.();
    el("admin-status-target").textContent = `接続先: ${this.connectionTargetLabel(gasUrl)}`;
    this.setStatusChip("admin-status-api", apiKey ? "APIキー入力済み" : "APIキー未入力", apiKey ? "ok" : "warn");
    this.setStatusChip("admin-status-url", urlAuto ? "URL自動設定済み" : gasUrl ? "URL手動設定済み" : "URL未設定", gasUrl ? "ok" : "warn");
    const settings = AdminController.settings();
    this.connectionVerified = this.connectionVerified || this.storedConnectionValid(settings);
    this.setStatusChip("admin-status-connection", this.connectionVerified ? "GAS接続 OK" : "GAS未接続", this.connectionVerified ? "ok" : "warn");
    this.setStatusChip("admin-status-timer", this.timerSettingLoaded ? "タイマー設定読込済み" : "タイマー設定未読込", this.timerSettingLoaded ? "ok" : "pending");
    this.setStatusChip("admin-status-check-time", settings.dayCheckAt ? `最終チェック ${this.shortDateTime(settings.dayCheckAt)}` : "最終チェック 未チェック", settings.dayCheckAt ? "ok" : "pending");
    if (sync) this.setStatusChip("admin-status-unsent", sync.unsent ? `未送信 ${sync.unsent}件` : "未送信 0件", sync.unsent ? "warn" : "ok");
    el("admin-status-message").textContent = this.connectionCardMessage(Boolean(apiKey), Boolean(gasUrl));
    sheetButton.classList.toggle("hidden", !managedConfig);
    sheetButton.textContent = managedConfig ? `${managedConfig.label} スプレッドシートを開く` : "対応スプレッドシートを開く";
    sheetButton.disabled = !managedConfig;
  }

  private setStatusChip(id: string, text: string, state: "ok" | "warn" | "pending"): void {
    const chip = el(id);
    chip.textContent = text;
    chip.classList.remove("ok", "warn", "pending");
    chip.classList.add(state);
  }

  private shortDateTime(value: string): string {
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2})/);
    return parts ? `${parts[2]}/${parts[3]} ${parts[4]}` : value;
  }

  private connectionCardMessage(hasApiKey: boolean, hasGasUrl: boolean): string {
    if (!hasApiKey) return "APIキーを入力してください。";
    if (!hasGasUrl) return "GAS Web アプリ URLを確認してください。通常は管理者パスワードに合わせて自動入力されます。";
    if (!this.connectionVerified) return "接続・設定読込ボタンを押してください。";
    if (!this.timerSettingLoaded) return "接続は確認済みです。必要に応じてタイマー設定を読み込んでください。";
    return "接続確認と設定読み込みが完了しています。";
  }

  private connectionTargetLabel(gasUrl: string): string {
    if (!gasUrl) return "未設定";
    return this.activeManagedConfig(gasUrl)?.label ?? "手動指定";
  }

  private activeManagedConfig(gasUrl = el<HTMLInputElement>("gas-url").value.trim()): ManagedGasConfig | null {
    if (!gasUrl) return null;
    return Array.from(managedGasUrlsByPassword.values()).find((config) => config.url === gasUrl) ?? null;
  }

  private openManagedSpreadsheet(): void {
    const config = this.activeManagedConfig();
    if (!config) {
      el("gas-status").textContent = "対応するスプレッドシートURLがありません。GAS Web アプリ URLを確認してください。";
      return;
    }
    window.open(config.spreadsheetUrl, "_blank", "noopener");
  }

  private clearConnectionSummary(): void {
    el("admin-success-summary").classList.add("hidden");
    this.setSummaryChip("admin-summary-test", "未確認", "pending");
    this.setSummaryChip("admin-summary-team", "チーム未読込", "pending");
    this.setSummaryChip("admin-summary-timer", "未読込", "pending");
    this.setStatusChip("admin-status-unsent", "未送信 --", "pending");
  }

  private timerSettingSummary(setting: ExternalTimerSetting | null): string {
    if (!setting) return "通常設定";
    if (setting.mode === "fixed") return `${formatClock(setting.fixedSeconds)}固定`;
    return `${formatClock(setting.minSeconds)}-${formatClock(setting.maxSeconds)} / ${setting.stepSeconds}秒間隔`;
  }

  private updateTimerSettingSummary(setting: ExternalTimerSetting | null, applied: boolean): void {
    el("timer-setting-summary").textContent = applied || setting ? `タイマー設定: ${this.timerSettingSummary(setting)}` : "タイマー設定";
  }

  private toggleSecretInput(inputId: string, buttonId: string): void {
    const input = el<HTMLInputElement>(inputId);
    const button = el<HTMLButtonElement>(buttonId);
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    const nextVisible = !visible;
    const labelBase = inputId === "admin-password" ? "管理者パスワード" : "APIキー";
    button.classList.toggle("secret-visible", nextVisible);
    button.setAttribute("aria-label", nextVisible ? `${labelBase}を隠す` : `${labelBase}を表示`);
    button.title = nextVisible ? `${labelBase}を隠す` : `${labelBase}を表示`;
  }
}

class Application {
  private linksClicks = 0;
  private rulesClicks = 0;
  private secret = false;
  private hyogo = false;
  private readonly variant = currentAppVariant();
  private readonly timer: TimerController;
  private readonly refereeTimer: RefereeTimerController;
  private readonly balls: BallController;
  private readonly records: RecordsController;
  private readonly content = new ContentController();
  private readonly qrScanner = new QrScanner();
  private recordTimerPending = false;
  private admin: AdminController | null = null;
  private ballsFullscreen = false;
  private fullscreenReturnScreen: Screen | null = null;
  private mobileMenuOpen = false;
  private operationActive = false;
  private operationMatch = 1;
  private operationHomeTimer = 0;
  private operationHomeCountdownTimer = 0;
  private operationTimerFinishDelay = 0;
  private homeSyncNotice = "";
  private homeSyncState: "idle" | "running" | "success" | "warning" = "idle";
  private homeSyncAlertMarkup = "";
  private operationStep: "home" | "team" | "draw" | "between" | "finished" = "home";
  private backConfirmButton: HTMLButtonElement | null = null;
  private backConfirmTimer = 0;

  constructor() {
    syncViewportMetrics();
    window.addEventListener("resize", scheduleViewportMetricsSync, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleViewportMetricsSync, { passive: true });
    this.timer = new TimerController(
      (naturalEnd) => this.handleTimerFinished(Boolean(naturalEnd)),
      () => this.show("timer"),
      () => this.restoreFullscreenReturn("timer"),
    );
    this.timer.setExternalTimerSetting(AdminController.timerSetting());
    this.refereeTimer = new RefereeTimerController();
    this.balls = new BallController((match) => {
      this.setFlow(match, "タイマー待機中");
      this.recordTimerPending = true;
      this.timer.prepare();
      this.show("timer");
    });
    this.records = new RecordsController((event, match) => this.handleFlow(event, match), this.qrScanner);
    this.timer.setPracticeTimerPresetsAvailable(this.variant.allowTokyoClock);
    this.setupOperationFlow();
    this.applyVariantVisibility();
    document.querySelectorAll<HTMLButtonElement>(".nav").forEach((button) => {
      button.addEventListener("click", () => {
        const screen = button.dataset.screen as Screen;
        if (screen === "links") this.visitSecretScreen("links");
        else if (screen === "rules") this.visitSecretScreen("rules");
        else this.show(screen);
        this.closeMobileMenu();
      });
    });
    el<HTMLButtonElement>("mobile-menu-toggle").addEventListener("click", (event) => {
      event.stopPropagation();
      this.setMobileMenu(!this.mobileMenuOpen);
    });
    document.addEventListener("click", (event) => {
      const target = event.target as Node;
      if (this.mobileMenuOpen && !el("app-header").contains(target)) this.closeMobileMenu();
    });
    document.querySelectorAll<HTMLButtonElement>(".jump").forEach((button) => button.addEventListener("click", () => this.show(button.dataset.target as Screen)));
    els<HTMLButtonElement>("dashboard-timer-fullscreen").forEach((button) => button.addEventListener("click", () => {
      this.prepareFullscreenReturn();
      this.show("timer");
      void this.timer.enterDisplayFullscreen();
    }));
    els<HTMLButtonElement>("dashboard-balls-fullscreen").forEach((button) => button.addEventListener("click", () => {
      this.prepareFullscreenReturn();
      void this.enterBallsFullscreen();
    }));
    el<HTMLButtonElement>("timer-fullscreen").addEventListener("click", () => {
      if (!document.fullscreenElement && !document.body.classList.contains("compact")) this.prepareFullscreenReturn();
    }, { capture: true });
    el<HTMLButtonElement>("referee-fullscreen").addEventListener("click", () => {
      if (!document.fullscreenElement && !document.body.classList.contains("referee-compact")) this.prepareFullscreenReturn();
    }, { capture: true });
    el<HTMLButtonElement>("balls-fullscreen").addEventListener("click", () => {
      if (!this.ballsFullscreen) this.prepareFullscreenReturn();
    }, { capture: true });
    el<HTMLButtonElement>("balls-fullscreen").addEventListener("click", () => void this.toggleBallsFullscreen());
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        if (this.ballsFullscreen) this.setBallsFullscreen(false);
        this.restoreFullscreenReturn();
      }
    });
    el<HTMLButtonElement>("admin-exit").addEventListener("click", () => this.confirmDeactivateSecret());
    el<HTMLButtonElement>("admin-exit-confirm").addEventListener("click", () => this.deactivateSecret());
    el<HTMLButtonElement>("admin-exit-cancel").addEventListener("click", () => el<HTMLDialogElement>("admin-exit-dialog").close());
    this.content.init();
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      let refreshing = false;
      const activateWaitingWorker = (registration: ServiceWorkerRegistration): void => {
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
      };
      const watchRegistration = (registration: ServiceWorkerRegistration): void => {
        activateWaitingWorker(registration);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed") activateWaitingWorker(registration);
          });
        });
      };
      const updateServiceWorker = (): void => {
        void navigator.serviceWorker.getRegistration().then((registration) => registration?.update()).catch(() => undefined);
      };
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
      window.addEventListener("load", () => {
        void navigator.serviceWorker
          .register(`${import.meta.env.BASE_URL}sw.js`)
          .then((registration) => {
            watchRegistration(registration);
            return registration.update();
          })
          .catch(() => undefined);
      });
      window.addEventListener("online", updateServiceWorker);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") updateServiceWorker();
      });
    }
  }

  private show(screen: Screen): void {
    this.timer.noteActivity();
    if (screen !== "timer") void this.timer.leaveFullscreen();
    if (screen !== "referee") void this.refereeTimer.leaveFullscreen();
    if (screen !== "balls" && this.ballsFullscreen) void this.leaveBallsFullscreen();
    document.querySelectorAll(".screen").forEach((element) => element.classList.remove("active"));
    el(`screen-${screen}`).classList.add("active");
    document.querySelectorAll<HTMLButtonElement>(".nav").forEach((button) => button.classList.toggle("active", button.dataset.screen === screen));
    el("current-mode-label").textContent = screenLabels[screen];
    this.content.open(screen, this.secret);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  private currentScreen(): Screen {
    const activeId = document.querySelector<HTMLElement>(".screen.active")?.id.replace(/^screen-/, "");
    return activeId && activeId in screenLabels ? activeId as Screen : "dashboard";
  }

  private prepareFullscreenReturn(): void {
    this.fullscreenReturnScreen = this.currentScreen();
  }

  private restoreFullscreenReturn(activeFullscreenScreen?: Screen): void {
    const returnScreen = this.fullscreenReturnScreen;
    if (!returnScreen) return;
    if (activeFullscreenScreen && this.currentScreen() !== activeFullscreenScreen) {
      this.fullscreenReturnScreen = null;
      return;
    }
    this.fullscreenReturnScreen = null;
    this.show(returnScreen);
  }

  private applyVariantVisibility(): void {
    const showNews = this.variant.showNews;
    document.querySelectorAll<HTMLElement>('[data-screen="news"], #screen-news, #news-dialog').forEach((element) => {
      element.classList.toggle("hidden", !showNews);
      element.toggleAttribute("hidden", !showNews);
    });
  }

  private operationScreen(): Screen {
    return document.getElementById("screen-operation") ? "operation" : "dashboard";
  }

  private setupOperationFlow(): void {
    this.syncOperationTeams();
    el<HTMLButtonElement>("operation-prepare").addEventListener("click", () => {
      this.operationActive = true;
      this.setOperationNavigationLocked(true);
      this.clearOperationHomeTimer();
      this.syncOperationTeams();
      this.show(this.operationScreen());
      this.showOperationStep("team");
    });
    el<HTMLButtonElement>("operation-team-ok").addEventListener("click", () => this.openOperationStartCheck());
    el<HTMLButtonElement>("operation-start-check-confirm").addEventListener("click", () => this.startOperationSeries());
    document.querySelectorAll<HTMLButtonElement>("[data-operation-back]").forEach((button) => button.addEventListener("click", () => this.requestOperationBack(button)));
    el<HTMLButtonElement>("operation-timer-back").addEventListener("click", () => this.confirmOperationTimerBack());
    el<HTMLButtonElement>("operation-timer-return").addEventListener("click", () => this.returnOperationRecordInput());
    el<HTMLButtonElement>("operation-ball-random").addEventListener("click", () => {
      this.balls.randomize();
      this.setOperationDrawButtonsLocked(true, false);
      this.setOperationDrawStage(2);
    });
    el<HTMLButtonElement>("operation-time-random").addEventListener("click", () => {
      this.timer.setDashboardOverride(null);
      this.timer.prepare();
      setText(els("dashboard-time"), this.timer.displayText());
      this.setOperationDrawButtonsLocked(true, true);
      this.setOperationDrawStage(3);
    });
    el<HTMLButtonElement>("operation-ready").addEventListener("click", () => {
      el<HTMLDialogElement>("operation-ready-dialog").showModal();
    });
    el<HTMLButtonElement>("operation-ready-confirm").addEventListener("click", () => this.startOperationTimer());
    el<HTMLButtonElement>("operation-next-match").addEventListener("click", () => {
      this.clearOperationHomeTimer();
      this.records.continueForOperation();
    });
    el<HTMLButtonElement>("operation-home-return").addEventListener("click", () => this.returnOperationHome(true));
    el<HTMLButtonElement>("operation-home-countdown-cancel").addEventListener("click", () => {
      this.clearOperationHomeTimer();
      el("operation-home-countdown").textContent = "自動ホーム復帰を停止しました。";
    });
    document.addEventListener("series-match-saved", (event) => {
      const detail = (event as CustomEvent<{ match: number; finished: boolean }>).detail;
      this.setOperationRecordFocus(false);
      if (!this.operationActive) return;
      if (detail.finished) {
        this.setOperationFinalReview(true);
        this.show("records");
        return;
      }
      this.operationMatch = Math.min(detail.match + 1, 3);
      this.show(this.operationScreen());
      this.showOperationStep("between");
      el("operation-ended-match").textContent = `第${detail.match}マッチが終了しました`;
      el("operation-between-message").innerHTML = `<span class="operation-between-line">選手の皆さんはコートチェンジと、</span><span class="operation-between-line">第${this.operationMatch}マッチの準備をお願いします。</span><span class="operation-between-note">（コートチェンジ後）ロボットのボタンを一度押したらスタートできる状態にしてください。準備ができ次第、抽選を行います。</span>`;
      el<HTMLButtonElement>("operation-next-match").textContent = `第${this.operationMatch}マッチへ進む`;
    });
    document.addEventListener("series-finalized", (event) => {
      if (!this.operationActive) return;
      this.setOperationRecordFocus(false);
      this.setOperationFinalReview(false);
      const detail = (event as CustomEvent<{ lead: string; winner: string }>).detail;
      this.setOperationNavigationLocked(false);
      this.show(this.operationScreen());
      this.showOperationStep("finished");
      el("operation-result-line-a").textContent = detail.lead;
      el("operation-result-line-b").textContent = detail.winner;
      this.scheduleOperationHomeReturn(120000);
    });
    document.addEventListener("series-home-requested", () => {
      if (this.operationActive) this.returnOperationHome(false);
    });
    document.addEventListener("records-storage-updated", () => this.updateHomeSyncAlert());
    document.addEventListener("admin-settings-updated", () => this.updateHomeSyncAlert());
    window.addEventListener("storage", (event) => {
      if (event.key === "tennis-assist-records-v1" || event.key === "tennis-assist-admin-v1") this.updateHomeSyncAlert();
    });
    document.addEventListener("series-match-edit", () => {
      if (!this.operationActive) return;
      this.setOperationFinalReview(false);
      this.setOperationRecordFocus(true);
      this.show("records");
    });
    this.updateHomeSyncAlert();
  }

  private syncOperationTeams(): void {
    const values = this.records.teamOptions();
    options(el<HTMLSelectElement>("operation-court"), courtOptions, el<HTMLSelectElement>("court-select").value || "Aコート");
    options(el<HTMLSelectElement>("operation-team-a"), values, values[0]);
    options(el<HTMLSelectElement>("operation-team-b"), values, values[1] ?? values[0]);
  }

  private openOperationStartCheck(): void {
    const court = el<HTMLSelectElement>("operation-court").value;
    const teamA = el<HTMLSelectElement>("operation-team-a").value;
    const teamB = el<HTMLSelectElement>("operation-team-b").value;
    if (teamA === teamB) {
      el("operation-team-status").textContent = "左右で別のチームを選択してください。";
      return;
    }
    el("operation-team-status").textContent = "";
    const settings = AdminController.settings();
    el("operation-start-check-detail").innerHTML =
      `<dl class="start-check-list">` +
      `<div><dt>コート</dt><dd>${escapeText(court)}</dd></div>` +
      `<div class="start-check-teams"><dt>対戦チーム</dt><dd><span class="start-check-team-card left"><b>左側チーム</b><strong>${escapeText(teamA)}</strong></span><span class="start-check-team-card right"><b>右側チーム</b><strong>${escapeText(teamB)}</strong></span></dd></div>` +
      `<div><dt>試合種別</dt><dd>${escapeText(settings.matchType)}</dd></div>` +
      `</dl>`;
    el<HTMLDialogElement>("operation-start-check-dialog").showModal();
  }

  private startOperationSeries(): void {
    const court = el<HTMLSelectElement>("operation-court").value;
    const teamA = el<HTMLSelectElement>("operation-team-a").value;
    const teamB = el<HTMLSelectElement>("operation-team-b").value;
    if (teamA === teamB) {
      el("operation-team-status").textContent = "左右で別のチームを選択してください。";
      return;
    }
    el("operation-team-status").textContent = "";
    this.operationActive = true;
    this.operationMatch = 1;
    this.clearOperationHomeTimer();
    this.records.startSeriesForOperation(teamA, teamB, court);
  }

  private showOperationStep(step: "home" | "team" | "draw" | "between" | "finished"): void {
    if (step !== "finished") this.setOperationRecordFocus(false);
    if (step !== "finished") this.setOperationFinalReview(false);
    this.operationStep = step;
    document.querySelectorAll(".operation-step").forEach((panel) => panel.classList.remove("active"));
    el(`operation-${step}`).classList.add("active");
    if (step === "draw") {
      this.setOperationTimerActive(false);
      this.setOperationDrawButtonsLocked(false, false);
      this.setOperationDrawStage(1);
      el("operation-match-title").textContent = `【第${this.operationMatch}マッチ抽選】`;
      this.timer.setDashboardOverride("00 : 00");
      setText(els("dashboard-time"), "00 : 00");
    }
    if (step === "home") this.updateHomeSyncAlert();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  private updateHomeSyncAlert(): void {
    const panel = document.getElementById("home-sync-alert");
    if (!panel) return;
    const sync = this.records.syncSummary();
    const settings = AdminController.settings();
    const hasGasHistory = Boolean(settings.gasUrl || settings.apiKey || settings.gasConnectedAt);
    panel.classList.toggle("hidden", sync.unsent === 0 && !sync.configured && !hasGasHistory);
    const gasState = sync.configured ? "GAS接続OK" : settings.sendEnabled === false ? "送信OFF" : "GAS未接続";
    panel.classList.remove("sync-running", "sync-success", "sync-warning");
    panel.classList.add(this.homeSyncState === "running" ? "sync-running" : this.homeSyncState === "success" ? "sync-success" : "sync-warning");
    let markup = "";
    if (!sync.unsent) {
      panel.classList.toggle("hidden", !this.homeSyncNotice && !sync.configured && !hasGasHistory);
      markup = `<div><strong>${gasState}</strong><span>${this.homeSyncNotice || "未送信 0件"}</span></div>`;
      if (this.homeSyncAlertMarkup !== markup) {
        panel.innerHTML = markup;
        this.homeSyncAlertMarkup = markup;
      }
      return;
    }
    markup =
      `<div><strong>${gasState} / ${escapeText(sync.reason)}</strong><span>${this.homeSyncNotice || `対戦結果が未送信です。未送信 ${sync.pending}件 / 送信失敗 ${sync.failed}件。詳細は試合記録の「対戦履歴と統計」で確認してください。`}</span></div>` +
      `<button id="home-sync-retry" class="button danger" type="button">再送信</button>`;
    if (this.homeSyncAlertMarkup === markup) return;
    panel.innerHTML = markup;
    this.homeSyncAlertMarkup = markup;
    panel.querySelector<HTMLButtonElement>("#home-sync-retry")?.addEventListener("click", () => {
      void this.retryHomeUnsent();
    });
  }

  private async retryHomeUnsent(): Promise<void> {
    this.homeSyncState = "running";
    this.homeSyncNotice = "ホームから再送信を実行しています。詳細は試合記録の「対戦履歴と統計」で確認してください。";
    this.updateHomeSyncAlert();
    await this.records.retryPendingSends("manual");
    const sync = this.records.syncSummary();
    this.homeSyncState = sync.unsent ? "warning" : "success";
    this.homeSyncNotice = sync.unsent
      ? `再送信を実行しましたが、${sync.reason}のため未送信 ${sync.pending}件 / 送信失敗 ${sync.failed}件が残っています。詳細は試合記録の「対戦履歴と統計」で確認してください。`
      : "再送信を実行しました。未送信の対戦結果はありません。";
    this.updateHomeSyncAlert();
  }

  private setOperationDrawStage(stage: 1 | 2 | 3): void {
    [
      ["operation-ball-random", 1],
      ["operation-time-random", 2],
      ["operation-ready", 3],
    ].forEach(([id, buttonStage]) => {
      el<HTMLButtonElement>(id as string).classList.toggle("next-action", buttonStage === stage);
    });
  }

  private setOperationDrawButtonsLocked(ballLocked: boolean, timeLocked: boolean): void {
    el<HTMLButtonElement>("operation-ball-random").disabled = ballLocked;
    el<HTMLButtonElement>("operation-time-random").disabled = timeLocked;
  }

  private scheduleOperationHomeReturn(delay = 60000): void {
    this.clearOperationHomeTimer();
    const countdown = document.getElementById("operation-home-countdown");
    let remaining = Math.max(1, Math.ceil(delay / 1000));
    if (countdown) countdown.textContent = `${remaining}秒後にホームへ戻ります。`;
    this.operationHomeCountdownTimer = window.setInterval(() => {
      remaining -= 1;
      if (countdown && remaining > 0) countdown.textContent = `${remaining}秒後にホームへ戻ります。`;
    }, 1000);
    this.operationHomeTimer = window.setTimeout(() => this.returnOperationHome(false), delay);
  }

  private clearOperationHomeTimer(): void {
    if (this.operationHomeTimer) {
      window.clearTimeout(this.operationHomeTimer);
      this.operationHomeTimer = 0;
    }
    if (this.operationHomeCountdownTimer) {
      window.clearInterval(this.operationHomeCountdownTimer);
      this.operationHomeCountdownTimer = 0;
    }
  }

  private clearOperationTimerFinishDelay(): void {
    if (!this.operationTimerFinishDelay) return;
    window.clearTimeout(this.operationTimerFinishDelay);
    this.operationTimerFinishDelay = 0;
  }

  private setOperationRecordFocus(active: boolean): void {
    document.body.classList.toggle("operation-record-focus", active);
  }

  private setOperationFinalReview(active: boolean): void {
    document.body.classList.toggle("operation-final-review", active);
  }

  private setOperationNavigationLocked(active: boolean): void {
    document.body.classList.toggle("operation-navigation-locked", active);
  }

  private setOperationTimerActive(active: boolean): void {
    document.body.classList.toggle("operation-timer-active", active);
  }

  private setOperationTimerReturnable(active: boolean): void {
    document.body.classList.toggle("operation-timer-returnable", active);
  }

  private startOperationTimer(): void {
    this.clearOperationHomeTimer();
    this.clearOperationTimerFinishDelay();
    this.timer.setDashboardOverride(null);
    this.setOperationDrawStage(3);
    this.setFlow(this.operationMatch, "タイマー待機中");
    this.recordTimerPending = true;
    this.setOperationTimerReturnable(false);
    this.show("timer");
    this.setOperationTimerActive(true);
    void this.timer.enterDisplayFullscreen();
  }

  private returnOperationRecordInput(): void {
    if (!this.operationActive) return;
    this.clearOperationHomeTimer();
    void this.timer.leaveFullscreen();
    this.setOperationTimerReturnable(false);
    this.setOperationTimerActive(false);
    this.setOperationRecordFocus(true);
    this.show("records");
  }

  private handleTimerFinished(naturalEnd = false): void {
    const operationTimerActive = this.operationActive && el("screen-timer").classList.contains("active");
    if (!this.recordTimerPending && !operationTimerActive) {
      if (naturalEnd) {
        window.setTimeout(() => {
          void this.timer.leaveFullscreen();
        }, 1000);
      }
      return;
    }
    if (naturalEnd && operationTimerActive) {
      if (this.operationTimerFinishDelay) return;
      this.operationTimerFinishDelay = window.setTimeout(() => {
        this.operationTimerFinishDelay = 0;
        this.completeTimerFinished();
      }, 1000);
      return;
    }
    this.clearOperationTimerFinishDelay();
    this.completeTimerFinished();
  }

  private completeTimerFinished(): void {
    this.recordTimerPending = false;
    void this.timer.leaveFullscreen();
    this.clearFlow();
    this.setOperationTimerActive(false);
    this.setOperationTimerReturnable(false);
    this.setOperationRecordFocus(this.operationActive);
    this.show("records");
    this.records.timerFinished();
  }

  private confirmOperationTimerBack(): void {
    if (!el("screen-timer").classList.contains("active")) return;
    const ok = window.confirm("マッチ抽選へ戻りますか？\n\nタイマー画面を離れて、現在のマッチ抽選画面に戻ります。");
    if (!ok) return;
    this.goOperationBack();
  }

  private requestOperationBack(button: HTMLButtonElement): void {
    if (this.backConfirmButton === button) {
      this.clearBackConfirmation();
      this.goOperationBack();
      return;
    }
    this.clearBackConfirmation();
    this.backConfirmButton = button;
    button.dataset.originalLabel = button.textContent ?? "前の画面に戻る";
    button.textContent = "もう一度押すと戻る";
    button.classList.add("confirming");
    this.backConfirmTimer = window.setTimeout(() => this.clearBackConfirmation(), 3000);
  }

  private clearBackConfirmation(): void {
    if (this.backConfirmTimer) {
      window.clearTimeout(this.backConfirmTimer);
      this.backConfirmTimer = 0;
    }
    if (this.backConfirmButton) {
      this.backConfirmButton.textContent = this.backConfirmButton.dataset.originalLabel ?? "前の画面に戻る";
      this.backConfirmButton.classList.remove("confirming");
      delete this.backConfirmButton.dataset.originalLabel;
      this.backConfirmButton = null;
    }
  }

  private goOperationBack(): void {
    this.clearBackConfirmation();
    this.clearOperationHomeTimer();
    this.clearOperationTimerFinishDelay();
    if (document.body.classList.contains("operation-record-focus")) {
      this.setOperationRecordFocus(false);
      this.setOperationTimerActive(true);
      this.setOperationTimerReturnable(true);
      this.show("timer");
      return;
    }
    if (document.body.classList.contains("operation-final-review")) {
      this.setOperationFinalReview(false);
      this.setOperationRecordFocus(true);
      this.show("records");
      return;
    }
    if (el("screen-timer").classList.contains("active")) {
      void this.timer.leaveFullscreen();
      this.recordTimerPending = false;
      this.setOperationTimerActive(false);
      this.setOperationTimerReturnable(false);
      this.show(this.operationScreen());
      this.showOperationStep("draw");
      return;
    }
    if (this.operationStep === "between") {
      this.show("records");
      return;
    }
    if (this.operationStep === "draw") {
      this.records.resetForOperation();
      this.showOperationStep("team");
      return;
    }
    if (this.operationStep === "team") {
      this.returnOperationHome(true);
    }
  }

  private returnOperationHome(resetSeries: boolean): void {
    this.clearOperationHomeTimer();
    this.clearOperationTimerFinishDelay();
    this.operationActive = false;
    this.operationMatch = 1;
    this.setOperationRecordFocus(false);
    this.setOperationFinalReview(false);
    this.setOperationNavigationLocked(false);
    this.setOperationTimerActive(false);
    this.setOperationTimerReturnable(false);
    this.setOperationDrawButtonsLocked(false, false);
    if (resetSeries) this.records.resetForOperation();
    this.clearFlow();
    this.balls.resetWorkflow();
    this.timer.resetDefault();
    this.show(this.operationScreen());
    this.showOperationStep("home");
  }

  private setMobileMenu(open: boolean): void {
    this.mobileMenuOpen = open;
    el("app-header").classList.toggle("mobile-menu-open", open);
    el<HTMLButtonElement>("mobile-menu-toggle").setAttribute("aria-expanded", String(open));
  }

  private closeMobileMenu(): void {
    if (this.mobileMenuOpen) this.setMobileMenu(false);
  }

  private async enterBallsFullscreen(): Promise<void> {
    const shouldRotate = isPhonePortrait();
    this.show("balls");
    this.setBallsFullscreen(true);
    try {
      await el("screen-balls").requestFullscreen?.();
    } catch {
      // The in-page fullscreen layout still maximizes the court.
    }
    if (shouldRotate) {
      try {
        await (screen.orientation as LockableScreenOrientation | undefined)?.lock?.("landscape");
      } catch {
        el("balls-status").textContent = "見やすくするには端末を横向きにしてください。";
      }
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
    try {
      screen.orientation?.unlock?.();
    } catch {
      // Orientation locking is optional and browser dependent.
    }
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen?.();
      } catch {
        // The in-page layout can still be restored.
      }
    }
    this.setBallsFullscreen(false);
    this.restoreFullscreenReturn("balls");
  }

  private setBallsFullscreen(active: boolean): void {
    this.ballsFullscreen = active;
    document.body.classList.toggle("balls-compact", active);
    el<HTMLButtonElement>("balls-fullscreen").textContent = active ? "全画面解除" : "全画面表示";
    setText(els<HTMLButtonElement>("dashboard-balls-fullscreen"), active ? "全画面解除" : "全画面表示");
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
    if (this.operationActive && (event === "start" || event === "next")) {
      this.operationMatch = match || this.records.currentMatchNumber();
      this.setFlow(this.operationMatch, "抽選準備中");
      this.balls.beginWorkflow(this.operationMatch);
      this.timer.prepare();
      this.show(this.operationScreen());
      this.showOperationStep("draw");
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

  private visitSecretScreen(screen: "links" | "rules"): void {
    if (screen === "links") {
      this.linksClicks += 1;
      this.rulesClicks = 0;
    } else {
      this.rulesClicks += 1;
      this.linksClicks = 0;
    }
    const count = screen === "links" ? this.linksClicks : this.rulesClicks;
    if (!this.secret && count >= 10) {
      this.activateSecret();
    } else if (this.secret && count >= 10) {
      this.deactivateSecret();
    }
    this.show(screen);
  }

  private activateSecret(): void {
    this.admin ??= new AdminController(
      this.qrScanner,
      () => this.records.importTeamsFromGasConnection(),
      (mode, settings) => this.applyAdminMode(mode, settings),
      (setting) => this.applyTimerSetting(setting),
      () => this.records.syncSummary(),
    );
    this.secret = true;
    this.linksClicks = 0;
    this.rulesClicks = 0;
    document.documentElement.classList.add("secret");
    this.updateTitle();
    el("development-nav").classList.remove("hidden");
    el("admin-exit").classList.remove("hidden");
    this.timer.setSecret(true);
    this.content.renderLinks(true);
  }

  private confirmDeactivateSecret(): void {
    el<HTMLDialogElement>("admin-exit-dialog").showModal();
  }

  private applyAdminMode(mode: AdminMode, settings: AdminSettings): void {
    this.hyogo = mode === "hyogo";
    const lightAllowed = this.variant.allowLightUi && mode === "rsam";
    const accentMode = lightAllowed ? settings.accentMode : settings.accentMode === "admin" ? "admin" : "standard";
    document.documentElement.classList.toggle("venue-standard-accent", accentMode === "standard");
    document.documentElement.classList.toggle("venue-admin-accent", accentMode === "admin");
    document.documentElement.classList.toggle("venue-light-accent", accentMode === "light");
    this.timer.setHyogoMode(this.hyogo);
    this.timer.setTokyoClockModeAvailable(this.variant.allowTokyoClock);
    this.balls.setHyogoMode(this.hyogo);
    this.updateTitle();
    this.updateHomeSyncAlert();
  }

  private applyTimerSetting(setting: ExternalTimerSetting | null): void {
    this.timer.setExternalTimerSetting(setting);
  }

  private updateTitle(): void {
    const base = this.hyogo ? "RoboSports Assist HYOGO" : "RoboSports Assist";
    const title = `${base} ${this.variant.titleSuffix}`;
    el("title").textContent = title;
    document.title = title;
  }

  private deactivateSecret(): void {
    this.secret = false;
    this.hyogo = false;
    this.linksClicks = 0;
    this.rulesClicks = 0;
    document.documentElement.classList.remove("secret");
    document.documentElement.classList.remove("venue-standard-accent");
    document.documentElement.classList.remove("venue-admin-accent");
    document.documentElement.classList.remove("venue-light-accent");
    this.updateTitle();
    el("development-nav").classList.add("hidden");
    el("admin-exit").classList.add("hidden");
    this.timer.setSecret(false);
    this.timer.setHyogoMode(false);
    this.timer.setExternalTimerSetting(AdminController.timerSetting());
    this.timer.setTokyoClockModeAvailable(false);
    this.balls.setHyogoMode(false);
    this.admin?.lock();
    this.content.renderLinks(false);
    this.show("dashboard");
  }
}

new Application();
