import "./styles.css";

declare const __APP_VERSION__: string;

type Screen = "dashboard" | "operation" | "timer" | "referee" | "balls" | "records" | "rules" | "news" | "links" | "development";
type Category = "【終了・その時点で採点】（通常の試合停止）" | "【違反・自動敗北 / 失格】試合前・競技全般" | "【違反・自動敗北 / 失格】試合中の違反";
type FlowEvent = "start" | "next" | "balls" | "timer" | "finished" | "reset";
type MatchType = "練習" | "練習試合" | "公式試合" | "予選" | "決勝トーナメント" | "4位決定リーグ" | "優勝決定リーグ";
type WakeLockSentinelLike = { release: () => Promise<void>; released?: boolean };
type DeviceRole = "" | "Aコート用" | "Bコート用" | "Cコート用" | "Dコート用" | "Eコート用" | "Fコート用" | "Gコート用" | "Hコート用" | "本部用" | "予備端末";
const homeUnsentAlertDelayMs = 20000;
const gasReadTimeoutMs = 20000;
const gasWriteTimeoutMs = 35000;
const holdConfirmDurationMs = 1000;
type SyncSummary = { pending: number; failed: number; unsent: number; configured: boolean; gasText: string; reason: string; oldestUnsentAt: number };

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
  sendStatusChangedAt?: string;
  deviceId?: string;
  deviceRole?: DeviceRole;
  appVersion?: string;
  teamAAgreed?: boolean;
  teamBAgreed?: boolean;
  completedMatchCount?: number;
  finalized?: boolean;
}

interface Series {
  id: string;
  court: string;
  seriesNumber: number;
  matchType: MatchType;
  teamA: string;
  teamB: string;
  records: MatchRecord[];
}

interface PersistedSeriesProgress {
  series: Series;
  editing: number;
  agreedA: boolean;
  agreedB: boolean;
  finalized: boolean;
  awaitingNextMatch: boolean;
  awaitingResultInput: boolean;
  operationManaged: boolean;
  savedAt: string;
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

interface AudioCueSettings {
  elapsedThirty: boolean;
  remainingTen: boolean;
  remainingFiveSequence: boolean;
}

interface AdminSettings {
  gasUrl: string;
  apiKey: string;
  sendEnabled: boolean;
  accentMode: "standard" | "admin" | "light";
  matchType: MatchType;
  deviceRole: DeviceRole;
  audioCues: AudioCueSettings;
  showOperationMatchLabel: boolean;
  operationMatchLabelSize: number;
  venueScreenVisibility: VenueScreenVisibility;
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
  courtCount?: number | null;
  priorityCount?: number;
  sourceLabel?: string;
};

type TimerSettingLoadResult = {
  status: "loaded" | "cached" | "failed";
  message: string;
};

type AdminMode = "standard" | "hyogo" | "nara" | "mie" | "rsam";
type ConfigurableVenueScreen = "timer" | "referee" | "balls" | "rules" | "links";
type VenueScreenVisibility = Record<ConfigurableVenueScreen, boolean>;
type AppVariant = "venue" | "general";
type AdminModeApplyOptions = {
  applyTheme?: boolean;
  adminKey?: string;
};

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

type GasBootstrapResponse = GasResponse & {
  teams?: string[];
  priority_teams?: string[];
  team_row_count?: number;
  team_sheet_name?: string;
  court_count?: number | null;
  timer_setting?: unknown;
};

type BallLayout = ReadonlyArray<readonly [string, number, number]>;

type RecordInputSnapshot = {
  reasonCategory: string;
  endReason: string;
  targetTeam: string;
  aOrange: string;
  aPurple: string;
  bOrange: string;
  bPurple: string;
};

interface PausedOperationState {
  version: 2;
  match: number;
  step: "draw" | "result";
  ballDrawn: boolean;
  timeDrawn: boolean;
  timerSeconds: number;
  ballLayout: BallLayout;
  recordInput: RecordInputSnapshot;
  progress: PersistedSeriesProgress;
  savedAt: string;
}

interface FinalMetaSelection {
  court: string;
  matchType: MatchType;
  teamA: string;
  teamB: string;
}

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
    titleSuffix: "",
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

const featureScopes = {
  common: ["timer", "balls", "records", "rules", "links", "admin-base"],
  venueOnly: ["operation-flow", "home-unsent-alert", "venue-title"],
  generalOnly: ["news", "tokyo-clock", "practice-log"],
  adminOnly: ["gas-settings", "timer-settings", "device-role", "audio-check"],
} as const;

const deviceRoleOptions: DeviceRole[] = ["", "Aコート用", "Bコート用", "Cコート用", "Dコート用", "Eコート用", "Fコート用", "Gコート用", "Hコート用", "本部用", "予備端末"];
const adminStorageKey = "tennis-assist-admin-v1";
const adminSessionStorageKey = "tennis-assist-admin-session-v1";

type AdminSessionState = {
  active: boolean;
  verified: boolean;
  mode: AdminMode;
  adminKey: string;
  updatedAt: string;
};

const defaultAudioCueSettings: AudioCueSettings = {
  elapsedThirty: true,
  remainingTen: true,
  remainingFiveSequence: true,
};
const defaultOperationMatchLabelSize = 32;
const defaultVenueScreenVisibility: VenueScreenVisibility = {
  timer: false,
  referee: true,
  balls: false,
  rules: false,
  links: false,
};

function normalizeVenueScreenVisibility(value: unknown): VenueScreenVisibility {
  const parsed = value && typeof value === "object" ? value as Partial<VenueScreenVisibility> : {};
  return {
    timer: parsed.timer === true,
    referee: parsed.referee !== false,
    balls: parsed.balls === true,
    rules: parsed.rules === true,
    links: parsed.links === true,
  };
}

function normalizeOperationMatchLabelSize(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return defaultOperationMatchLabelSize;
  return Math.min(64, Math.max(18, Math.round(parsed)));
}

function normalizeAudioCueSettings(value: unknown): AudioCueSettings {
  const parsed = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    elapsedThirty: parsed.elapsedThirty !== false,
    remainingTen: parsed.remainingTen !== false,
    remainingFiveSequence: parsed.remainingFiveSequence !== false,
  };
}

function currentAudioCueSettings(): AudioCueSettings {
  try {
    const parsed = JSON.parse(localStorage.getItem(adminStorageKey) ?? "{}") as { audioCues?: unknown };
    return normalizeAudioCueSettings(parsed.audioCues);
  } catch {
    return { ...defaultAudioCueSettings };
  }
}

const managedSheets = {
  hyogo: "https://docs.google.com/spreadsheets/d/1pxTMvdcpTMFeSfroOeTyh2hziLgfAvLxe0Nh79sMk_0/edit?usp=sharing",
  mie: "https://docs.google.com/spreadsheets/d/185jPLjc-nBri49aOr-CVw1baUI1qaxqjgcWLRS2-oxo/edit?usp=sharing",
  shared: "https://docs.google.com/spreadsheets/d/1BTByUtO5IAdwdTYCMNhFUtqeRy2yIWpAnCZRQw_b0HU/edit?usp=sharing",
  self: "https://docs.google.com/spreadsheets/d/1PKAZgb8HZFww-P9CZTkzVqleAtIOFgkl8Ngk6lZwcTA/edit?usp=sharing",
  shukugawa: "https://docs.google.com/spreadsheets/d/1tOyTdp7DD1lFZr5XsYnB3Zc4JEM9rGeMoH_6B43Yeg4/edit?usp=sharing",
  train: "https://docs.google.com/spreadsheets/d/1Bh5FpSOjkTRRV9feZ90dLXl86v3UNsG896DfhSPHst0/edit?usp=sharing",
  nara: "https://docs.google.com/spreadsheets/d/1qaT1lLCqUjw__0jkR51KIqLXur3jO7EBoc8R0gWgnZ8/edit?usp=sharing",
} as const;

const managedGasUrlsByPassword = new Map<string, ManagedGasConfig>([
  ["hyogo", { label: "WRO兵庫", url: "https://script.google.com/macros/s/AKfycbw0wWKqqar4adDt9SXKmQdO82twKvUjomcrfYGvb7_2mi1cP5rVW7QR62Ijuc5uNpJRgQ/exec", spreadsheetUrl: managedSheets.hyogo }],
  ["mie", { label: "WRO三重", url: "https://script.google.com/macros/s/AKfycbx6OkFR799hYZ3DaYWxfluCTuDKf6sE34HtVuzMHTfJQd5Hs0YcQujZiVxtEOxzvN5-/exec", spreadsheetUrl: managedSheets.mie }],
  ["mie_judge", { label: "WRO三重", url: "https://script.google.com/macros/s/AKfycbx6OkFR799hYZ3DaYWxfluCTuDKf6sE34HtVuzMHTfJQd5Hs0YcQujZiVxtEOxzvN5-/exec", spreadsheetUrl: managedSheets.mie }],
  ["nara", { label: "WRO奈良", url: "https://script.google.com/macros/s/AKfycbya7EhTdbZzvZIPR2HKMBha7ciFLpG-iFr1T5PZitsLgsWTXE-5lNbACIN9Bkgf_ZdE4g/exec", spreadsheetUrl: managedSheets.nara }],
  ["judge", { label: "WRO共有確認用", url: "https://script.google.com/macros/s/AKfycbyniW9kgzwtMI0i5X5ZtDlnqGz1yaeuHnXZZ7s67fIS54tdzg1U__sZUzLDoLqUY8lt/exec", spreadsheetUrl: managedSheets.shared }],
  ["train", { label: "審判練習", url: "https://script.google.com/macros/s/AKfycbxd1h_jzSECSjtQIxKvoX-joGUEy2yHcJYc2nQ14-YHze9OpqXrfy9JsEg_6gi03KpA/exec", spreadsheetUrl: managedSheets.train }],
  ["practice", { label: "審判練習", url: "https://script.google.com/macros/s/AKfycbxd1h_jzSECSjtQIxKvoX-joGUEy2yHcJYc2nQ14-YHze9OpqXrfy9JsEg_6gi03KpA/exec", spreadsheetUrl: managedSheets.train }],
  ["rsam", { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", spreadsheetUrl: managedSheets.self }],
  ["gas", { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", spreadsheetUrl: managedSheets.self }],
  ["wrorsam", { label: "自分", url: "https://script.google.com/macros/s/AKfycbwbs-mgIJNX-DkgtoLzpkQaTQNa75tWwijAfyudWbi4LvKJGkWSrC6y0PC_EY4kFUsa/exec", spreadsheetUrl: managedSheets.self }],
  ["shukugawa", { label: "夙川", url: "https://script.google.com/macros/s/AKfycbwZjAa77dzxEWivtFkZIWGzDdhynAFBjmn3zjdte_KO1eDbhLR0xidIv1mNTvCwwLfIzQ/exec", spreadsheetUrl: managedSheets.shukugawa }],
]);

const managedGasUrls = new Set(Array.from(managedGasUrlsByPassword.values(), (config) => config.url));

function currentAppVariant(): AppVariantConfig {
  void featureScopes;
  return window.location.pathname.split("/").filter(Boolean).includes("general") ? appVariants.general : appVariants.venue;
}

let teams: string[] = [...defaultTeams];
const operationMatchTypes: MatchType[] = ["練習", "予選", "決勝トーナメント", "4位決定リーグ", "優勝決定リーグ"];
const operationMatchTypeOptions = ["試合種別を選択", ...operationMatchTypes];
const priorityTeamMatchTypes = new Set<MatchType>(["決勝トーナメント", "4位決定リーグ", "優勝決定リーグ"]);
type OverallDecision = { side: "a" | "b" | "draw"; basis: "wins" | "violations" | "score" | "purple" | "draw" };

function decideOverallWinner(matchType: MatchType, sum: Summary): OverallDecision {
  if (sum.teamAWins !== sum.teamBWins) {
    return { side: sum.teamAWins > sum.teamBWins ? "a" : "b", basis: "wins" };
  }
  if (!priorityTeamMatchTypes.has(matchType)) return { side: "draw", basis: "draw" };
  if (sum.teamAViolations !== sum.teamBViolations) {
    return { side: sum.teamAViolations < sum.teamBViolations ? "a" : "b", basis: "violations" };
  }
  if (sum.teamAScore !== sum.teamBScore) {
    return { side: sum.teamAScore < sum.teamBScore ? "a" : "b", basis: "score" };
  }
  if (sum.teamAPurple !== sum.teamBPurple) {
    return { side: sum.teamAPurple > sum.teamBPurple ? "a" : "b", basis: "purple" };
  }
  return { side: "draw", basis: "draw" };
}
const csvColumns = [
  "日時", "記録種別", "種別", "対戦ID", "コート", "試合番号", "マッチ番号", "チームA", "チームB",
  "チームA勝数", "チームA敗数", "チームAオレンジ", "チームA紫", "チームA得点", "チームA違反数",
  "チームB勝数", "チームB敗数", "チームBオレンジ", "チームB紫", "チームB得点", "チームB違反数",
  "引き分け数", "総合勝者", "マッチ勝者", "結果", "終了カテゴリ", "終了理由", "対象チーム", "メモ",
  "端末役割", "端末ID", "アプリバージョン", "チームA同意", "チームB同意", "完了マッチ数", "最終確定",
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
const courtOptions = Array.from({ length: 26 }, (_, i) => `${String.fromCharCode(65 + i)}コート`);
let activeCourtOptions = [...courtOptions];
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
    "人間による接触(6.32.5)", "両ロボットの脱走(6.32.6)",
    "ボールの破損(6.32.7)", "フィールド・設備の破損(6.32.8)", "無許可の移動・撤去(6.33)",
  ],
};

const rankingViolationReasonPrefixes = [
  "倫理規定違反(3.1-3.10)", "車検（チェック）不合格(6.1.2)", "遅刻(6.10)", "不正なデータ入力(6.17)",
  "分離パーツの違反(6.23)", "外部からの合図・入力(6.24)", "レッドゾーンへの接触(6.27)",
  "故意のロボット接触(6.28)", "相手陣地・ロボットへの接触(6.29 / 6.32.2)",
  "サイズ制限の超過(6.32.3)", "人間による接触(6.32.5)", "両ロボットの脱走(6.32.6)",
  "ボールの破損(6.32.7)", "フィールド・設備の破損(6.32.8)", "無許可の移動・撤去(6.33)",
];

// 付録12の備考欄に明記された【違反】だけをランキング違反として数えます。
// 9:-4の自動敗北でも、6.20・6.21・6.32.4・6.32.10は違反数に加算しません。
function isRankingViolation(category: Category, endReason: string): boolean {
  if (category === scoringCategory) return false;
  return rankingViolationReasonPrefixes.some((prefix) => endReason.startsWith(prefix));
}

function courtCompetitionCode(court: string): string {
  return court.trim().match(/[A-Z]/i)?.[0]?.toUpperCase() ?? "A";
}

function courtOptionsFromCount(count: number | null | undefined): string[] {
  const normalized = Number.isFinite(count) ? Math.floor(Number(count)) : 0;
  if (normalized < 1 || normalized > courtOptions.length) return [...courtOptions];
  return courtOptions.slice(0, normalized);
}

function courtRangeLabel(optionsList = activeCourtOptions): string {
  if (optionsList.length >= courtOptions.length) return "A〜Zコート";
  const last = optionsList.at(-1)?.charAt(0) ?? "A";
  return `A〜${last}コート`;
}

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

function teamOptions(select: HTMLSelectElement, values: readonly string[], selected = values[0], priorityCount = 0): void {
  const safePriorityCount = Math.max(0, Math.min(priorityCount, values.length));
  const children: HTMLOptionElement[] = [];
  values.forEach((value, index) => {
    if (index === safePriorityCount && safePriorityCount > 0 && safePriorityCount < values.length) {
      const separator = new Option("────────", "", false, false);
      separator.disabled = true;
      children.push(separator);
    }
    children.push(new Option(value, value, false, value === selected));
  });
  select.replaceChildren(...children);
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

let volatileDeviceId = "";

function shortDeviceId(): string {
  const key = "tennis-assist-device-id-v1";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated = `端末-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    localStorage.setItem(key, generated);
    return generated;
  } catch {
    if (!volatileDeviceId) volatileDeviceId = `端末-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    return volatileDeviceId;
  }
}

function normalizeDeviceRole(value: unknown): DeviceRole {
  return deviceRoleOptions.includes(value as DeviceRole) ? value as DeviceRole : "";
}

function courtFromDeviceRole(value: DeviceRole): string | null {
  const match = value.match(/^([A-H])コート用$/);
  return match ? `${match[1]}コート` : null;
}

function adminTitleSuffix(adminKey: string): string {
  const key = adminKey.trim().toLowerCase();
  if (key === "hyogo") return "HYOGO";
  if (key === "nara") return "NARA";
  if (key === "mie" || key === "mie_judge") return "MIE";
  if (key === "judge") return "JUDGE";
  if (key === "train" || key === "practice") return "TRAINING";
  if (key === "rsam" || key === "gas" || key === "wrorsam") return "RSAM";
  if (key === "shukugawa") return "SHUKUGAWA";
  return "ADMIN";
}

function deviceLabel(settings = AdminController.settings()): string {
  const role = normalizeDeviceRole(settings.deviceRole);
  return role ? `${role} / ${shortDeviceId()}` : shortDeviceId();
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

function timerSettingSummary(setting: ExternalTimerSetting): string {
  if (setting.mode === "fixed") return `${formatClock(setting.fixedSeconds)}固定`;
  return `${formatClock(setting.minSeconds)}-${formatClock(setting.maxSeconds)} / ${setting.stepSeconds}秒間隔`;
}

function encodePortablePayload(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return `RSA_CONFIG:${btoa(binary)}`;
}

function decodePortablePayload(value: string): unknown {
  const encoded = value.trim().replace(/^RSA_CONFIG:/, "");
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
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

function isExplicitFinalizedSeriesRecord(record: MatchRecord): boolean {
  return record.recordKind === "試合結果"
    && record.teamAAgreed === true
    && record.teamBAgreed === true
    && record.completedMatchCount === 3
    && record.finalized === true
    && record.endReason === "3マッチ終了・代表同意済み";
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
  const teamAViolations = record.recordKind === "試合結果"
    ? record.teamAViolations ?? 0
    : isRankingViolation(record.reasonCategory, record.endReason) && record.targetTeam === record.teamA ? 1 : 0;
  const teamBViolations = record.recordKind === "試合結果"
    ? record.teamBViolations ?? 0
    : isRankingViolation(record.reasonCategory, record.endReason) && record.targetTeam === record.teamB ? 1 : 0;
  return [
    record.timestamp, record.recordKind, record.matchType, record.competitionId, record.court, record.seriesNumber, record.matchNumber,
    record.teamA, record.teamB, record.teamAWins ?? "", record.teamALosses ?? "", record.teamAOrange, record.teamAPurple,
    record.teamAScore, teamAViolations,
    record.teamBWins ?? "", record.teamBLosses ?? "", record.teamBOrange, record.teamBPurple, record.teamBScore,
    teamBViolations, record.draws ?? "",
    record.overallWinner ?? "", record.winner, record.result, record.reasonCategory, record.endReason, record.targetTeam, record.notes ?? "",
    record.deviceRole ?? "", record.deviceId ?? "", record.appVersion ?? "", record.teamAAgreed === true ? "TRUE" : "FALSE",
    record.teamBAgreed === true ? "TRUE" : "FALSE", record.completedMatchCount ?? "", record.finalized === true ? "TRUE" : "FALSE",
  ].map(String);
}

function normalizeMatchType(value: unknown): MatchType {
  const text = String(value || "").trim();
  return operationMatchTypes.includes(text as MatchType) || text === "公式試合" || text === "練習試合" ? text as MatchType : "練習試合";
}

function isOperationMatchType(value: string): value is MatchType {
  return operationMatchTypes.includes(value as MatchType);
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

async function ensureGasSuccess(response: Response): Promise<GasResponse> {
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
  return result;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = gasReadTimeoutMs): Promise<Response> {
  const controller = new AbortController();
  const externalSignal = init.signal;
  const abortFromExternal = (): void => controller.abort(externalSignal?.reason);
  if (externalSignal?.aborted) abortFromExternal();
  else externalSignal?.addEventListener("abort", abortFromExternal, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !externalSignal?.aborted) throw new Error("gas_request_timeout");
    throw error;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}

class TimerAudioCueController {
  private context: AudioContext | null = null;
  private master: DynamicsCompressorNode | null = null;
  private readonly scheduledSources: AudioScheduledSourceNode[] = [];
  private scheduled = false;
  private readonly volumeBoost = 1.85;

  async prepare(): Promise<void> {
    let context = this.audioContext();
    if (!context) throw new Error("audio_context_unavailable");
    if (context.state === "closed") {
      this.context = null;
      this.master = null;
      context = this.audioContext();
    }
    if (!context) throw new Error("audio_context_unavailable");
    if (context.state !== "running") await context.resume();
    // Starting a silent source in the user gesture unlocks Web Audio on older
    // iOS/Safari versions that otherwise resume the context without output.
    if (typeof context.createBuffer === "function" && typeof context.createBufferSource === "function") {
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate);
      source.connect(context.destination);
      source.start(context.currentTime);
    }
  }

  playElapsedThirty(): void {
    if (!currentAudioCueSettings().elapsedThirty) return;
    this.chime(1568, 0, 1.45, 1.82);
  }

  playElapsedTen(): void {
    this.chime(2093, 0, 0.32, 1.9);
  }

  playRemainingTen(): void {
    if (!currentAudioCueSettings().remainingTen) return;
    this.chime(1760, 0, 1.02, 1.72);
  }

  playRemainingFiveSequence(): void {
    if (!currentAudioCueSettings().remainingFiveSequence) return;
    this.scheduleFiveSecondSequence(0);
  }

  async testThirtySeconds(): Promise<void> {
    this.stopScheduled();
    await this.prepare();
    this.playElapsedThirty();
  }

  async testRemainingTen(): Promise<void> {
    this.stopScheduled();
    await this.prepare();
    this.playRemainingTen();
  }

  async testRemainingFiveSequence(): Promise<void> {
    this.stopScheduled();
    await this.prepare();
    this.scheduleFiveSecondSequence(0);
  }

  scheduleRefereeCountdown(seconds: 10 | 5): number {
    const context = this.audioContext();
    if (!context) return 0;
    this.stopScheduled();
    const leadSeconds = 0;
    const startAt = context.currentTime + leadSeconds;
    if (seconds === 10) {
      this.scheduleChime(1047, startAt, 0.55, 1.45);
      this.scheduleRefereeFiveSecondSequence(startAt + 5, 1175, 1760);
    } else {
      this.scheduleRefereeFiveSecondSequence(startAt, 880, 1319);
    }
    this.scheduled = this.scheduledSources.length > 0;
    return leadSeconds;
  }

  scheduleMainCues(remaining: number, total: number, includeElapsedTen = false): boolean {
    const context = this.audioContext();
    if (!context || remaining <= 0) return false;
    this.stopScheduled();
    const cues = currentAudioCueSettings();
    const elapsed = total - remaining;
    const now = context.currentTime;
    if (includeElapsedTen && elapsed < 10 && remaining > 10) this.scheduleChime(2093, now + Math.max(0, 10 - elapsed), 0.9, 2.08);
    if (cues.elapsedThirty && elapsed < 30 && remaining > 30) this.scheduleChime(1568, now + Math.max(0, 30 - elapsed), 1.45, 1.82);
    if (cues.remainingTen && remaining > 10) this.scheduleChime(1760, now + (remaining - 10), 1.02, 1.72);
    if (cues.remainingFiveSequence && remaining > 5) this.scheduleFiveSecondSequence(now + (remaining - 5));
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
    if (this.context && this.context.state !== "closed") return this.context;
    this.context = null;
    this.master = null;
    const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    try {
      this.context = new AudioContextCtor();
      this.master = this.context.createDynamicsCompressor();
      this.master.threshold.value = -10;
      this.master.knee.value = 4;
      this.master.ratio.value = 10;
      this.master.attack.value = 0.0015;
      this.master.release.value = 0.14;
      this.master.connect(this.context.destination);
    } catch {
      this.context = null;
      this.master = null;
    }
    return this.context;
  }

  private scheduleFiveSecondSequence(startAt: number): void {
    const context = this.audioContext();
    if (!context) return;
    const start = Math.max(context.currentTime, startAt);
    for (let index = 0; index < 5; index += 1) {
      this.scheduleChime(1397, start + index, 0.16, 1.38);
    }
    this.scheduleChime(2093, start + 5, 1.75, 1.7);
  }

  private scheduleRefereeFiveSecondSequence(startAt: number, shortFrequency: number, finalFrequency: number): void {
    const context = this.audioContext();
    if (!context) return;
    const start = Math.max(context.currentTime, startAt);
    for (let index = 0; index < 5; index += 1) {
      this.scheduleChime(shortFrequency, start + index, 0.16, 1.42);
    }
    this.scheduleChime(finalFrequency, start + 5, 1.75, 1.72);
  }

  private chime(frequency: number, delay: number, duration: number, volume: number): void {
    const context = this.audioContext();
    if (!context) return;
    this.scheduleChime(frequency, context.currentTime + delay, duration, volume);
  }

  private scheduleChime(frequency: number, when: number, duration: number, volume: number): void {
    const context = this.audioContext();
    if (!context || !this.master) return;
    const startAt = Math.max(context.currentTime, when);
    const boostedVolume = Math.min(4.4, volume * this.volumeBoost);
    const oscillator = context.createOscillator();
    const overtone = context.createOscillator();
    const upper = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    overtone.type = "sine";
    upper.type = "square";
    oscillator.frequency.setValueAtTime(frequency, startAt);
    overtone.frequency.setValueAtTime(frequency * 2, startAt);
    upper.frequency.setValueAtTime(frequency * 1.5, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(boostedVolume, startAt + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    oscillator.connect(gain);
    overtone.connect(gain);
    upper.connect(gain);
    gain.connect(this.master);
    this.trackSource(oscillator);
    this.trackSource(overtone);
    this.trackSource(upper);
    oscillator.start(startAt);
    overtone.start(startAt);
    upper.start(startAt);
    oscillator.stop(startAt + duration + 0.03);
    overtone.stop(startAt + duration + 0.03);
    upper.stop(startAt + duration + 0.03);
  }

  private trackSource(source: AudioScheduledSourceNode): void {
    source.addEventListener("ended", () => {
      const index = this.scheduledSources.indexOf(source);
      if (index >= 0) this.scheduledSources.splice(index, 1);
      if (this.scheduledSources.length === 0) this.scheduled = false;
    }, { once: true });
    this.scheduledSources.push(source);
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
  private subEndAt = 0;
  private subCaption = "";
  private randomStep: number | "manual" | "tokyo" | "gas" = 1;
  private manualSeconds = 120;
  private fixedSeconds: number | null = null;
  private externalTimerSetting: ExternalTimerSetting | null = null;
  private dashboardUsesExternalSetting = false;
  private forceExternalForNextReset = false;
  private initialReset = true;
  private secret = false;
  private hyogoMode = false;
  private stateVersion = 0;
  private autoResetTimer = 0;
  private dashboardOverride: string | null = null;
  private readonly audioCues = new TimerAudioCueController();
  private readonly subAudioCues = new TimerAudioCueController();
  private wakeLock: WakeLockSentinelLike | null = null;
  private elapsedTenCuePlayed = false;
  private thirtyCuePlayed = false;
  private remainingTenCuePlayed = false;
  private remainingFiveSequencePlayed = false;
  private endWarningArmed = false;
  private stopWarningArmed = false;
  private stopWarningTimer = 0;

  constructor(
    private readonly finished: (naturalEnd?: boolean) => void,
    private readonly activated: () => void,
    private readonly displayFullscreenExited: () => void = () => {},
  ) {
    document.addEventListener("click", () => {
      void this.audioCues.prepare().catch(() => {});
      void this.subAudioCues.prepare().catch(() => {});
    }, { capture: true });
    this.startButton.addEventListener("click", () => void this.toggle());
    this.dashboardStartButtons.forEach((button) => button.addEventListener("click", () => {
      if (this.dashboardUsesExternalSetting && !this.started && !this.running) this.prepare(true);
      void this.toggle();
    }));
    el<HTMLButtonElement>("timer-end").addEventListener("click", () => this.requestEnd());
    els<HTMLButtonElement>("dashboard-timer-end").forEach((button) => button.addEventListener("click", () => this.requestEnd()));
    el<HTMLButtonElement>("timer-end-confirm").addEventListener("click", () => this.forceEndFromConfirm());
    this.endConfirmDialog.addEventListener("close", () => {
      if (this.endConfirmDialog.returnValue !== "default") this.endWarningArmed = false;
    });
    this.resetButton.addEventListener("click", () => this.reset());
    els<HTMLButtonElement>("dashboard-timer-reset").forEach((button) => button.addEventListener("click", () => this.prepare(this.dashboardUsesExternalSetting)));
    el<HTMLButtonElement>("timer-fullscreen").addEventListener("click", () => void this.toggleFullscreen());
    el<HTMLButtonElement>("timer-ten").addEventListener("click", () => this.toggleSubTimer(10, "コールドカウント"));
    el<HTMLButtonElement>("timer-five").addEventListener("click", () => this.toggleSubTimer(5, "オーバーボール"));
    els<HTMLButtonElement>("dashboard-timer-ten").forEach((button) => button.addEventListener("click", () => this.toggleSubTimer(10, "コールドカウント")));
    els<HTMLButtonElement>("dashboard-timer-five").forEach((button) => button.addEventListener("click", () => this.toggleSubTimer(5, "オーバーボール")));
    this.step.addEventListener("change", () => {
      if (!this.dashboardUsesExternalSetting) this.dashboardSteps.forEach((step) => { step.value = this.step.value; });
      this.chooseStep();
    });
    this.dashboardSteps.forEach((step) => step.addEventListener("change", () => {
      this.step.value = step.value;
      this.dashboardSteps.forEach((other) => { other.value = step.value; });
      this.chooseStep();
    }));
    this.setupManualOptions();
    el<HTMLSelectElement>("manual-minute").addEventListener("change", () => this.syncManualSecondOptions());
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
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && this.running) {
        void this.requestWakeLock();
        void this.audioCues.prepare().then(() => {
          if (!this.running || !this.endAt) return;
          this.audioCues.scheduleMainCues(Math.max(0, (this.endAt - performance.now()) / 1000), this.total, true);
        }).catch(() => {});
      }
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
      if (!active && select.value.startsWith("preset-")) select.value = "1";
    };
    sync(this.step);
    this.dashboardSteps.forEach(sync);
    if (!active && this.fixedSeconds !== null) {
      this.fixedSeconds = null;
      this.randomStep = 1;
      this.reset();
    }
  }

  setSecret(active: boolean): void {
    this.secret = active;
    this.manualSeconds = this.clampManualSeconds(this.manualSeconds);
    this.setupManualOptions();
  }

  setHyogoMode(active: boolean): void {
    this.hyogoMode = active;
    this.manualSeconds = this.clampManualSeconds(this.manualSeconds);
    this.setupManualOptions();
    if (active) {
      this.randomStep = 5;
      this.step.value = "5";
      if (!this.dashboardUsesExternalSetting) this.dashboardSteps.forEach((step) => { step.value = "5"; });
    }
    if (!this.running && !this.started) this.reset();
  }

  setExternalTimerSetting(setting: ExternalTimerSetting | null): void {
    this.externalTimerSetting = setting;
    if (!this.running && !this.started && (this.randomStep === "gas" || this.dashboardUsesExternalSetting)) this.prepare(this.dashboardUsesExternalSetting);
  }

  setDashboardUsesExternalSetting(active: boolean): void {
    this.dashboardUsesExternalSetting = active;
    this.dashboardSteps.forEach((step) => {
      step.value = active ? "gas" : this.step.value;
      step.disabled = active || this.running;
    });
    if (active && !this.running && !this.started) this.prepare(true);
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
      if (!active && select.value === "tokyo") select.value = "1";
    };
    sync(this.step);
    this.dashboardSteps.forEach(sync);
    if (!active && this.randomStep === "tokyo") {
      this.randomStep = 1;
      this.reset();
    }
  }

  prepare(useExternalSetting = false): void {
    this.forceExternalForNextReset = useExternalSetting;
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
    this.elapsedTenCuePlayed = false;
    this.thirtyCuePlayed = false;
    this.remainingTenCuePlayed = false;
    this.remainingFiveSequencePlayed = false;
    this.total = 120;
    this.remaining = 120;
    this.mode.textContent = "試合準備完了";
    this.coldShown = false;
    this.coldUntil = 0;
    this.notice.textContent = "";
    this.clearSubTimer();
    this.dashboardOverride = null;
    this.syncControls();
    this.render();
    void this.releaseWakeLock();
  }

  displayText(): string {
    return this.time.textContent || "02 : 00";
  }

  preparedSeconds(): number {
    return this.total;
  }

  restorePreparedDuration(seconds: number): void {
    this.total = Math.max(1, Math.round(seconds));
    this.restartPreparedDuration();
  }

  restartPreparedDuration(): void {
    this.touchTimerState();
    this.clearStopWarning();
    this.endWarningArmed = false;
    if (this.endConfirmDialog.open) this.endConfirmDialog.close("cancel");
    this.running = false;
    this.started = false;
    this.notifiedFinish = false;
    this.endAt = 0;
    this.audioCues.stopScheduled();
    this.elapsedTenCuePlayed = false;
    this.thirtyCuePlayed = false;
    this.remainingTenCuePlayed = false;
    this.remainingFiveSequencePlayed = false;
    this.remaining = this.total;
    this.mode.textContent = "試合準備完了";
    this.coldShown = false;
    this.coldUntil = 0;
    this.notice.textContent = "";
    this.clearSubTimer();
    this.syncControls();
    this.render();
    void this.releaseWakeLock();
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
      if (!this.dashboardUsesExternalSetting) this.dashboardSteps.forEach((step) => { step.value = "tokyo"; });
      this.syncControls();
      this.render();
      void this.releaseWakeLock();
      return;
    }
    if (this.step.value === "gas") {
      this.fixedSeconds = null;
      this.randomStep = "gas";
      if (!this.dashboardUsesExternalSetting) this.dashboardSteps.forEach((step) => { step.value = "gas"; });
      this.reset();
      return;
    }
    if (this.step.value.startsWith("preset-")) {
      this.fixedSeconds = Number(this.step.value.replace("preset-", "")) || 120;
      this.randomStep = 1;
      this.reset();
      return;
    }
    this.fixedSeconds = null;
    this.randomStep = Number(this.step.value);
    this.reset();
  }

  private setupManualOptions(): void {
    this.manualSeconds = this.clampManualSeconds(this.manualSeconds);
    const maxMinutes = this.manualMaxMinutes();
    const minute = Math.min(Math.floor(this.manualSeconds / 60), maxMinutes);
    rangeOptions(el<HTMLSelectElement>("manual-minute"), maxMinutes, minute);
    this.syncManualSecondOptions();
  }

  private manualMaxMinutes(): number {
    return this.hyogoMode ? 2 : this.secret ? 120 : 2;
  }

  private manualMaxSecondsForMinute(minutes: number): number {
    return this.hyogoMode && minutes >= 2 ? 0 : 59;
  }

  private manualLimitSeconds(): number {
    return this.hyogoMode ? 120 : this.manualMaxMinutes() * 60 + 59;
  }

  private clampManualSeconds(seconds: number): number {
    return Math.max(1, Math.min(Math.round(seconds), this.manualLimitSeconds()));
  }

  private syncManualSecondOptions(): void {
    const minuteSelect = el<HTMLSelectElement>("manual-minute");
    const secondSelect = el<HTMLSelectElement>("manual-second");
    const minutes = Number(minuteSelect.value);
    const currentSeconds = Number(secondSelect.value || this.manualSeconds % 60);
    const maxSeconds = this.manualMaxSecondsForMinute(minutes);
    rangeOptions(secondSelect, maxSeconds, Math.min(currentSeconds, maxSeconds));
  }

  private applyManual(): void {
    this.touchTimerState();
    const minutes = Number(el<HTMLSelectElement>("manual-minute").value);
    const seconds = Number(el<HTMLSelectElement>("manual-second").value);
    this.manualSeconds = this.clampManualSeconds(minutes * 60 + seconds);
    this.randomStep = "manual";
    this.step.value = "manual";
    if (!this.dashboardUsesExternalSetting) this.dashboardSteps.forEach((step) => { step.value = "manual"; });
    this.reset();
  }

  private generatedDuration(): number {
    if (this.fixedSeconds !== null) return this.fixedSeconds;
    if (this.randomStep === "tokyo") return 120;
    if (this.forceExternalForNextReset || this.randomStep === "gas") {
      const setting = this.externalTimerSetting ?? defaultExternalTimerSetting("default");
      if (setting.mode === "fixed") return setting.fixedSeconds;
      const { minSeconds, maxSeconds, stepSeconds } = setting;
      const count = Math.floor((maxSeconds - minSeconds) / stepSeconds) + 1;
      return minSeconds + Math.floor(Math.random() * count) * stepSeconds;
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
    this.elapsedTenCuePlayed = false;
    this.thirtyCuePlayed = false;
    this.remainingTenCuePlayed = false;
    this.remainingFiveSequencePlayed = false;
    if (this.randomStep === "tokyo") {
      this.total = 120;
      this.remaining = 120;
      this.mode.textContent = "東京現在時刻";
      this.forceExternalForNextReset = false;
      this.syncControls();
      this.render();
      return;
    }
    this.total = this.initialReset ? 120 : this.generatedDuration();
    this.forceExternalForNextReset = false;
    this.initialReset = false;
    this.remaining = this.total;
    this.mode.textContent = "試合準備完了";
    this.coldShown = false;
    this.coldUntil = 0;
    this.notice.textContent = "";
    this.clearSubTimer();
    this.syncControls();
    this.render();
    void this.releaseWakeLock();
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
    this.activated();
    void this.enterFullscreen(true);
    const startAt = performance.now();
    this.lastFrame = startAt;
    this.endAt = startAt + this.remaining * 1000;
    this.running = true;
    this.started = true;
    this.mode.textContent = "試合進行中";
    this.caption.textContent = "";
    this.notice.textContent = this.coldUntil > performance.now() ? "ここからコールドが適応されます" : "";
    this.syncControls();
    this.render();
    void this.requestWakeLock();
    void this.audioCues.prepare().then(() => {
      if (!this.running || !this.endAt) return;
      this.audioCues.scheduleMainCues(Math.max(0, (this.endAt - performance.now()) / 1000), this.total, true);
    });
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
    void this.releaseWakeLock();
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
      this.notice.textContent = "タイマー作動中です。試合を中断する場合はもう一度「試合中断」を押してください。";
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
    this.scheduleAutoReset();
    this.syncControls();
    this.render();
    this.emitFinish(true, false);
    void this.releaseWakeLock();
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
      this.playElapsedTenCue();
      if (!this.coldShown && this.total - this.remaining >= 30) {
        this.coldShown = true;
        this.coldUntil = now + 10000;
        this.playThirtySecondCue();
      }
      this.playRemainingTenCue();
      this.playRemainingFiveSequenceCue();
      if (this.coldUntil > now) this.notice.textContent = "ここからコールドが適応されます";
      else if (this.endWarningArmed) this.notice.textContent = "タイマー作動中です。試合を中断する場合はもう一度「試合中断」を押してください。";
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
        this.scheduleAutoReset();
        this.syncControls();
        this.emitFinish(false, true);
        void this.releaseWakeLock();
      }
    }
    if (this.subRemaining > 0) {
      this.subRemaining = this.subEndAt
        ? Math.max(0, (this.subEndAt - now) / 1000)
        : Math.max(0, this.subRemaining - delta);
      if (this.subRemaining === 0) {
        this.clearSubTimer(false);
      }
    }
    this.render();
    requestAnimationFrame((next) => this.frame(next));
  }

  private async requestWakeLock(): Promise<void> {
    const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wakeLock || this.wakeLock && !this.wakeLock.released) return;
    try {
      this.wakeLock = await wakeLock.request("screen");
    } catch {
      this.wakeLock = null;
    }
  }

  private async releaseWakeLock(): Promise<void> {
    const current = this.wakeLock;
    this.wakeLock = null;
    try {
      await current?.release();
    } catch {
      // Wake Lock support varies by browser and power state.
    }
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
    this.audioCues.playElapsedThirty();
  }

  private playElapsedTenCue(): void {
    if (this.elapsedTenCuePlayed || this.total - this.remaining < 10) return;
    this.elapsedTenCuePlayed = true;
    if (this.audioCues.hasScheduledMainCues()) return;
    this.audioCues.playElapsedTen();
  }

  private playRemainingTenCue(): void {
    if (this.remaining > 10 || this.remaining <= 9 || this.remainingTenCuePlayed) return;
    this.remainingTenCuePlayed = true;
    if (this.audioCues.hasScheduledMainCues()) return;
    this.audioCues.playRemainingTen();
  }

  private playRemainingFiveSequenceCue(): void {
    if (this.remaining > 5 || this.remaining <= 4 || this.remainingFiveSequencePlayed) return;
    this.remainingFiveSequencePlayed = true;
    if (this.audioCues.hasScheduledMainCues()) return;
    this.audioCues.playRemainingFiveSequence();
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
    this.dashboardSteps.forEach((step) => { step.disabled = this.dashboardUsesExternalSetting || this.running; });
  }

  private clearStopWarning(): void {
    this.stopWarningArmed = false;
    if (this.stopWarningTimer) {
      window.clearTimeout(this.stopWarningTimer);
      this.stopWarningTimer = 0;
    }
    this.syncControls();
  }

  private toggleSubTimer(seconds: 10 | 5, label: string): void {
    this.touchTimerState();
    if (this.subRemaining > 0 && this.subCaption === label) {
      this.clearSubTimer();
      return;
    }
    const audioLead = this.subAudioCues.scheduleRefereeCountdown(seconds);
    void this.subAudioCues.prepare();
    this.subRemaining = seconds + audioLead;
    this.subEndAt = performance.now() + this.subRemaining * 1000;
    this.subCaption = label;
    this.subTime.classList.remove("hidden");
    toggleClass(this.dashboardSubTimes, "hidden", false);
    setText(this.dashboardSubCaptions, label);
    toggleClass(this.dashboardSubCaptions, "count", true);
    this.caption.classList.add("count");
    this.caption.textContent = label;
    this.render();
  }

  private clearSubTimer(stopAudio = true): void {
    if (stopAudio) this.subAudioCues.stopScheduled();
    this.subRemaining = 0;
    this.subEndAt = 0;
    this.subTime.classList.add("hidden");
    toggleClass(this.dashboardSubTimes, "hidden", true);
    setText(this.dashboardSubCaptions, "");
    toggleClass(this.dashboardSubCaptions, "count", false);
    this.caption.classList.remove("count");
    this.caption.textContent = "";
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
  private readonly center = this.shell.querySelector<HTMLElement>(".referee-center")!;
  private readonly label = el<HTMLElement>("referee-label");
  private readonly time = el<HTMLOutputElement>("referee-time");
  private readonly progress = el<HTMLProgressElement>("referee-progress");
  private readonly fullscreenButton = el<HTMLButtonElement>("referee-fullscreen");
  private total = 10;
  private remaining = 10;
  private running = false;
  private endAt = 0;
  private activeLabel = "10カウント / 5カウントを選択";
  private readonly audioCues = new TimerAudioCueController();

  constructor() {
    document.addEventListener("click", () => void this.audioCues.prepare().catch(() => {}), { capture: true });
    el<HTMLButtonElement>("referee-ten").addEventListener("click", () => this.start(10, "コールドカウント"));
    el<HTMLButtonElement>("referee-five").addEventListener("click", () => this.start(5, "オーバーボール"));
    el<HTMLButtonElement>("referee-reset").addEventListener("click", () => this.reset());
    this.center.addEventListener("click", () => {
      if (this.running) this.reset();
    });
    this.center.addEventListener("keydown", (event) => {
      if (!this.running || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      this.reset();
    });
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
    const audioLead = this.audioCues.scheduleRefereeCountdown(seconds);
    void this.audioCues.prepare();
    this.total = seconds;
    this.remaining = seconds;
    this.activeLabel = label;
    this.running = true;
    this.endAt = performance.now() + (seconds + audioLead) * 1000;
    this.render();
  }

  private reset(): void {
    this.audioCues.stopScheduled();
    this.total = 10;
    this.remaining = 10;
    this.running = false;
    this.endAt = 0;
    this.activeLabel = "10カウント / 5カウントを選択";
    this.render();
  }

  private frame(now: number): void {
    if (this.running) {
      this.remaining = this.endAt ? Math.min(this.total, Math.max(0, (this.endAt - now) / 1000)) : 0;
      if (this.remaining <= 0) {
        this.running = false;
        this.endAt = 0;
      }
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
    this.center.classList.toggle("referee-reset-active", this.running);
    this.center.tabIndex = this.running ? 0 : -1;
    if (this.running) {
      this.center.setAttribute("role", "button");
      this.center.setAttribute("aria-label", "カウントダウンをリセット");
      this.center.title = "タップしてリセット";
    } else {
      this.center.removeAttribute("role");
      this.center.removeAttribute("aria-label");
      this.center.removeAttribute("title");
    }
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
  private lastOrangeKey = "";
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

  setHyogoMode(_active: boolean): void {}

  beginWorkflow(match: number): void {
    this.workflowMatch = match;
    // Start each match from the initial layout. The operator must explicitly
    // draw the ball layout for every match.
    this.draw(this.defaults);
    el("balls-status").textContent = "";
    el<HTMLButtonElement>("balls-ready").classList.remove("hidden");
  }

  private reset(): void {
    this.draw(this.defaults);
    el("balls-status").textContent = "ボール配置を初期位置に戻しました。";
    if (this.workflowMatch) el("balls-ready").classList.add("hidden");
  }

  resetLayout(): void {
    this.draw(this.defaults);
    el("balls-status").textContent = "";
  }

  randomize(): void {
    let side: number[] = [];
    let purpleRow = 0;
    let orangeKey = "";
    let attempts = 0;
    do {
      side = this.leftRows.map(() => Math.round(Math.random()));
      purpleRow = Math.floor(Math.random() * 4);
      orangeKey = side.join("");
      attempts += 1;
    } while (orangeKey === this.lastOrangeKey && attempts < 8);
    if (orangeKey === this.lastOrangeKey) {
      side[0] = 1 - side[0];
      orangeKey = side.join("");
    }
    this.lastOrangeKey = orangeKey;
    const generated: Array<readonly [string, number, number]> = [];
    this.leftRows.forEach((row, index) => {
      generated.push(["orange", this.leftSlots[side[index]], row]);
      generated.push(["orange", this.rightSlots[1 - side[index]], this.rightRows[3 - index]]);
    });
    generated.push(["purple", this.leftSlots[1 - side[purpleRow]], this.leftRows[purpleRow]]);
    generated.push(["purple", this.rightSlots[side[purpleRow]], this.rightRows[3 - purpleRow]]);
    generated.push(["orange", 50.08, 49.99]);
    this.draw(generated);
    el("balls-status").textContent = this.workflowMatch
      ? `第${this.workflowMatch}マッチのボール配置を抽選しました。`
      : "ボール配置を生成しました。";
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

  snapshotLayout(): BallLayout {
    return Array.from(this.court.children).map((node) => {
      const ball = node as HTMLElement;
      const color = ball.classList.contains("purple") ? "purple" : "orange";
      return [color, Number.parseFloat(ball.style.left), Number.parseFloat(ball.style.top)] as const;
    });
  }

  restoreLayout(layout: BallLayout): void {
    const valid = layout.length === this.defaults.length && layout.every(([, x, y]) => Number.isFinite(x) && Number.isFinite(y));
    this.draw(valid ? layout : this.defaults);
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
    el<HTMLButtonElement>("balls-ready").classList.add("hidden");
  }
}

class RecordsController {
  private readonly storageKey = "tennis-assist-records-v1";
  private readonly progressStorageKey = `tennis-assist-series-progress-v1-${currentAppVariant().id}`;
  private readonly teamStorageKey = "tennis-assist-teams-v1";
  private readonly courtCountStorageKey = "tennis-assist-court-count-v1";
  private records: MatchRecord[] = [];
  private series: Series | null = null;
  private editing = 0;
  private agreedA = false;
  private agreedB = false;
  private finalized = false;
  private agreementPending: "a" | "b" | null = null;
  private agreementHoldTimer = 0;
  private awaitingNextMatch = false;
  private awaitingResultInput = false;
  private operationManaged = false;
  private completionResetTimer = 0;
  private retryingPendingSends = false;
  private readonly activeSeriesSends = new Map<string, Promise<NonNullable<MatchRecord["sendStatus"]>>>();
  private historyViewDirty = true;
  private teamPriorityCount = 0;
  private teamPriorityCache = new Map<string, { expiresAt: number; teams: string[]; priorityCount: number; courtCount: number | null }>();
  private pendingFinalMeta: FinalMetaSelection | null = null;
  private finalMetaHoldTimer = 0;

  constructor(private readonly flow: (event: FlowEvent, match?: number) => void, private readonly qrScanner: QrScanner) {
    this.records = this.loadRecords();
    this.loadTeams();
    this.loadCourtCount();
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
    const agreementAccept = el<HTMLButtonElement>("agreement-accept");
    agreementAccept.addEventListener("click", (event) => event.preventDefault());
    agreementAccept.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      agreementAccept.setPointerCapture?.(event.pointerId);
      this.startAgreementHold();
    });
    ["pointerup", "pointercancel"].forEach((eventName) => {
      agreementAccept.addEventListener(eventName, () => this.cancelAgreementHold());
    });
    agreementAccept.addEventListener("contextmenu", (event) => event.preventDefault());
    agreementAccept.addEventListener("keydown", (event) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        this.startAgreementHold();
      }
    });
    agreementAccept.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        this.cancelAgreementHold();
      }
    });
    el<HTMLButtonElement>("agreement-cancel").addEventListener("click", () => this.cancelAgreement());
    el<HTMLButtonElement>("finalize").addEventListener("click", () => void this.finalize());
    el<HTMLButtonElement>("final-meta-edit").addEventListener("click", () => this.toggleFinalMetaEditor(true));
    el<HTMLButtonElement>("final-meta-save").addEventListener("click", () => this.confirmFinalMetaSelection());
    const finalMetaHold = el<HTMLButtonElement>("final-meta-confirm-hold");
    finalMetaHold.addEventListener("click", (event) => event.preventDefault());
    finalMetaHold.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      finalMetaHold.setPointerCapture?.(event.pointerId);
      this.startFinalMetaHold();
    });
    ["pointerup", "pointercancel"].forEach((eventName) => {
      finalMetaHold.addEventListener(eventName, () => this.cancelFinalMetaHold());
    });
    finalMetaHold.addEventListener("contextmenu", (event) => event.preventDefault());
    finalMetaHold.addEventListener("keydown", (event) => {
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      this.startFinalMetaHold();
    });
    finalMetaHold.addEventListener("keyup", () => this.cancelFinalMetaHold());
    el<HTMLDialogElement>("final-meta-confirm-dialog").addEventListener("close", () => this.cancelFinalMetaHold(true));
    el<HTMLButtonElement>("completion-reset").addEventListener("click", () => this.returnHomeAfterCompletion());
    el<HTMLSelectElement>("stats-team").addEventListener("change", () => this.syncTeamHistoryFilter());
    el<HTMLSelectElement>("stats-period").addEventListener("change", () => this.renderHistory());
    ["history-team", "history-result", "history-kind", "history-sort", "history-send-reason"].forEach((id) => {
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
    el<HTMLButtonElement>("history-unsent-export").addEventListener("click", () => this.exportUnsentHistory());
    el<HTMLButtonElement>("history-import").addEventListener("click", () => el<HTMLInputElement>("history-file").click());
    el<HTMLButtonElement>("history-sheet-import").addEventListener("click", () => void this.importHistoryFromSpreadsheet());
    el<HTMLButtonElement>("history-sheet-scan").addEventListener("click", () => void this.importHistoryFromSpreadsheetQr());
    el<HTMLInputElement>("history-file").addEventListener("change", (event) => void this.importHistory(event));
    el<HTMLButtonElement>("history-clear").addEventListener("click", () => this.confirmClearHistory());
    el<HTMLButtonElement>("history-retry-all").addEventListener("click", () => void this.retryPendingSends("manual"));
    el<HTMLButtonElement>("history-clear-confirm").addEventListener("click", () => this.clearHistory());
    window.addEventListener("online", () => void this.retryPendingSends("online"));
    if (!this.restoreSeriesProgress()) this.resetSeries(false);
    this.renderSyncAlert();
    if (navigator.onLine && this.syncSummary().unsent) window.setTimeout(() => void this.retryPendingSends("startup"), 1200);
  }

  openHistoryView(): void {
    if (!this.historyViewDirty) return;
    this.renderHistory();
  }

  portableState(): { teams: string[]; courtCount: number | null } {
    const savedCourtCount = Number(localStorage.getItem(this.courtCountStorageKey) || "");
    return { teams: [...teams], courtCount: savedCourtCount || (activeCourtOptions.length < courtOptions.length ? activeCourtOptions.length : null) };
  }

  persistCurrentTeams(): void {
    localStorage.setItem(this.teamStorageKey, JSON.stringify(teams));
    const courtCount = activeCourtOptions.length < courtOptions.length ? activeCourtOptions.length : null;
    if (courtCount) localStorage.setItem(this.courtCountStorageKey, String(courtCount));
    else localStorage.removeItem(this.courtCountStorageKey);
    el("team-status").textContent = `${teams.length}チームと${courtRangeLabel()}をこの端末に保存しました。`;
  }

  applyPortableState(value: unknown): void {
    const data = (value && typeof value === "object" ? value : {}) as { teams?: unknown; courtCount?: unknown };
    if (Array.isArray(data.teams) && data.teams.length >= 2) this.applyTeams(data.teams.map(String), true, `端末設定QRから${data.teams.length}チームを読み込みました。`);
    const courtCount = Number(data.courtCount);
    if (Number.isFinite(courtCount) && courtCount >= 1) this.applyCourtCount(courtCount);
  }

  private refreshHistoryView(): void {
    if (document.getElementById("screen-records")?.classList.contains("active")) {
      this.renderHistory();
      return;
    }
    this.historyViewDirty = true;
    this.renderSyncAlert();
  }

  syncSummary(): SyncSummary {
    let pending = 0;
    let failed = 0;
    let oldestUnsentAt = 0;
    for (const record of this.records) {
      if (isSheetPreviewRecord(record) || !this.isSendableSeriesResult(record)) continue;
      if (record.sendStatus === "pending" || record.sendStatus === "failed") {
        if (record.sendStatus === "pending") pending += 1;
        if (record.sendStatus === "failed") failed += 1;
        const changedAt = Date.parse(record.sendStatusChangedAt || record.timestamp || "");
        const effectiveAt = Number.isFinite(changedAt) ? changedAt : Date.now();
        oldestUnsentAt = oldestUnsentAt ? Math.min(oldestUnsentAt, effectiveAt) : effectiveAt;
      }
    }
    const settings = AdminController.settings();
    const connectionVerified = Boolean(settings.gasConnectedAt && settings.gasConnectedUrl && settings.gasConnectedUrl === settings.gasUrl && settings.apiKey);
    const configured = settings.gasUrl.endsWith("/exec") && Boolean(settings.apiKey) && connectionVerified;
    const latestFailed = this.records.find((record) => !isSheetPreviewRecord(record) && this.isSendableSeriesResult(record) && record.sendStatus === "failed" && record.sendError);
    return {
      pending,
      failed,
      unsent: pending + failed,
      configured,
      gasText: configured ? "GAS接続: 確認済み" : "GAS接続: 未確認",
      reason: this.sendIssueReason(settings, latestFailed?.sendError),
      oldestUnsentAt,
    };
  }

  teamOptions(): string[] {
    return [...teams];
  }

  priorityTeamCount(): number {
    return this.teamPriorityCount;
  }

  clearTeamPriority(): void {
    this.teamPriorityCount = 0;
  }

  nextSeriesNumberForCourt(court: string): number {
    return this.nextSeriesNumber(court);
  }

  private sendIssueReason(settings: AdminSettings, latestError = ""): string {
    if (!settings.sendEnabled) return "送信OFF";
    if (!settings.gasUrl.endsWith("/exec")) return "GAS URL未設定";
    if (!settings.apiKey) return "APIキー未入力";
    if (/invalid_api_key|api|key|認証|unauthorized|forbidden|invalid/i.test(latestError)) return "APIキー不一致";
    if (/gas_request_timeout|timeout|timed out|タイムアウト/i.test(latestError)) return "GAS応答タイムアウト";
    if (!navigator.onLine) return "ネットワーク";
    if (/failed to fetch|network|ネットワーク|fetch/i.test(latestError)) return "ネットワーク";
    if (!settings.gasConnectedAt || settings.gasConnectedUrl !== settings.gasUrl) return "GAS未接続";
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

  operationResumeState(): { match: number; step: "draw" | "result" | "between" | "final"; finalized: boolean } | null {
    if (!this.series || !this.operationManaged) return null;
    if (this.series.records.length >= 3) return { match: 3, step: "final", finalized: this.finalized };
    const match = Math.min(this.series.records.length + 1, 3);
    if (this.awaitingResultInput) return { match, step: "result", finalized: false };
    return { match, step: this.awaitingNextMatch ? "between" : "draw", finalized: false };
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

  startSeriesForOperation(teamA: string, teamB: string, court: string, matchType: MatchType): boolean {
    el<HTMLSelectElement>("team-a").value = teamA;
    el<HTMLSelectElement>("team-b").value = teamB;
    el<HTMLSelectElement>("court-select").value = court;
    this.operationManaged = true;
    this.startSeries(matchType);
    return Boolean(this.series);
  }

  continueForOperation(): void {
    this.continueToNextMatch();
  }

  resetForOperation(): void {
    this.completeSeriesReset();
  }

  pauseForOperation(): boolean {
    return Boolean(this.series && this.operationManaged && this.persistSeriesProgress());
  }

  hasCompletedOperationMatch(): boolean {
    return Boolean(this.series && this.operationManaged && this.series.records.length > 0);
  }

  operationProgressSnapshot(): PersistedSeriesProgress | null {
    if (!this.series || !this.operationManaged) return null;
    return structuredClone({
      series: this.series,
      editing: this.editing,
      agreedA: this.agreedA,
      agreedB: this.agreedB,
      finalized: this.finalized,
      awaitingNextMatch: this.awaitingNextMatch,
      awaitingResultInput: this.awaitingResultInput,
      operationManaged: this.operationManaged,
      savedAt: timestamp(),
    });
  }

  restoreOperationProgress(progress: PersistedSeriesProgress): boolean {
    const series = progress?.series;
    if (!series?.id || !series.teamA || !series.teamB || !Array.isArray(series.records) || progress.operationManaged !== true) return false;
    this.series = structuredClone(series);
    this.editing = Number(progress.editing) || 0;
    this.agreedA = progress.agreedA === true;
    this.agreedB = progress.agreedB === true;
    this.finalized = progress.finalized === true;
    this.awaitingNextMatch = progress.awaitingNextMatch === true;
    this.awaitingResultInput = progress.awaitingResultInput === true;
    this.operationManaged = true;
    this.resetInput();
    this.renderSeries();
    this.renderAgreement();
    this.updateRecordVisibility();
    return this.persistSeriesProgress();
  }

  currentOperationSeriesId(): string {
    return this.operationManaged ? this.series?.id ?? "" : "";
  }

  discardOperationProgress(seriesId: string): void {
    if (seriesId && this.operationManaged && this.series?.id === seriesId) this.completeSeriesReset();
  }

  operationInputSnapshot(): RecordInputSnapshot {
    return {
      reasonCategory: el<HTMLSelectElement>("reason-category").value,
      endReason: el<HTMLSelectElement>("end-reason").value,
      targetTeam: el<HTMLSelectElement>("target-team").value,
      aOrange: el<HTMLSelectElement>("a-orange").value,
      aPurple: el<HTMLSelectElement>("a-purple").value,
      bOrange: el<HTMLSelectElement>("b-orange").value,
      bPurple: el<HTMLSelectElement>("b-purple").value,
    };
  }

  restoreOperationInput(snapshot: RecordInputSnapshot): void {
    el<HTMLSelectElement>("reason-category").value = snapshot.reasonCategory;
    this.refreshEndReasons();
    el<HTMLSelectElement>("end-reason").value = snapshot.endReason;
    el<HTMLSelectElement>("target-team").value = snapshot.targetTeam;
    el<HTMLSelectElement>("a-orange").value = snapshot.aOrange;
    el<HTMLSelectElement>("a-purple").value = snapshot.aPurple;
    el<HTMLSelectElement>("b-orange").value = snapshot.bOrange;
    el<HTMLSelectElement>("b-purple").value = snapshot.bPurple;
    this.renderScores();
  }

  returnHomeAfterCompletion(): void {
    this.clearCompletionResetTimer();
    this.completeSeriesReset();
    document.dispatchEvent(new CustomEvent("series-home-requested"));
  }

  timerFinished(): void {
    if (!this.series || this.isFinished()) return;
    this.awaitingNextMatch = false;
    this.awaitingResultInput = true;
    this.persistSeriesProgress();
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
    options(el<HTMLSelectElement>("court-select"), activeCourtOptions, activeCourtOptions[0]);
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

  private startSeries(matchType = AdminController.settings().matchType): void {
    const teamA = el<HTMLSelectElement>("team-a").value;
    const teamB = el<HTMLSelectElement>("team-b").value;
    if (teamA === teamB) {
      el("record-status").textContent = "同じチーム同士では開始できません。";
      return;
    }
    const court = el<HTMLSelectElement>("court-select").value;
    const seriesNumber = this.nextSeriesNumber(court);
    this.series = { id: `${court}_${String(seriesNumber).padStart(2, "0")}_${Date.now()}`, court, seriesNumber, matchType, teamA, teamB, records: [] };
    this.editing = 0;
    this.agreedA = false;
    this.agreedB = false;
    this.finalized = false;
    this.agreementPending = null;
    this.awaitingNextMatch = false;
    this.awaitingResultInput = false;
    this.clearCompletionResetTimer();
    this.setCompletionPanel(false);
    this.setNextMatchPrompt(false);
    this.resetInput();
    this.renderSeries();
    this.updateRecordVisibility();
    el("record-status").textContent = "対戦カードを開始しました。ボール配置から進行します。";
    this.flow("start", 1);
    this.persistSeriesProgress();
  }

  private resetSeries(notify = true): void {
    this.series = null;
    this.editing = 0;
    this.agreedA = false;
    this.agreedB = false;
    this.finalized = false;
    this.agreementPending = null;
    this.awaitingNextMatch = false;
    this.awaitingResultInput = false;
    this.operationManaged = false;
    localStorage.removeItem(this.progressStorageKey);
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

  private ballInputIssue(): string {
    const orangeTotal = Number(el<HTMLSelectElement>("a-orange").value) + Number(el<HTMLSelectElement>("b-orange").value);
    if (orangeTotal !== 8 && orangeTotal !== 9) return "オレンジボールの合計は、終了理由に関係なく8個または9個にしてください。";
    const purpleTotal = Number(el<HTMLSelectElement>("a-purple").value) + Number(el<HTMLSelectElement>("b-purple").value);
    if (purpleTotal !== 2) return "紫ボールの合計は、終了理由に関係なく必ず2個にしてください。";
    return "";
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
    const issue = this.ballInputIssue();
    const score = this.scoreData();
    const swapped = this.resultSidesSwapped();
    const leftScore = swapped ? score.teamBScore : score.teamAScore;
    const rightScore = swapped ? score.teamAScore : score.teamBScore;
    [el("a-score"), el("b-score"), el("winner-preview")].forEach((node) => node.classList.toggle("score-error", Boolean(issue)));
    const saveButton = el<HTMLButtonElement>("record-save");
    saveButton.classList.toggle("input-error", Boolean(issue));
    saveButton.setAttribute("aria-disabled", issue ? "true" : "false");
    saveButton.title = issue ? "入力エラーがあります。ボール数を確認してください。" : "";
    this.renderRecordInputStep(issue);
    if (issue) {
      el("a-score").textContent = "得点 エラー";
      el("b-score").textContent = "得点 エラー";
      el("winner-preview").textContent = "入力エラー: ボール数を確認してください。";
      return;
    }
    el("a-score").textContent = `得点 ${leftScore}`;
    el("b-score").textContent = `得点 ${rightScore}`;
    el("winner-preview").textContent = `${leftScore} VS ${rightScore} / 勝者: ${score.winner}`;
  }

  private renderRecordInputStep(issue = this.ballInputIssue()): void {
    const category = el<HTMLSelectElement>("reason-category").value as Category;
    const targetTeam = el<HTMLSelectElement>("target-team").value;
    const step = category !== scoringCategory && targetTeam === "対象チーム未選択" ? 1 : issue ? 2 : 3;
    const root = el("record-input");
    root.classList.toggle("record-step-1", step === 1);
    root.classList.toggle("record-step-2", step === 2);
    root.classList.toggle("record-step-3", step === 3);
    root.classList.toggle("record-step-1-done", step > 1);
    root.classList.toggle("record-step-2-done", step > 2);
  }

  private buildRecord(): MatchRecord | null {
    if (!this.series) return null;
    const category = el<HTMLSelectElement>("reason-category").value as Category;
    if (category !== scoringCategory && el<HTMLSelectElement>("target-team").value === "対象チーム未選択") {
      el("record-status").textContent = "違反したチームを選択してください。";
      return null;
    }
    const issue = this.ballInputIssue();
    if (issue) {
      el("record-status").textContent = issue;
      return null;
    }
    const matchNumber = this.inputMatchNumber();
    const counts = this.resultInputCounts(matchNumber);
    const competitionId = `${courtCompetitionCode(this.series.court)}_${String(this.series.seriesNumber).padStart(2, "0")}_${matchNumber}`;
    return {
      recordId: `${this.series.id}_match_${matchNumber}`,
      timestamp: timestamp(),
      deviceId: shortDeviceId(),
      deviceRole: AdminController.settings().deviceRole,
      appVersion: __APP_VERSION__,
      recordKind: "マッチ",
      seriesId: this.series.id,
      seriesNumber: this.series.seriesNumber,
      court: this.series.court,
      competitionId,
      matchNumber,
      matchType: this.series.matchType,
      teamA: this.series.teamA,
      teamB: this.series.teamB,
      reasonCategory: category,
      endReason: el<HTMLSelectElement>("end-reason").value,
      ...counts,
      notes: "端末内保存・最終結果確定時にまとめて送信",
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
      `<section class="confirm-decision compact"><div class="confirm-decision-winner"><span>勝者</span><strong>${escapeText(record.winner)}</strong></div><div class="confirm-decision-score"><span>得点</span><strong>${scoreLine}</strong></div></section>` +
      `<p class="confirm-match">第${record.matchNumber}マッチ / ${escapeText(record.teamA)} vs ${escapeText(record.teamB)}</p>` +
      `<p class="${violation ? "confirm-reason warning" : "confirm-reason"}"><span>終了カテゴリ / 終了理由</span><strong>${escapeText(record.reasonCategory)}</strong><em>${escapeText(record.endReason)}</em></p>` +
      violationNotice +
      `<div class="confirm-score-grid"><p><span>${escapeText(record.teamA)}</span><strong>${record.teamAScore}点</strong><small><b class="confirm-orange">オレンジ ${record.teamAOrange}個</b><b class="confirm-purple">紫 ${record.teamAPurple}個</b></small></p><p><span>${escapeText(record.teamB)}</span><strong>${record.teamBScore}点</strong><small><b class="confirm-orange">オレンジ ${record.teamBOrange}個</b><b class="confirm-purple">紫 ${record.teamBPurple}個</b></small></p></div>`;
    el<HTMLDialogElement>("confirm-dialog").showModal();
  }

  private save(): void {
    const record = this.buildRecord();
    if (!record || !this.series) return;
    if (!this.storageWriteAvailable()) {
      this.showStorageFailure();
      return;
    }
    const previousRecords = [...this.records];
    const previousSeriesRecords = [...this.series.records];
    const previousEditing = this.editing;
    const previousAgreedA = this.agreedA;
    const previousAgreedB = this.agreedB;
    const previousAwaitingResultInput = this.awaitingResultInput;
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
    this.awaitingResultInput = false;
    if (!this.saveStoredRecords() || !this.persistSeriesProgress()) {
      this.records = previousRecords;
      this.series.records = previousSeriesRecords;
      this.editing = previousEditing;
      this.agreedA = previousAgreedA;
      this.agreedB = previousAgreedB;
      this.awaitingResultInput = previousAwaitingResultInput;
      this.restoreStoredRecords(previousRecords);
      this.showStorageFailure();
      this.renderSeries();
      return;
    }
    this.resetInput();
    this.renderSeries();
    this.renderHistory();
    const savedMatch = record.matchNumber;
    if (this.isFinished()) {
      el("record-status").textContent = `第${record.matchNumber}マッチを端末内に保存しました。代表同意後、最終結果確定時にまとめて送信します。`;
      this.awaitingNextMatch = false;
      this.setNextMatchPrompt(false);
      this.renderAgreement();
      this.updateRecordVisibility();
      el("final-results").scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      el("record-status").textContent = `第${record.matchNumber}マッチを端末内に保存しました。最終結果確定時にまとめて送信します。次のマッチの準備をしてください。`;
      this.awaitingNextMatch = true;
      this.setNextMatchPrompt(true);
      this.updateRecordVisibility();
      el("next-match-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    this.persistSeriesProgress();
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
    this.awaitingResultInput = false;
    this.persistSeriesProgress();
    this.setNextMatchPrompt(false);
    this.updateRecordVisibility();
    this.flow("next", this.nextMatch());
  }

  private beginByeMatch(): void {
    if (!this.series || this.isFinished() || !this.awaitingNextMatch) return;
    const match = this.nextMatch();
    if (!window.confirm("本当に不戦勝にしますか？")) return;
    this.awaitingNextMatch = false;
    this.awaitingResultInput = true;
    this.setNextMatchPrompt(false);
    this.editing = 0;
    this.persistSeriesProgress();
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
    this.persistSeriesProgress();
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
    el("intermediate-summary").textContent = entries.length ? "現在の中間結果です。誤入力の場合は再入力ボタンを押してください。" : "第1マッチの保存後に中間結果が表示されます。";
    this.renderFinal();
  }

  private updateRecordVisibility(): void {
    const hasSeries = Boolean(this.series);
    const entries = this.series?.records.length ?? 0;
    const finished = Boolean(this.series && this.isFinished());
    el("team-management-panel").classList.toggle("hidden", currentAppVariant().id === "venue" || hasSeries);
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
      if (isRankingViolation(record.reasonCategory, record.endReason) && record.targetTeam === this.series?.teamA) sum.teamAViolations += 1;
      if (isRankingViolation(record.reasonCategory, record.endReason) && record.targetTeam === this.series?.teamB) sum.teamBViolations += 1;
      return sum;
    }, empty);
  }

  private overallDecision(sum: Summary): OverallDecision {
    return decideOverallWinner(this.series?.matchType ?? "予選", sum);
  }

  private overallWinner(sum: Summary): "a" | "b" | "draw" {
    return this.overallDecision(sum).side;
  }

  private decisionNote(decision: OverallDecision): string {
    if (decision.basis === "violations") return "勝利マッチ数が同数のため、3マッチ合計の違反数で判定しました。";
    if (decision.basis === "score") return "勝利マッチ数・違反数が同じため、3マッチ合計の得点で判定しました。";
    if (decision.basis === "purple") return "勝利マッチ数・違反数・得点が同じため、3マッチ合計の紫の取得数で判定しました。";
    return "";
  }

  private finalSummaryHtml(sum: Summary, winner: "a" | "b" | "draw"): string {
    if (!this.series) return escapeText("3マッチ終了後、最終試合結果を確認できます。");
    const score = `${sum.teamAWins} VS ${sum.teamBWins}`;
    if (!this.isFinished()) {
      return `<span class="final-result-label">途中集計</span><strong class="final-result-score">${score}</strong><span class="final-result-note">引き分け ${sum.draws} / 3マッチ終了後に最終結果を確認できます。</span>`;
    }
    const result = winner === "draw" ? "引き分け" : `${winner === "a" ? this.series.teamA : this.series.teamB}チームの勝利`;
    const decisionNote = this.decisionNote(this.overallDecision(sum));
    const note = decisionNote ? `<span class="final-result-note">${escapeText(decisionNote)}</span>` : "";
    return `<span class="final-result-label">最終試合結果</span><strong class="final-result-score">${score}</strong><span class="final-result-winner">で ${escapeText(result)}</span>${note}`;
  }

  private matchViolationCount(record: MatchRecord, team: string): number {
    if (record.reasonCategory !== scoringCategory && !isRankingViolation(record.reasonCategory, record.endReason)) return 0;
    if (isRankingViolation(record.reasonCategory, record.endReason) && record.targetTeam === team) return 1;
    if (isRankingViolation(record.reasonCategory, record.endReason)) {
      if (team === record.teamA && record.teamAScore === 9 && record.teamBScore === -4) return 1;
      if (team === record.teamB && record.teamBScore === 9 && record.teamAScore === -4) return 1;
    }
    if (team === record.teamA) return record.teamAViolations ?? 0;
    if (team === record.teamB) return record.teamBViolations ?? 0;
    return 0;
  }

  private renderFinal(): void {
    const matches = el<HTMLTableElement>("final-matches");
    this.renderFinalMeta();
    matches.innerHTML = "<thead><tr><th>マッチ</th><th>終了理由</th><th>チーム別結果</th><th>勝敗結果</th><th></th></tr></thead>";
    const table = el<HTMLTableElement>("final-table");
    table.innerHTML = "<thead><tr><th>チーム</th><th>勝利数</th><th>総オレンジ</th><th>総紫</th><th>違反</th><th>総得点</th><th>勝敗（3マッチ合計）</th></tr></thead>";
    if (!this.series?.records.length) {
      el("final-summary").textContent = "3マッチ終了後、最終試合結果を確認できます。";
      el("series-finished").classList.add("hidden");
      this.setCompletionPanel(false);
      return;
    }
    const matchesBody = matches.createTBody();
    const canReinput = !(this.agreedA && this.agreedB) && !this.finalized;
    this.series.records.forEach((record) => {
      const teamAViolations = this.matchViolationCount(record, record.teamA);
      const teamBViolations = this.matchViolationCount(record, record.teamB);
      const row = matchesBody.insertRow();
      row.className = "win";
      row.innerHTML = `<td>第${record.matchNumber}マッチ</td><td>${escapeText(record.endReason)}</td><td><div class="final-match-team"><strong>${escapeText(record.teamA)}</strong><span>オレンジ ${record.teamAOrange} / 紫 ${record.teamAPurple} / 得点 ${record.teamAScore} / 違反 ${teamAViolations}</span></div><div class="final-match-team"><strong>${escapeText(record.teamB)}</strong><span>オレンジ ${record.teamBOrange} / 紫 ${record.teamBPurple} / 得点 ${record.teamBScore} / 違反 ${teamBViolations}</span></div></td><td>勝者: ${escapeText(record.winner)}</td><td>${canReinput ? `<button class="button tiny">再入力</button>` : ""}</td>`;
      if (canReinput) row.querySelector("button")?.addEventListener("click", () => this.editRecord(record.matchNumber));
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

  private renderFinalMeta(): void {
    const meta = el("final-series-meta");
    meta.classList.toggle("hidden", !this.series);
    if (!this.series) return;
    el("final-court-label").textContent = this.series.court;
    el("final-match-type-label").textContent = this.series.matchType;
    const courtSelect = el<HTMLSelectElement>("final-court-select");
    const typeSelect = el<HTMLSelectElement>("final-match-type-select");
    const teamASelect = el<HTMLSelectElement>("final-team-a-select");
    const teamBSelect = el<HTMLSelectElement>("final-team-b-select");
    options(courtSelect, activeCourtOptions, this.series.court);
    const matchTypes = Array.from(new Set([this.series.matchType, ...operationMatchTypes]));
    options(typeSelect, matchTypes, this.series.matchType);
    const teamChoices = Array.from(new Set([this.series.teamA, this.series.teamB, ...teams]));
    options(teamASelect, teamChoices, this.series.teamA);
    options(teamBSelect, teamChoices, this.series.teamB);
  }

  private toggleFinalMetaEditor(active: boolean): void {
    if (!this.series) return;
    this.renderFinalMeta();
    el("final-meta-editor").classList.toggle("hidden", !active);
  }

  private confirmFinalMetaSelection(): void {
    if (!this.series) return;
    const selection: FinalMetaSelection = {
      court: el<HTMLSelectElement>("final-court-select").value,
      matchType: normalizeMatchType(el<HTMLSelectElement>("final-match-type-select").value),
      teamA: el<HTMLSelectElement>("final-team-a-select").value.trim(),
      teamB: el<HTMLSelectElement>("final-team-b-select").value.trim(),
    };
    if (!selection.teamA || !selection.teamB || selection.teamA === selection.teamB) {
      el("record-status").textContent = "左右で別のチームを選択してください。";
      return;
    }
    this.pendingFinalMeta = selection;
    el("final-meta-confirm-detail").innerHTML = [
      ["コート", this.series.court, selection.court],
      ["試合種別", this.series.matchType, selection.matchType],
      ["左側チーム", this.series.teamA, selection.teamA],
      ["右側チーム", this.series.teamB, selection.teamB],
    ].map(([label, before, after]) => `<p><span>${escapeText(label)}</span><strong>${escapeText(before)}</strong><b>→</b><strong>${escapeText(after)}</strong></p>`).join("");
    el<HTMLDialogElement>("final-meta-confirm-dialog").showModal();
  }

  private startFinalMetaHold(): void {
    if (!this.pendingFinalMeta || this.finalMetaHoldTimer) return;
    const button = el<HTMLButtonElement>("final-meta-confirm-hold");
    button.classList.add("is-holding");
    this.finalMetaHoldTimer = window.setTimeout(() => {
      this.finalMetaHoldTimer = 0;
      button.classList.remove("is-holding");
      this.applyFinalMetaSelection();
    }, holdConfirmDurationMs);
  }

  private cancelFinalMetaHold(clearPending = false): void {
    if (this.finalMetaHoldTimer) {
      window.clearTimeout(this.finalMetaHoldTimer);
      this.finalMetaHoldTimer = 0;
    }
    el<HTMLButtonElement>("final-meta-confirm-hold").classList.remove("is-holding");
    if (clearPending) this.pendingFinalMeta = null;
  }

  private renameRecordTeams(record: MatchRecord, oldA: string, oldB: string, nextA: string, nextB: string): void {
    const rename = (value: string | undefined): string | undefined => value === oldA ? nextA : value === oldB ? nextB : value;
    record.teamA = rename(record.teamA) ?? record.teamA;
    record.teamB = rename(record.teamB) ?? record.teamB;
    record.winner = rename(record.winner) ?? record.winner;
    record.targetTeam = rename(record.targetTeam) ?? record.targetTeam;
    record.overallWinner = rename(record.overallWinner);
    if (record.notes) {
      const tokenA = "__TEAM_A_BEFORE_RENAME__";
      const tokenB = "__TEAM_B_BEFORE_RENAME__";
      record.notes = record.notes
        .split(oldA).join(tokenA)
        .split(oldB).join(tokenB)
        .split(tokenA).join(nextA)
        .split(tokenB).join(nextB);
    }
  }

  private applyFinalMetaSelection(): void {
    if (!this.series || !this.pendingFinalMeta) return;
    const selection = this.pendingFinalMeta;
    const oldA = this.series.teamA;
    const oldB = this.series.teamB;
    const previousSeries: Series = { ...this.series, records: this.series.records.map((record) => ({ ...record })) };
    const previousRecords = this.records.map((record) => ({ ...record }));
    this.series.court = selection.court;
    this.series.matchType = selection.matchType;
    this.series.teamA = selection.teamA;
    this.series.teamB = selection.teamB;
    const updatedRecords = new Set<MatchRecord>();
    this.series.records.forEach((record) => {
      this.renameRecordTeams(record, oldA, oldB, selection.teamA, selection.teamB);
      record.court = selection.court;
      record.matchType = selection.matchType;
      record.competitionId = record.matchNumber === 0
        ? `${courtCompetitionCode(selection.court)}_${String(record.seriesNumber).padStart(2, "0")}_RESULT`
        : `${courtCompetitionCode(selection.court)}_${String(record.seriesNumber).padStart(2, "0")}_${record.matchNumber}`;
      updatedRecords.add(record);
    });
    this.records.filter((record) => record.seriesId === this.series?.id).forEach((record) => {
      if (updatedRecords.has(record)) return;
      this.renameRecordTeams(record, oldA, oldB, selection.teamA, selection.teamB);
      record.court = selection.court;
      record.matchType = selection.matchType;
      record.competitionId = record.matchNumber === 0
        ? `${courtCompetitionCode(selection.court)}_${String(record.seriesNumber).padStart(2, "0")}_RESULT`
        : `${courtCompetitionCode(selection.court)}_${String(record.seriesNumber).padStart(2, "0")}_${record.matchNumber}`;
    });
    this.agreedA = false;
    this.agreedB = false;
    if (!this.saveStoredRecords() || !this.persistSeriesProgress()) {
      this.series = previousSeries;
      this.records = previousRecords;
      this.restoreStoredRecords(previousRecords);
      this.showStorageFailure();
      this.renderFinal();
      return;
    }
    el<HTMLSelectElement>("team-a").value = selection.teamA;
    el<HTMLSelectElement>("team-b").value = selection.teamB;
    el<HTMLSelectElement>("operation-team-a").value = selection.teamA;
    el<HTMLSelectElement>("operation-team-b").value = selection.teamB;
    this.pendingFinalMeta = null;
    el<HTMLDialogElement>("final-meta-confirm-dialog").close();
    this.toggleFinalMetaEditor(false);
    this.renderSeries();
    this.renderHistory();
    el("record-status").textContent = "試合情報の修正を反映しました。両チームでもう一度確認してください。";
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
    agreeA.textContent = `${this.series.teamA} 代表：${this.agreedA ? "同意済み" : "同意する"}`;
    agreeB.textContent = `${this.series.teamB} 代表：${this.agreedB ? "同意済み" : "同意する"}`;
    agreeA.classList.toggle("agreed", this.agreedA);
    agreeB.classList.toggle("agreed", this.agreedB);
    agreeA.disabled = this.agreedA || this.finalized;
    agreeB.disabled = this.agreedB || this.finalized;
    const finalizeButton = el<HTMLButtonElement>("finalize");
    const canFinalize = this.agreedA && this.agreedB && !this.finalized;
    finalizeButton.disabled = !canFinalize;
    finalizeButton.classList.toggle("ready", canFinalize);
    finalizeButton.setAttribute("aria-disabled", String(!canFinalize));
  }

  private requestAgreement(side: "a" | "b"): void {
    if (!this.series || !this.isFinished() || this.finalized || (side === "a" ? this.agreedA : this.agreedB)) return;
    this.renderFinal();
    this.agreementPending = side;
    const team = side === "a" ? this.series.teamA : this.series.teamB;
    el("agreement-confirm-team").textContent = `${team} 代表が確認しています。各マッチの得点・違反数・勝者をもう一度確認してください。`;
    el<HTMLButtonElement>("agreement-accept").textContent = "1秒長押しで結果に同意";
    el("agreement-confirm").classList.remove("hidden");
  }

  private startAgreementHold(): void {
    if (!this.agreementPending || this.agreementHoldTimer) return;
    const button = el<HTMLButtonElement>("agreement-accept");
    button.classList.add("is-holding");
    this.agreementHoldTimer = window.setTimeout(() => {
      this.agreementHoldTimer = 0;
      button.classList.remove("is-holding");
      this.acceptAgreement();
    }, holdConfirmDurationMs);
  }

  private cancelAgreementHold(): void {
    if (this.agreementHoldTimer) {
      window.clearTimeout(this.agreementHoldTimer);
      this.agreementHoldTimer = 0;
    }
    const button = el<HTMLButtonElement>("agreement-accept");
    button.classList.remove("is-holding");
    if (this.agreementPending) button.textContent = "1秒長押しで結果に同意";
  }

  private acceptAgreement(): void {
    if (!this.agreementPending) return;
    const side = this.agreementPending;
    if (side === "a") this.agreedA = true;
    else this.agreedB = true;
    if (!this.persistSeriesProgress()) {
      if (side === "a") this.agreedA = false;
      else this.agreedB = false;
      this.showStorageFailure();
    }
    this.cancelAgreement();
    this.renderFinal();
    this.renderAgreement();
  }

  private cancelAgreement(): void {
    this.cancelAgreementHold();
    this.agreementPending = null;
    el("agreement-confirm").classList.add("hidden");
  }

  private async finalize(): Promise<void> {
    if (!this.agreedA || !this.agreedB || !this.series) return;
    const completedNumbers = [...new Set(this.series.records.map((record) => record.matchNumber))].sort((a, b) => a - b);
    if (this.series.records.length !== 3 || completedNumbers.join(",") !== "1,2,3") {
      el("record-status").textContent = "第1〜第3マッチの結果がすべて確定していないため、試合結果を確定できません。";
      return;
    }
    if (!this.storageWriteAvailable()) {
      this.showStorageFailure();
      return;
    }
    this.finalized = true;
    const sum = this.summary();
    const resultSide = this.overallWinner(sum);
    const winner = resultSide === "a" ? this.series.teamA : resultSide === "b" ? this.series.teamB : "引き分け";
    const record: MatchRecord = {
      recordId: `${this.series.id}_result`,
      timestamp: timestamp(),
      deviceId: shortDeviceId(),
      deviceRole: AdminController.settings().deviceRole,
      appVersion: __APP_VERSION__,
      recordKind: "試合結果",
      seriesId: this.series.id,
      seriesNumber: this.series.seriesNumber,
      court: this.series.court,
      competitionId: `${courtCompetitionCode(this.series.court)}_${String(this.series.seriesNumber).padStart(2, "0")}_RESULT`,
      matchNumber: 0,
      matchType: this.series.matchType,
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
      sendStatus: this.shouldSendToGas(AdminController.settings()) ? "pending" : "local-only",
      teamAAgreed: true,
      teamBAgreed: true,
      completedMatchCount: 3,
      finalized: true,
    };
    this.records.unshift(record);
    if (!this.saveStoredRecords() || !this.persistSeriesProgress()) {
      this.records = this.records.filter((item) => item.recordId !== record.recordId);
      this.finalized = false;
      this.restoreStoredRecords(this.records);
      this.showStorageFailure();
      this.renderFinal();
      this.renderAgreement();
      return;
    }
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
      this.setCompletionPanel(false);
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
    this.historyViewDirty = false;
    const host = el("history");
    host.replaceChildren();
    const statsTeam = el<HTMLSelectElement>("stats-team").value;
    const team = statsTeam !== "チームを選択" ? statsTeam : el<HTMLSelectElement>("history-team").value;
    const result = el<HTMLSelectElement>("history-result").value;
    const kind = el<HTMLSelectElement>("history-kind").value;
    const sendReasonFilter = el<HTMLSelectElement>("history-send-reason").value;
    const since = this.historySince();
    let usedFallback = false;
    let visible = this.records.filter((record) => {
      if (new Date(record.timestamp.replace(" ", "T")).getTime() < since) return false;
      if (team !== "すべてのチーム" && record.teamA !== team && record.teamB !== team) return false;
      if (kind === "match" && record.recordKind !== "マッチ") return false;
      if (kind === "series" && record.recordKind !== "試合結果") return false;
      if (kind === "unsent" && !(this.isSendableSeriesResult(record) && (record.sendStatus === "pending" || record.sendStatus === "failed"))) return false;
      if (sendReasonFilter !== "all") {
        if (!this.isSendableSeriesResult(record) || (record.sendStatus !== "pending" && record.sendStatus !== "failed")) return false;
        if (this.sendIssueReason(AdminController.settings(), record.sendError || "") !== sendReasonFilter) return false;
      }
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
      const roleBadge = record.deviceRole ? `<span class="history-role-badge">${escapeText(record.deviceRole)}</span>` : "";
      const device = `${record.deviceId ?? "端末不明"} / v${record.appVersion ?? "不明"}`;
      const sendIssue = this.isSendableSeriesResult(record) && (record.sendStatus === "pending" || record.sendStatus === "failed")
        ? `<p class="history-send-reason">理由: ${escapeText(this.sendIssueReason(AdminController.settings(), record.sendError || ""))}</p>`
        : "";
      card.innerHTML = `<h3>${escapeText(record.teamA)} vs ${escapeText(record.teamB)}${roleBadge}</h3><p class="muted">${escapeText(record.timestamp)} | ${escapeText(record.court)} 第${record.seriesNumber}試合 | ${number}</p><p class="history-device-line">端末: ${escapeText(device)}</p><p>終了理由: ${escapeText(record.endReason)}<br>A 橙${record.teamAOrange} 紫${record.teamAPurple} 得点${record.teamAScore} / B 橙${record.teamBOrange} 紫${record.teamBPurple} 得点${record.teamBScore} / 勝者 ${escapeText(winner)}</p>${sendState}${sendIssue}`;
      if (this.isSendableSeriesResult(record) && (record.sendStatus === "pending" || record.sendStatus === "failed")) {
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
      if (isSheetPreviewRecord(record) || !this.isSendableSeriesResult(record)) continue;
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
    const issue = this.syncSummary().reason;
    list.replaceChildren(...targets.map((record) => {
      const item = document.createElement("article");
      item.className = `sync-alert-item ${record.sendStatus ?? ""}`;
      const role = record.deviceRole ? `<b class="sync-alert-role">${escapeText(record.deviceRole)}</b>` : "";
      const device = `${record.deviceId ?? "端末不明"} / v${record.appVersion ?? "不明"}`;
      const reason = this.sendIssueReason(AdminController.settings(), record.sendError || issue);
      item.innerHTML = `<strong>${record.sendStatus === "pending" ? "未送信" : "送信失敗"}</strong><span>${escapeText(record.teamA)} vs ${escapeText(record.teamB)}${role}</span><small>${escapeText(record.timestamp)} / ${escapeText(record.court)} 第${record.seriesNumber}試合 / ${escapeText(device)} / ${escapeText(reason)}</small>`;
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
      const loaded = (parsed as Array<Partial<MatchRecord>>).map((record) => {
        const normalized: MatchRecord = {
          recordId: record.recordId ?? `${record.seriesId ?? "imported"}_${record.matchNumber ?? 0}`,
          timestamp: record.timestamp ?? timestamp(),
          recordKind: record.recordKind ?? "マッチ",
          seriesId: record.seriesId ?? "",
          seriesNumber: record.seriesNumber ?? 1,
          court: record.court ?? "Aコート",
          competitionId: record.competitionId ?? "",
          matchNumber: record.matchNumber ?? 1,
          matchType: normalizeMatchType(record.matchType),
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
        };
        if ((normalized.sendStatus === "pending" || normalized.sendStatus === "failed") && !normalized.sendStatusChangedAt) {
          normalized.sendStatusChangedAt = normalized.timestamp || timestamp();
        }
        return normalized;
      });
      let changed = false;
      loaded.forEach((record) => {
        if ((record.sendStatus === "pending" || record.sendStatus === "failed") && !isExplicitFinalizedSeriesRecord(record)) {
          record.sendStatus = "local-only";
          record.sendError = "3マッチ確定・両チーム同意の送信条件を満たしていません";
          record.sendStatusChangedAt = timestamp();
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(loaded));
        } catch {
          // Keep the sanitized in-memory records even if storage is temporarily unavailable.
        }
      }
      return loaded;
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

  private loadCourtCount(): void {
    const saved = Number(localStorage.getItem(this.courtCountStorageKey) || "");
    activeCourtOptions = courtOptionsFromCount(saved || null);
  }

  private applyCourtCount(courtCount: number | null | undefined, persist = true): void {
    activeCourtOptions = courtOptionsFromCount(courtCount);
    if (persist && courtCount && courtCount >= 1 && courtCount <= courtOptions.length) {
      localStorage.setItem(this.courtCountStorageKey, String(Math.floor(courtCount)));
    } else if (persist) {
      localStorage.removeItem(this.courtCountStorageKey);
    }
    const currentCourt = el<HTMLSelectElement>("court-select").value;
    const selected = activeCourtOptions.includes(currentCourt) ? currentCourt : activeCourtOptions[0];
    options(el<HTMLSelectElement>("court-select"), activeCourtOptions, selected);
    options(el<HTMLSelectElement>("operation-court"), activeCourtOptions, selected);
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
    this.applyCourtCount(Number(localStorage.getItem(this.courtCountStorageKey) || "") || null, false);
    el<HTMLTextAreaElement>("team-editor").value = teams.join("\n");
    if (message !== "") {
      el("team-status").textContent = message ?? (persist ? `${teams.length}チームをこの端末に保存しました。` : `${teams.length}チームを読み込みました。端末に残す場合は「チームリストを端末に保存」を押してください。`);
    }
  }

  private saveTeams(): void {
    this.applyTeams(el<HTMLTextAreaElement>("team-editor").value.split(/\r?\n|,/));
  }

  private resetTeams(): void {
    localStorage.removeItem(this.teamStorageKey);
    localStorage.removeItem(this.courtCountStorageKey);
    this.applyCourtCount(null, false);
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
    this.applyTeams(names, false, `端末内CSVファイルから${names.filter(Boolean).length}チームを読み込みました。端末に残す場合は「チームリストを端末に保存」を押してください。`);
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
      this.teamPriorityCache.clear();
      return await this.importTeamsFromGas({});
    } catch {
      const result = { status: "failed", message: "チームリストの読み込みに失敗しました。GASのdoGet更新、SPREADSHEET_ID、チームリストシートを確認してください。", count: 0 } satisfies TeamImportResult;
      el("team-status").textContent = result.message;
      return result;
    }
  }

  importTeamsFromBootstrap(data: GasBootstrapResponse): TeamImportResult {
    this.teamPriorityCache.clear();
    const nextTeams = (data.teams ?? []).map(String).filter(Boolean);
    const priorityCount = (data.priority_teams ?? []).map(String).filter(Boolean).length;
    this.teamPriorityCount = priorityCount;
    this.applyCourtCount(data.court_count ?? null);
    const courtMessage = `使用コート: ${courtRangeLabel()}`;
    if (nextTeams.length < 2) {
      const message = `GAS接続は成功しましたが、スプレッドシートのチームリストが空のため、初期チームリストを使用しています。スプレッドシートを確認してください。${courtMessage}`;
      this.applyTeams([...defaultTeams], false, message);
      return { status: "default", message, count: defaultTeams.length, courtCount: data.court_count ?? null, priorityCount: 0, sourceLabel: "初期チームリスト" };
    }
    const message = `GASから${data.team_sheet_name ?? "チームリスト"}の${nextTeams.length}チームを読み込みました。${courtMessage}。端末に残す場合は「チームリストを端末に保存」を押してください。`;
    this.applyTeams(nextTeams, false, message);
    return { status: "loaded", message, count: nextTeams.length, courtCount: data.court_count ?? null, priorityCount };
  }

  async refreshTeamsForMatchType(matchType: MatchType | null): Promise<TeamImportResult> {
    if (!matchType) {
      this.teamPriorityCount = 0;
      return { status: "loaded", message: "", count: teams.length, priorityCount: 0 };
    }
    const settings = AdminController.settings();
    const cacheKey = `${settings.gasUrl}|${settings.apiKey}|${matchType}`;
    const cached = this.teamPriorityCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.teamPriorityCount = cached.priorityCount;
      this.applyCourtCount(cached.courtCount);
      this.applyTeams([...cached.teams], false, "");
      return { status: "loaded", message: "", count: cached.teams.length, courtCount: cached.courtCount, priorityCount: cached.priorityCount };
    }
    return this.importTeamsFromGas({ matchType, quiet: true, cacheKey });
  }

  private async importTeamsFromGas(options: { spreadsheetId?: string; matchType?: MatchType | null; quiet?: boolean; cacheKey?: string }): Promise<TeamImportResult> {
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
    if (options.matchType) params.set("match_type", options.matchType);
    const response = await fetchWithTimeout(`${settings.gasUrl}?${params.toString()}`);
    const data = await response.json() as { ok?: boolean; error?: string; teams?: string[]; priority_teams?: string[]; row_count?: number; sheet_name?: string; court_count?: number | null };
    if (!response.ok || data.ok === false) throw new Error(data.error || "failed");
    const nextTeams = (data.teams ?? []).map(String).filter(Boolean);
    const priorityCount = (data.priority_teams ?? []).map(String).filter(Boolean).length;
    this.teamPriorityCount = priorityCount;
    this.applyCourtCount(data.court_count ?? null);
    const courtMessage = `使用コート: ${courtRangeLabel()}`;
    if (nextTeams.length < 2) {
      const message = `GAS接続は成功しましたが、スプレッドシートのチームリストが空のため、初期チームリストを使用しています。スプレッドシートを確認してください。${courtMessage}`;
      this.applyTeams([...defaultTeams], false, message);
      return { status: "default", message, count: defaultTeams.length, courtCount: data.court_count ?? null, priorityCount: 0, sourceLabel: "初期チームリスト" };
    }
    const priorityMessage = priorityCount > 0 ? ` ${options.matchType}候補${priorityCount}チームを上に表示します。` : "";
    const message = `GASから${data.sheet_name ?? "チームリスト"}の${nextTeams.length}チームを読み込みました。${courtMessage}。${priorityMessage}端末に残す場合は「チームリストを端末に保存」を押してください。`;
    this.applyTeams(nextTeams, false, options.quiet ? "" : message);
    if (options.cacheKey) {
      this.teamPriorityCache.set(options.cacheKey, {
        expiresAt: Date.now() + 5 * 60 * 1000,
        teams: [...nextTeams],
        priorityCount,
        courtCount: data.court_count ?? null,
      });
    }
    return { status: "loaded", message, count: nextTeams.length, courtCount: data.court_count ?? null, priorityCount };
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

  private exportUnsentHistory(): void {
    const unsentRecords = this.records.filter((record) => !isSheetPreviewRecord(record) && this.isSendableSeriesResult(record) && (record.sendStatus === "pending" || record.sendStatus === "failed"));
    if (!unsentRecords.length) {
      el("history-status").textContent = "バックアップできる未送信の試合結果はありません。";
      return;
    }
    const text = "\uFEFF" + [csvColumns.map(csvEscape).join(","), ...[...unsentRecords].reverse().map((record) => csvRow(record).map(csvEscape).join(","))].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
    link.download = `tennis_assist_unsent_backup_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    el("history-status").textContent = `未送信の試合結果 ${unsentRecords.length}件をバックアップCSVに保存しました。`;
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
      matchType: normalizeMatchType(at(row, "種別")),
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
      deviceRole: normalizeDeviceRole(at(row, "端末役割")),
      deviceId: at(row, "端末ID"),
      appVersion: at(row, "アプリバージョン"),
      teamAAgreed: at(row, "チームA同意").toUpperCase() === "TRUE",
      teamBAgreed: at(row, "チームB同意").toUpperCase() === "TRUE",
      completedMatchCount: Number(at(row, "完了マッチ数")) || undefined,
      finalized: at(row, "最終確定").toUpperCase() === "TRUE",
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
      const response = await fetchWithTimeout(url);
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
    this.saveStoredRecords();
    this.refreshHistoryView();
    el("history-status").textContent = "この端末の対戦履歴をすべて削除しました。";
  }

  private updateSendStatus(record: MatchRecord, status: NonNullable<MatchRecord["sendStatus"]>, sendError = ""): void {
    const isUnsentStatus = status === "pending" || status === "failed";
    const wasUnsentStatus = record.sendStatus === "pending" || record.sendStatus === "failed";
    const changedAt = isUnsentStatus && wasUnsentStatus && record.sendStatusChangedAt ? record.sendStatusChangedAt : timestamp();
    record.sendStatus = status;
    record.sendError = sendError;
    record.sendStatusChangedAt = changedAt;
    const stored = this.records.find((item) => item.recordId === record.recordId);
    if (stored) {
      stored.sendStatus = status;
      stored.sendError = sendError;
      stored.sendStatusChangedAt = changedAt;
    }
    this.saveStoredRecords();
    this.refreshHistoryView();
    document.dispatchEvent(new CustomEvent("records-storage-updated"));
  }

  private finalizedSeriesMatches(record: MatchRecord): MatchRecord[] | null {
    if (!isExplicitFinalizedSeriesRecord(record) || isSheetPreviewRecord(record)) return null;
    const matches = this.records
      .filter((item) => !isSheetPreviewRecord(item) && item.seriesId === record.seriesId && item.recordKind === "マッチ")
      .sort((a, b) => a.matchNumber - b.matchNumber);
    const matchNumbers = [...new Set(matches.map((item) => item.matchNumber))].sort((a, b) => a - b);
    return matches.length === 3 && matchNumbers.join(",") === "1,2,3" ? matches : null;
  }

  private isSendableSeriesResult(record: MatchRecord): boolean {
    return this.finalizedSeriesMatches(record) !== null;
  }

  private async retrySend(record: MatchRecord): Promise<void> {
    if (!this.isSendableSeriesResult(record)) {
      this.updateSendStatus(record, "local-only", "3マッチ確定・両チーム同意の送信条件を満たしていません");
      el("history-status").textContent = "3マッチ分の結果確定と両チーム同意が完了した試合結果だけ送信できます。";
      return;
    }
    this.updateSendStatus(record, "pending");
    el("history-status").textContent = "未送信の試合結果を再送しています...";
    await this.sendSeriesResult(record);
  }

  async retryPendingSends(reason: "startup" | "online" | "manual" | "connection"): Promise<void> {
    if (this.retryingPendingSends || !navigator.onLine) return;
    const settings = AdminController.settings();
    if (!settings.sendEnabled || !settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      if (reason === "manual") el("history-status").textContent = "GAS送信設定が未設定またはOFFです。管理者設定のGAS URL、APIキー、送信ONを確認してください。";
      return;
    }
    const pending = this.records.filter((record) => !isSheetPreviewRecord(record) && this.isSendableSeriesResult(record) && (record.sendStatus === "pending" || record.sendStatus === "failed"));
    if (!pending.length) return;
    this.retryingPendingSends = true;
    this.renderSyncAlert();
    el("history-status").textContent = reason === "online"
      ? `オンライン復帰を検知しました。未送信 ${pending.length}件を送信しています...`
      : reason === "manual"
        ? `未送信・送信失敗 ${pending.length}件を一斉再送信しています...`
        : reason === "connection"
          ? `接続確認後、未送信・送信失敗 ${pending.length}件を自動再送信しています...`
          : `未送信 ${pending.length}件を確認しました。送信しています...`;
    try {
      for (const [index, record] of pending.entries()) {
        await this.sendSeriesResult(record);
        if (index < pending.length - 1) await this.waitForRetry(650);
      }
    } finally {
      this.retryingPendingSends = false;
      this.refreshHistoryView();
      document.dispatchEvent(new CustomEvent("records-storage-updated"));
    }
  }

  private sendSeriesResult(record: MatchRecord): Promise<NonNullable<MatchRecord["sendStatus"]>> {
    if (!this.isSendableSeriesResult(record)) {
      this.updateSendStatus(record, "local-only", "3マッチ確定・両チーム同意の送信条件を満たしていません");
      return Promise.resolve("local-only");
    }
    const sendKey = record.recordId || `${record.seriesId}_result`;
    const active = this.activeSeriesSends.get(sendKey);
    if (active) return active;
    const request = this.performSeriesResultSend(record).finally(() => {
      if (this.activeSeriesSends.get(sendKey) === request) this.activeSeriesSends.delete(sendKey);
    });
    this.activeSeriesSends.set(sendKey, request);
    return request;
  }

  private async performSeriesResultSend(record: MatchRecord): Promise<NonNullable<MatchRecord["sendStatus"]>> {
    const matches = this.finalizedSeriesMatches(record);
    if (!matches) {
      this.updateSendStatus(record, "local-only", "3マッチ確定・両チーム同意の送信条件を満たしていません");
      this.updateCompletionState("local-only", "3マッチ分の結果確定と両チーム同意が完了していないため送信しません。");
      el("record-status").textContent = "送信条件を満たしていないため、端末内保存のみとしました。";
      return "local-only";
    }
    record.teamAViolations = matches.reduce((total, match) => total + this.matchViolationCount(match, match.teamA), 0);
    record.teamBViolations = matches.reduce((total, match) => total + this.matchViolationCount(match, match.teamB), 0);
    const settings = AdminController.settings();
    const assignedCourt = courtFromDeviceRole(normalizeDeviceRole(record.deviceRole || settings.deviceRole));
    if (assignedCourt && record.court !== assignedCourt) {
      const reason = `端末役割は${assignedCourt}用ですが、試合結果は${record.court}です`;
      this.updateSendStatus(record, "failed", reason);
      this.updateCompletionState("failed", reason);
      el("record-status").textContent = `${reason}。誤送信防止のためGASへ送信していません。`;
      return "failed";
    }
    if (!settings.sendEnabled) {
      this.updateSendStatus(record, "local-only", "送信OFF");
      this.updateCompletionState("local-only", "スプレッドシート送信はOFFです。端末内に保存しました。");
      el("record-status").textContent = "試合結果を保存しました。スプレッドシート送信はOFFです。";
      return "local-only";
    }
    if (!this.hasGasUsageHistory(settings)) {
      this.updateSendStatus(record, "local-only", "GAS未設定");
      this.updateCompletionState("local-only", "GAS未設定のため端末内に保存しました。");
      el("record-status").textContent = "試合結果を端末内に保存しました。GASを使用する場合は管理画面で接続してください。";
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
    const details = [...matches, record].map((item) => ({ record_id: item.recordId, csv_row: csvRow(item) }));
    const body = {
      api_key: settings.apiKey,
      event: "series_result",
      target_sheet: "試合結果",
      source: deviceSource(),
      source_device_id: shortDeviceId(),
      source_device_role: settings.deviceRole,
      app_version: __APP_VERSION__,
      sent_at: timestamp(),
      record_id: record.recordId,
      payload: record,
      csv_columns: [...csvColumns],
      csv_row: csvRow(record),
      detail_sheet: "対戦履歴",
      detail_rows: details,
    };
    el("record-status").textContent = "試合結果を保存しました。スプレッドシートへ送信中...";
    let latestError: unknown = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetchWithTimeout(settings.gasUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) }, gasWriteTimeoutMs);
        await ensureGasSuccess(response);
        this.updateSendStatus(record, "sent");
        this.updateCompletionState("sent", "スプレッドシートへ送信できました。");
        el("record-status").textContent = "試合結果を保存し、スプレッドシートへ送信しました。";
        return "sent";
      } catch (error) {
        latestError = error;
        const message = error instanceof Error ? error.message : "";
        if (attempt >= 2 || !this.isRetryableSendError(message)) break;
        el("record-status").textContent = `通信が不安定なため再送しています（${attempt + 1}/2）...`;
        await this.waitForRetry(800 * 2 ** attempt);
      }
    }
    const reason = this.sendIssueReason(settings, latestError instanceof Error ? latestError.message : "");
    this.updateSendStatus(record, "failed", reason);
    this.updateCompletionState("failed", reason);
    el("record-status").textContent = `試合結果は保存しました。${reason}のため送信できません。履歴から再送できます。`;
    return "failed";
  }

  private isRetryableSendError(message: string): boolean {
    if (!navigator.onLine) return false;
    return !/invalid_api_key|unauthorized|forbidden|APIキー不一致|認証/i.test(message);
  }

  private waitForRetry(delay: number): Promise<void> {
    const jitter = Math.floor(Math.random() * 350);
    return new Promise((resolve) => window.setTimeout(resolve, delay + jitter));
  }

  private hasGasUsageHistory(settings: AdminSettings): boolean {
    return Boolean(settings.gasUrl || settings.apiKey || settings.gasConnectedAt || settings.gasConnectedUrl);
  }

  private shouldSendToGas(settings: AdminSettings): boolean {
    return settings.sendEnabled && this.hasGasUsageHistory(settings);
  }

  private updateCompletionState(status: NonNullable<MatchRecord["sendStatus"]>, detail = ""): void {
    const panel = el("completion-panel");
    const badge = el("completion-badge");
    panel.classList.remove("sent", "pending", "failed", "local-only");
    panel.classList.add(status);
    if (status === "sent") {
      this.setCompletionPanel(false);
      return;
    }
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

  private saveStoredRecords(): boolean {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.records.filter((record) => !isSheetPreviewRecord(record))));
      this.historyViewDirty = true;
      document.dispatchEvent(new CustomEvent("records-storage-updated"));
      return true;
    } catch {
      el("history-status").textContent = "端末内保存に失敗しました。ブラウザの空き容量、プライベートモード、サイトデータ設定を確認してください。";
      return false;
    }
  }

  private restoreStoredRecords(records: MatchRecord[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records.filter((record) => !isSheetPreviewRecord(record))));
    } catch {
      // The blocking alert below is the reliable recovery path when storage is unavailable.
    }
  }

  private storageWriteAvailable(): boolean {
    const key = `${this.progressStorageKey}-check`;
    try {
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }

  private showStorageFailure(): void {
    const message = "端末内に保存できないため操作を中止しました。ブラウザの空き容量、プライベートモード、サイトデータ設定を確認し、履歴CSVをバックアップしてください。";
    el("record-status").textContent = message;
    el("history-status").textContent = message;
    window.alert(message);
  }

  private persistSeriesProgress(): boolean {
    if (!this.series) {
      try {
        localStorage.removeItem(this.progressStorageKey);
        return true;
      } catch {
        return false;
      }
    }
    const progress: PersistedSeriesProgress = {
      series: this.series,
      editing: this.editing,
      agreedA: this.agreedA,
      agreedB: this.agreedB,
      finalized: this.finalized,
      awaitingNextMatch: this.awaitingNextMatch,
      awaitingResultInput: this.awaitingResultInput,
      operationManaged: this.operationManaged,
      savedAt: timestamp(),
    };
    try {
      localStorage.setItem(this.progressStorageKey, JSON.stringify(progress));
      return true;
    } catch {
      return false;
    }
  }

  private restoreSeriesProgress(): boolean {
    try {
      const raw = localStorage.getItem(this.progressStorageKey);
      if (!raw) return false;
      const progress = JSON.parse(raw) as Partial<PersistedSeriesProgress>;
      const series = progress.series;
      if (!series || !series.id || !series.teamA || !series.teamB || !Array.isArray(series.records)) {
        localStorage.removeItem(this.progressStorageKey);
        return false;
      }
      this.series = series;
      this.editing = Number(progress.editing) || 0;
      this.agreedA = progress.agreedA === true;
      this.agreedB = progress.agreedB === true;
      this.finalized = progress.finalized === true;
      this.awaitingNextMatch = progress.awaitingNextMatch === true;
      this.awaitingResultInput = progress.awaitingResultInput === true;
      this.operationManaged = progress.operationManaged === true;
      this.resetInput();
      this.renderSeries();
      this.renderAgreement();
      this.updateRecordVisibility();
      el("record-status").textContent = "再読み込み前の試合進行を復元しました。内容を確認して再開してください。";
      return true;
    } catch {
      localStorage.removeItem(this.progressStorageKey);
      return false;
    }
  }

  private isFinished(): boolean {
    return (this.series?.records.length ?? 0) >= 3;
  }
}

class ContentController {
  private news: NewsItem[] = [];
  private newsRequested = false;
  private ruleMenuOpen = false;
  private linksRenderedSecret: boolean | null = null;

  init(): void {
    el<HTMLButtonElement>("rule-search-toggle").addEventListener("click", () => this.searchRulePdf());
    el<HTMLButtonElement>("rule-pdf-fullscreen").addEventListener("click", () => void this.openRulePdfFullscreen());
    el<HTMLInputElement>("rule-search").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.searchRulePdf();
      }
    });
    document.querySelectorAll<HTMLAnchorElement>("[data-rule-pdf-src]").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        this.selectRulePdf(link);
      });
    });
    document.querySelectorAll<HTMLElement>('[data-screen="rules"]').forEach((button) => {
      button.addEventListener("pointerdown", () => this.ensureRulePdfLoaded(), { passive: true });
    });
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

  setRestrictedRulesVisible(visible: boolean): void {
    const restrictedLinks = document.querySelectorAll<HTMLAnchorElement>("[data-admin-rule]");
    restrictedLinks.forEach((link) => link.classList.toggle("hidden", !visible));
    if (visible) return;
    const selectedRestricted = document.querySelector<HTMLAnchorElement>("[data-admin-rule].primary");
    if (!selectedRestricted) return;
    const defaultRule = document.querySelector<HTMLAnchorElement>("[data-rule-pdf-src]:not([data-admin-rule])");
    if (defaultRule) this.selectRulePdf(defaultRule);
  }

  private selectRulePdf(link: HTMLAnchorElement): void {
    const src = link.dataset.rulePdfSrc;
    if (!src) return;
    const title = link.dataset.ruleTitle || link.textContent?.trim() || "ルールPDF";
    const frame = el<HTMLIFrameElement>("rule-pdf-frame");
    this.setRulePdfSource(frame, src);
    frame.title = title;
    document.querySelectorAll<HTMLAnchorElement>("[data-rule-pdf-src]").forEach((button) => {
      button.classList.toggle("primary", button === link);
    });
    const openLink = el<HTMLAnchorElement>("rule-pdf-open-link");
    openLink.href = link.href;
    openLink.textContent = `${title}を別タブで開く`;
    const status = document.getElementById("rule-pdf-search-status");
    if (status) status.textContent = "表示中のPDFに検索語を渡します。検索できない場合は別タブで開いて検索してください。";
  }

  private ensureRulePdfLoaded(): void {
    const selected = document.querySelector<HTMLAnchorElement>("[data-rule-pdf-src].primary")
      ?? document.querySelector<HTMLAnchorElement>("[data-rule-pdf-src]");
    if (selected) this.selectRulePdf(selected);
  }

  private setRulePdfSource(frame: HTMLIFrameElement, src: string): void {
    if (frame.dataset.loadedSrc === src) return;
    frame.dataset.loadedSrc = src;
    frame.setAttribute("aria-busy", "true");
    frame.addEventListener("load", () => frame.setAttribute("aria-busy", "false"), { once: true });
    frame.src = src;
  }

  private searchRulePdf(): void {
    const input = el<HTMLInputElement>("rule-search");
    const query = input.value.trim();
    const selected = document.querySelector<HTMLAnchorElement>("[data-rule-pdf-src].primary") ?? document.querySelector<HTMLAnchorElement>("[data-rule-pdf-src]");
    const src = selected?.dataset.rulePdfSrc;
    if (!selected || !src) return;
    if (!query) {
      this.selectRulePdf(selected);
      input.focus();
      return;
    }
    const frame = el<HTMLIFrameElement>("rule-pdf-frame");
    this.setRulePdfSource(frame, `${src}#search=${encodeURIComponent(query)}`);
    const openLink = el<HTMLAnchorElement>("rule-pdf-open-link");
    openLink.href = `${selected.href}#search=${encodeURIComponent(query)}`;
    const title = selected.dataset.ruleTitle || selected.textContent?.trim() || "ルールPDF";
    openLink.textContent = `${title}を別タブで開いて「${query}」を検索`;
    const status = document.getElementById("rule-pdf-search-status");
    if (status) status.textContent = `「${query}」を表示中のPDFで検索します。反映されない場合は、下の別タブリンク先で検索してください。`;
  }

  private async openRulePdfFullscreen(): Promise<void> {
    const viewer = el<HTMLElement>("rule-pdf-viewer");
    const openLink = el<HTMLAnchorElement>("rule-pdf-open-link");
    try {
      if (viewer.requestFullscreen) {
        await viewer.requestFullscreen();
        return;
      }
    } catch {
      // Fullscreen may be blocked on some mobile browsers. Fall back to the PDF URL.
    }
    window.open(openLink.href, "_blank", "noopener");
  }

  open(screen: Screen, secret: boolean): void {
    if (screen === "rules") {
      this.ensureRulePdfLoaded();
      this.closeRuleSearch();
      this.setRuleMenu(false);
    }
    if (screen === "news" && !this.newsRequested) {
      this.newsRequested = true;
      el("news-status").textContent = "最新情報を読み込み中...";
      void this.loadNews();
    }
    if (screen === "links") this.renderLinks(secret);
  }

  renderLinks(secret: boolean): void {
    if (this.linksRenderedSecret === secret) return;
    this.linksRenderedSecret = secret;
    el("app-version").textContent = `アプリバージョン v${__APP_VERSION__}`;
    const sections = [
      { title: "WRO 全国 国際ホームページ", links: [["WRO Japan", LINKS.wroJapan], ["WRO 国際", LINKS.wroInternational]] },
      { title: "WRO 公認予選会", links: [["WRO兵庫", LINKS.wroHyogo], ["WRO東京", LINKS.wroTokyo], ["WRO三重", LINKS.wroMie], ["WRO奈良", LINKS.wroNara]] },
      { title: "ルール関連", links: [["Japan決勝大会ルール", LINKS.japanFinalRule], ["世界大会ルール", LINKS.worldRules], ["Q&A", LINKS.officialQa], ["Google翻訳", LINKS.googleRules], ["DeepL翻訳", LINKS.deeplRules]] },
      { title: "その他", links: [["YouTube関連動画", LINKS.youtube], ["GitHubリポジトリ", "https://github.com/ecleaire/Tennis-Assist-Web.git"], ...(secret ? [["旧テニスタイマー", LINKS.legacyTimer], ["旧 litlink", LINKS.legacyLitlink]] : [])] },
    ];
    const publicUrls = `
      <article class="link-section public-url-section">
        <h3>公開URL QRコード</h3>
        <div class="public-url-grid">
          <a class="public-url-card" target="_blank" rel="noopener" href="https://ecleaire.github.io/Tennis-Assist-Web/">
            <img src="./assets/qr-judge.png" alt="大会 審判用 公開URL QRコード" loading="lazy">
            <strong>大会 審判用</strong>
            <span>https://ecleaire.github.io/Tennis-Assist-Web/</span>
          </a>
          <a class="public-url-card" target="_blank" rel="noopener" href="https://ecleaire.github.io/Tennis-Assist-Web/general/">
            <img src="./assets/qr-general.png" alt="選手 練習用 general 公開URL QRコード" loading="lazy">
            <strong>選手 練習用 / general</strong>
            <span>https://ecleaire.github.io/Tennis-Assist-Web/general/</span>
          </a>
        </div>
      </article>
    `;
    const dayChecklist = `
      <article class="link-section day-checklist-section">
        <h3>大会前チェックリスト</h3>
        <ul class="day-checklist">
          <li>強制更新を実行し、アプリバージョンを確認</li>
          <li>管理画面で「接続・設定読込」を実行</li>
          <li>チーム数、使用コート、試合種別、タイマー設定を確認</li>
          <li>音声確認と10秒同期確認を実行</li>
          <li>対戦履歴と統計で未送信0件を確認</li>
        </ul>
      </article>
    `;
    const credits = `
      <article class="link-section credit-section">
        <h3>ライセンス / クレジット</h3>
        <p class="credit-intro">本アプリでは、以下の素晴らしい素材を利用しています。公開してくださっている制作者の皆さまに心より感謝いたします。</p>
        <div class="credit-list">
          <div>
            <strong>DSEG（7セグメントフォント）</strong>
            <p>タイマー表示に使用しています。</p>
            <p><a target="_blank" rel="noopener" href="https://www.keshikan.net/fonts.html">公式サイト</a> / <a target="_blank" rel="noopener" href="https://github.com/keshikan/DSEG">GitHub</a></p>
          </div>
          <div>
            <strong>QuickChart QR Code API（QRコード生成）</strong>
            <p>QRコードの生成に使用しています。</p>
            <p><a target="_blank" rel="noopener" href="https://quickchart.io/documentation/qr-codes/">公式ドキュメント</a></p>
          </div>
          <div>
            <strong>効果音ラボ（システム音声・効果音）</strong>
            <p>案内音声やシステム効果音の一部に使用しています。</p>
            <p><a target="_blank" rel="noopener" href="https://soundeffect-lab.info/">公式サイト</a></p>
          </div>
          <div>
            <strong>タイマー通知音</strong>
            <p>ブラウザの Web Audio API で生成しています。</p>
          </div>
          <p>WRO、RoboSports、競技ルールに関する正式な情報は WRO 公式サイトを参照してください。</p>
          <p>開発支援: OpenAI ChatGPT / Codex</p>
        </div>
      </article>
    `;
    el("links-list").innerHTML = `${sections.map((section) => `<article class="link-section"><h3>${section.title}</h3><div class="link-grid">${section.links.map(([label, url]) => `<a class="button" target="_blank" rel="noopener" href="${url}">${label}</a>`).join("")}</div></article>`).join("")}${publicUrls}${dayChecklist}${credits}`;
  }

  private setRuleMenu(open: boolean): void {
    this.ruleMenuOpen = open;
    el("screen-rules").classList.toggle("rule-menu-open", open);
    el<HTMLButtonElement>("rule-menu-toggle").setAttribute("aria-expanded", String(open));
  }

  private closeRuleSearch(): void {
    const input = el<HTMLInputElement>("rule-search");
    input.value = "";
    el<HTMLButtonElement>("rule-search-toggle").setAttribute("aria-expanded", "false");
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
  private static readonly storageKey = adminStorageKey;
  private static readonly sessionStorageKey = adminSessionStorageKey;
  private static readonly timerSettingStorageKey = "tennis-assist-timer-setting-v1";
  private static readonly gateHash = "31749b1d44f155c116ce285a185146310ce0cd131f77cc1e4e1546d97feef275";
  private static readonly plainPasswords = new Set(["rsam", "gas", "wrorsam", "judge", "train", "practice", "hyogo", "mie", "mie_judge", "nara", "shukugawa"]);
  private mode: AdminMode = "standard";
  private connectionVerified = false;
  private timerSettingLoaded = Boolean(AdminController.timerSetting());
  private readonly audioCheck = new TimerAudioCueController();
  private audioSyncStatusTimer = 0;
  private audioSyncFrame = 0;
  private hyogoAutoConnectRunning = false;

  constructor(
    private readonly qrScanner: QrScanner,
    private readonly onConnected?: () => Promise<TeamImportResult>,
    private readonly onBootstrap?: (data: GasBootstrapResponse) => TeamImportResult,
    private readonly onModeChanged?: (mode: AdminMode, settings: AdminSettings, options?: AdminModeApplyOptions) => void,
    private readonly onTimerSettingChanged?: (setting: ExternalTimerSetting | null) => void,
    private readonly syncSummaryProvider?: () => SyncSummary,
    private readonly portableStateProvider?: () => unknown,
    private readonly portableStateApplier?: (value: unknown) => void,
    private readonly persistPortableState?: () => void,
    private readonly retryPendingSends?: () => Promise<void>,
    private readonly onUnlocked?: () => void,
  ) {
    el<HTMLButtonElement>("admin-unlock").addEventListener("click", () => void this.unlock());
    el<HTMLButtonElement>("admin-password-toggle").addEventListener("click", () => this.toggleSecretInput("admin-password", "admin-password-toggle"));
    el<HTMLButtonElement>("gas-save").addEventListener("click", () => this.save());
    el<HTMLButtonElement>("gas-test").addEventListener("click", () => void this.test());
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
    el<HTMLSelectElement>("device-role").addEventListener("change", () => this.save());
    el<HTMLButtonElement>("audio-test-thirty").addEventListener("click", () => void this.testAudioCue("thirty"));
    el<HTMLButtonElement>("audio-test-ten").addEventListener("click", () => void this.testAudioCue("ten"));
    el<HTMLButtonElement>("audio-test-five").addEventListener("click", () => void this.testAudioCue("five"));
    el<HTMLButtonElement>("audio-test-sync").addEventListener("click", () => void this.testAudioSyncPreview());
    el<HTMLDetailsElement>("audio-check-details").addEventListener("toggle", () => {
      if (!el<HTMLDetailsElement>("audio-check-details").open) this.stopAudioSyncPreview();
    });
    ["audio-cue-elapsed-thirty", "audio-cue-remaining-ten", "audio-cue-remaining-five-sequence"].forEach((id) => {
      el<HTMLInputElement>(id).addEventListener("change", () => this.save());
    });
    el<HTMLButtonElement>("device-config-qr-show").addEventListener("click", () => this.showDeviceConfigQr());
    el<HTMLButtonElement>("device-config-qr-scan").addEventListener("click", () => void this.scanDeviceConfigQr());
    el<HTMLButtonElement>("gas-scan").addEventListener("click", () => void this.openScanner());
    el<HTMLSelectElement>("venue-color").addEventListener("change", () => this.applyColor());
    el<HTMLSelectElement>("match-type").addEventListener("change", () => this.save());
    el<HTMLInputElement>("operation-match-label-enabled").addEventListener("change", () => this.save());
    el<HTMLInputElement>("operation-match-label-size").addEventListener("input", () => this.updateOperationMatchLabelSizeOutput());
    el<HTMLInputElement>("operation-match-label-size").addEventListener("change", () => this.save());
    (Object.keys(defaultVenueScreenVisibility) as ConfigurableVenueScreen[]).forEach((screen) => {
      el<HTMLInputElement>(`venue-screen-${screen}`).addEventListener("change", () => this.save());
    });
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
        deviceRole: normalizeDeviceRole(parsed.deviceRole),
        audioCues: normalizeAudioCueSettings(parsed.audioCues),
        showOperationMatchLabel: parsed.showOperationMatchLabel === true,
        operationMatchLabelSize: normalizeOperationMatchLabelSize(parsed.operationMatchLabelSize),
        venueScreenVisibility: normalizeVenueScreenVisibility(parsed.venueScreenVisibility),
        gasConnectedAt: parsed.gasConnectedAt,
        gasConnectedUrl: parsed.gasConnectedUrl,
        dayCheckAt: parsed.dayCheckAt,
      };
    } catch {
      return {
        gasUrl: "",
        apiKey: "",
        sendEnabled: true,
        accentMode: "standard",
        matchType: "練習試合",
        deviceRole: "",
        audioCues: { ...defaultAudioCueSettings },
        showOperationMatchLabel: false,
        operationMatchLabelSize: defaultOperationMatchLabelSize,
        venueScreenVisibility: { ...defaultVenueScreenVisibility },
      };
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

  static loadPersistedSession(): { mode: AdminMode; adminKey: string } | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(this.sessionStorageKey) ?? "{}") as Partial<AdminSessionState>;
      const adminKey = this.normalizeAdminPassword(String(parsed.adminKey ?? ""));
      if (!parsed.active || !adminKey || (!this.plainPasswords.has(adminKey) && parsed.verified !== true)) return null;
      return { mode: this.modeForPassword(adminKey), adminKey };
    } catch {
      return null;
    }
  }

  static clearPersistedSession(): void {
    localStorage.removeItem(this.sessionStorageKey);
  }

  private static modeForPassword(normalizedPassword: string): AdminMode {
    if (normalizedPassword === "hyogo") return "hyogo";
    if (normalizedPassword === "nara") return "nara";
    if (normalizedPassword === "mie" || normalizedPassword === "mie_judge") return "mie";
    if (normalizedPassword === "rsam" || normalizedPassword === "gas" || normalizedPassword === "wrorsam") return "rsam";
    return "standard";
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
    el<HTMLSelectElement>("device-role").value = normalizeDeviceRole(settings.deviceRole);
    el<HTMLInputElement>("audio-cue-elapsed-thirty").checked = settings.audioCues.elapsedThirty;
    el<HTMLInputElement>("audio-cue-remaining-ten").checked = settings.audioCues.remainingTen;
    el<HTMLInputElement>("audio-cue-remaining-five-sequence").checked = settings.audioCues.remainingFiveSequence;
    el<HTMLInputElement>("operation-match-label-enabled").checked = settings.showOperationMatchLabel;
    el<HTMLInputElement>("operation-match-label-size").value = String(settings.operationMatchLabelSize);
    (Object.keys(defaultVenueScreenVisibility) as ConfigurableVenueScreen[]).forEach((screen) => {
      el<HTMLInputElement>(`venue-screen-${screen}`).checked = settings.venueScreenVisibility[screen];
    });
    el("venue-screen-setting").classList.toggle("hidden", AdminController.variant().id !== "venue");
    this.updateOperationMatchLabelSizeOutput();
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
    const allowLight = AdminController.variant().allowLightUi;
    lightOption.hidden = !allowLight;
    lightOption.disabled = !allowLight;
    if (!allowLight && colorSelect.value === "light") colorSelect.value = "standard";
  }

  private async unlock(): Promise<void> {
    const password = el<HTMLInputElement>("admin-password").value;
    const normalizedPassword = AdminController.normalizeAdminPassword(password);
    const encoded = new TextEncoder().encode(password);
    const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoded));
    const digest = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    if (digest !== AdminController.gateHash && !AdminController.plainPasswords.has(normalizedPassword)) {
      el("gas-status").textContent = "パスワードを確認してください。";
      return;
    }
    this.openAdminSettingsForKey(normalizedPassword, true);
  }

  restorePersistedSession(adminKey: string): void {
    const normalizedPassword = AdminController.normalizeAdminPassword(adminKey);
    this.openAdminSettingsForKey(normalizedPassword, false);
  }

  private openAdminSettingsForKey(normalizedPassword: string, persistSession: boolean): void {
    this.mode = AdminController.modeForPassword(normalizedPassword);
    if (persistSession) this.persistAdminSession(normalizedPassword);
    const shouldAutoConnect = this.mode === "hyogo";
    el("admin-login-context").textContent = shouldAutoConnect
      ? `${this.adminContextLabel(normalizedPassword)}でログイン中。GAS接続と設定読込を自動実行しています。`
      : `${this.adminContextLabel(normalizedPassword)}でログイン中。APIキーを入力し、「接続・設定読込」を押してください。`;
    el("admin-settings").classList.remove("hidden");
    el("admin-gate").classList.add("hidden");
    this.onUnlocked?.();
    el("venue-color-setting").classList.remove("hidden");
    el<HTMLDetailsElement>("venue-color-setting").open = false;
    el<HTMLDetailsElement>("timer-setting-details").open = false;
    this.updateColorOptions();
    const managedUrlApplied = this.applyManagedGasUrl(normalizedPassword, shouldAutoConnect);
    const canAutoConnect = shouldAutoConnect && this.prepareHyogoAutoConnection(normalizedPassword);
    this.onModeChanged?.(this.mode, AdminController.settings(), { applyTheme: false, adminKey: normalizedPassword });
    this.applyEffectiveTimerSetting();
    this.updateConnectionCard();
    if (!managedUrlApplied) el("gas-status").textContent = "";
    if (canAutoConnect) {
      window.setTimeout(() => void this.autoConnectHyogo(), 0);
    }
  }

  private persistAdminSession(normalizedPassword: string): void {
    const mode = AdminController.modeForPassword(normalizedPassword);
    const session: AdminSessionState = {
      active: true,
      verified: true,
      mode,
      adminKey: normalizedPassword,
      updatedAt: timestamp(),
    };
    localStorage.setItem(AdminController.sessionStorageKey, JSON.stringify(session));
  }

  private applyManagedGasUrl(password: string, forceManaged = false): boolean {
    const config = managedGasUrlsByPassword.get(AdminController.normalizeAdminPassword(password));
    if (!config) return false;
    const gasUrl = config.url;
    const gasUrlInput = el<HTMLInputElement>("gas-url");
    const current = gasUrlInput.value.trim();
    const isAutoManaged = forceManaged || gasUrlInput.dataset.autoGasUrl !== "false" || !current || managedGasUrls.has(current);
    if (!isAutoManaged) {
      el("gas-status").textContent = "手動指定のGAS URLを使用しています。";
      return true;
    }
    gasUrlInput.value = gasUrl;
    gasUrlInput.dataset.autoGasUrl = "true";
    el<HTMLDetailsElement>("gas-url-details").open = false;
    const settings = AdminController.settings();
    const gasUrlChanged = settings.gasUrl !== gasUrl;
    settings.gasUrl = gasUrl;
    if (gasUrlChanged) {
      settings.gasConnectedAt = "";
      settings.gasConnectedUrl = "";
    }
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    el("gas-status").textContent = "";
    this.updateConnectionCard();
    return true;
  }

  private prepareHyogoAutoConnection(normalizedPassword: string): boolean {
    if (this.mode !== "hyogo") return false;
    const gasUrl = el<HTMLInputElement>("gas-url").value.trim();
    el<HTMLInputElement>("gas-key").value = "GAS";
    el<HTMLInputElement>("gas-enabled").checked = true;
    const settings = AdminController.settings();
    settings.gasUrl = gasUrl;
    settings.apiKey = "GAS";
    settings.sendEnabled = true;
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    el("admin-login-context").textContent = `${this.adminContextLabel(normalizedPassword)}でログイン中。GAS接続と設定読込を自動実行しています。`;
    document.dispatchEvent(new CustomEvent("admin-settings-updated"));
    return gasUrl.endsWith("/exec");
  }

  private async autoConnectHyogo(): Promise<void> {
    if (this.hyogoAutoConnectRunning) return;
    this.hyogoAutoConnectRunning = true;
    try {
      await this.test();
    } finally {
      this.hyogoAutoConnectRunning = false;
    }
  }

  private save(): void {
    const settings: AdminSettings = {
      gasUrl: el<HTMLInputElement>("gas-url").value.trim(),
      apiKey: el<HTMLInputElement>("gas-key").value,
      sendEnabled: el<HTMLInputElement>("gas-enabled").checked,
      accentMode: AdminController.normalizeAccentMode(el<HTMLSelectElement>("venue-color").value, AdminController.variant().allowLightUi),
      matchType: el<HTMLSelectElement>("match-type").value === "公式試合" ? "公式試合" : "練習試合",
      deviceRole: normalizeDeviceRole(el<HTMLSelectElement>("device-role").value),
      audioCues: {
        elapsedThirty: el<HTMLInputElement>("audio-cue-elapsed-thirty").checked,
        remainingTen: el<HTMLInputElement>("audio-cue-remaining-ten").checked,
        remainingFiveSequence: el<HTMLInputElement>("audio-cue-remaining-five-sequence").checked,
      },
      showOperationMatchLabel: el<HTMLInputElement>("operation-match-label-enabled").checked,
      operationMatchLabelSize: normalizeOperationMatchLabelSize(el<HTMLInputElement>("operation-match-label-size").value),
      venueScreenVisibility: (Object.keys(defaultVenueScreenVisibility) as ConfigurableVenueScreen[]).reduce((visibility, screen) => {
        visibility[screen] = el<HTMLInputElement>(`venue-screen-${screen}`).checked;
        return visibility;
      }, { ...defaultVenueScreenVisibility }),
      gasConnectedAt: AdminController.settings().gasConnectedAt,
      gasConnectedUrl: AdminController.settings().gasConnectedUrl,
      dayCheckAt: AdminController.settings().dayCheckAt,
    };
    localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
    this.persistPortableState?.();
    this.onModeChanged?.(this.mode, settings);
    document.dispatchEvent(new CustomEvent("admin-settings-updated"));
    this.updateConnectionCard();
    el("gas-status").textContent = "この端末に管理設定、チームリスト、使用コートを保存しました。";
  }

  private updateOperationMatchLabelSizeOutput(): void {
    const size = normalizeOperationMatchLabelSize(el<HTMLInputElement>("operation-match-label-size").value);
    el<HTMLOutputElement>("operation-match-label-size-value").value = `${size}px`;
  }

  private async testAudioCue(kind: "thirty" | "ten" | "five"): Promise<void> {
    const label = kind === "thirty" ? "開始30秒音" : kind === "ten" ? "残り10秒音" : "残り5秒〜0秒音";
    this.stopAudioSyncPreview();
    el("gas-status").textContent = `${label}を再生しています。聞こえない場合は端末音量、マナーモード、ブラウザ音声許可を確認してください。`;
    try {
      if (kind === "thirty") await this.audioCheck.testThirtySeconds();
      else if (kind === "ten") await this.audioCheck.testRemainingTen();
      else await this.testRemainingFiveSequence();
    } catch {
      el("gas-status").textContent = `${label}を再生できませんでした。ブラウザの音声許可を確認してください。`;
    }
  }

  private async testRemainingFiveSequence(): Promise<void> {
    await this.audioCheck.testRemainingFiveSequence();
    let remaining = 5;
    const status = el("gas-status");
    status.textContent = `音声同期確認: 残り${remaining}秒。0秒の長音まで表示と音のタイミングを確認してください。`;
    this.audioSyncStatusTimer = window.setInterval(() => {
      remaining -= 1;
      status.textContent = remaining > 0
        ? `音声同期確認: 残り${remaining}秒。表示と音のタイミングを確認してください。`
        : "音声同期確認: 0秒。長めの高音を確認してください。";
      if (remaining <= 0) {
        window.clearInterval(this.audioSyncStatusTimer);
        this.audioSyncStatusTimer = 0;
      }
    }, 1000);
  }

  private async testAudioSyncPreview(): Promise<void> {
    this.stopAudioSyncPreview();
    const totalSeconds = 11;
    const time = el<HTMLOutputElement>("audio-sync-time");
    const status = el("audio-sync-status");
    const button = el<HTMLButtonElement>("audio-test-sync");
    time.classList.remove("warning");
    time.textContent = this.audioSyncDisplay(totalSeconds);
    status.textContent = "11秒から開始します。10秒音、5秒前からの短音、0秒長音と表示を確認してください。";
    button.disabled = true;
    try {
      await this.audioCheck.prepare();
      const startAt = performance.now();
      const endAt = startAt + totalSeconds * 1000;
      this.audioCheck.scheduleMainCues(totalSeconds, totalSeconds);
      const frame = () => {
        const remaining = Math.max(0, (endAt - performance.now()) / 1000);
        time.textContent = this.audioSyncDisplay(remaining);
        time.classList.toggle("warning", remaining <= 10);
        status.textContent = remaining > 0
          ? `同期確認中: 残り${Math.ceil(remaining)}秒。画面の数字と音のタイミングを確認してください。`
          : "同期確認完了: 0秒の長音まで確認してください。";
        if (remaining > 0) {
          this.audioSyncFrame = window.requestAnimationFrame(frame);
          return;
        }
        this.audioSyncFrame = 0;
        button.disabled = false;
      };
      this.audioSyncFrame = window.requestAnimationFrame(frame);
    } catch {
      button.disabled = false;
      status.textContent = "同期確認を開始できませんでした。ブラウザの音声許可を確認してください。";
    }
  }

  private stopAudioSyncPreview(): void {
    window.clearInterval(this.audioSyncStatusTimer);
    this.audioSyncStatusTimer = 0;
    if (this.audioSyncFrame) {
      window.cancelAnimationFrame(this.audioSyncFrame);
      this.audioSyncFrame = 0;
    }
    this.audioCheck.stopScheduled();
    const button = el<HTMLButtonElement>("audio-test-sync");
    if (button) button.disabled = false;
  }

  stopTransientChecks(): void {
    this.stopAudioSyncPreview();
  }

  private audioSyncDisplay(remaining: number): string {
    const seconds = Math.max(0, Math.ceil(remaining));
    return `00 : ${String(seconds).padStart(2, "0")}`;
  }

  private applyColor(): void {
    const settings = AdminController.settings();
    settings.accentMode = AdminController.normalizeAccentMode(el<HTMLSelectElement>("venue-color").value, AdminController.variant().allowLightUi);
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
      const response = await fetchWithTimeout(url);
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

  private async loadBootstrapFromGas(settings: AdminSettings): Promise<{ team: TeamImportResult; timer: TimerSettingLoadResult }> {
    if (!this.onBootstrap) {
      return {
        team: { status: "failed", message: "チームリスト読み込み機能を初期化できていません。", count: 0 },
        timer: await this.loadTimerSettingFromGas(settings),
      };
    }
    const url = new URL(settings.gasUrl);
    url.searchParams.set("action", "bootstrap");
    url.searchParams.set("api_key", settings.apiKey);
    const response = await fetchWithTimeout(url);
    const data = await response.json() as GasBootstrapResponse;
    if (!response.ok || !data.ok) throw new Error(data.message || data.error || "bootstrap_failed");
    return this.applyBootstrapData(data);
  }

  private applyBootstrapData(data: GasBootstrapResponse): { team: TeamImportResult; timer: TimerSettingLoadResult } {
    if (!this.onBootstrap) throw new Error("bootstrap_handler_missing");
    const team = this.onBootstrap(data);
    const setting = normalizeExternalTimerSetting(data.timer_setting, "sheet");
    this.saveTimerSetting(setting);
    return {
      team,
      timer: { status: "loaded", message: externalTimerSettingText(setting) },
    };
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

  lock(options: { clearSession?: boolean } = {}): void {
    if (options.clearSession) AdminController.clearPersistedSession();
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

  private showDeviceConfigQr(): void {
    const settings = AdminController.settings();
    const payload = encodePortablePayload({
      app: "RoboSports Assist",
      version: 1,
      admin: {
        gasUrl: settings.gasUrl,
        sendEnabled: settings.sendEnabled,
        accentMode: settings.accentMode,
        matchType: settings.matchType,
        deviceRole: settings.deviceRole,
        audioCues: settings.audioCues,
        showOperationMatchLabel: settings.showOperationMatchLabel,
        operationMatchLabelSize: settings.operationMatchLabelSize,
      },
      timerSetting: AdminController.timerSetting(),
      records: this.portableStateProvider?.() ?? {},
    });
    el<HTMLImageElement>("device-config-qr-image").src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&data=${encodeURIComponent(payload)}`;
    el<HTMLTextAreaElement>("device-config-qr-text").value = payload;
    el<HTMLDialogElement>("device-config-qr-dialog").showModal();
  }

  private async scanDeviceConfigQr(): Promise<void> {
    const scanned = await this.qrScanner.scan({
      title: "端末設定QR読込",
      hint: "RoboSports Assist の端末設定QRを読み取ってください。APIキーは含まれません。",
      applyLabel: "この設定を読込",
      validator: (value) => value.trim().startsWith("RSA_CONFIG:"),
      invalidMessage: "端末設定QRではありません。",
    });
    if (!scanned) return;
    try {
      const parsed = decodePortablePayload(scanned) as { admin?: Partial<AdminSettings>; timerSetting?: unknown; records?: unknown };
      const settings = AdminController.settings();
      const admin = parsed.admin ?? {};
      settings.gasUrl = typeof admin.gasUrl === "string" ? admin.gasUrl : settings.gasUrl;
      settings.sendEnabled = admin.sendEnabled !== false;
      settings.accentMode = AdminController.normalizeAccentMode(admin.accentMode);
      settings.matchType = admin.matchType === "公式試合" ? "公式試合" : "練習試合";
      settings.deviceRole = normalizeDeviceRole(admin.deviceRole);
      settings.audioCues = normalizeAudioCueSettings(admin.audioCues);
      settings.showOperationMatchLabel = admin.showOperationMatchLabel === true;
      settings.operationMatchLabelSize = normalizeOperationMatchLabelSize(admin.operationMatchLabelSize);
      localStorage.setItem(AdminController.storageKey, JSON.stringify(settings));
      if (parsed.timerSetting) {
        const timerSetting = normalizeExternalTimerSetting(parsed.timerSetting, "manual");
        localStorage.setItem(AdminController.timerSettingStorageKey, JSON.stringify(timerSetting));
        this.onTimerSettingChanged?.(timerSetting);
      }
      this.portableStateApplier?.(parsed.records);
      this.populate();
      this.onModeChanged?.(this.mode, AdminController.settings());
      el("gas-status").textContent = "端末設定QRから設定を読み込みました。APIキーはこの端末で入力してください。";
    } catch {
      el("gas-status").textContent = "端末設定QRを読み込めませんでした。QRコードの内容を確認してください。";
    }
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
      const response = await fetchWithTimeout(settings.gasUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ ...body, include_bootstrap: true }),
      }, gasWriteTimeoutMs);
      const data = await ensureGasSuccess(response) as GasBootstrapResponse;
      const hasBootstrap = Array.isArray(data.teams) && data.timer_setting != null;
      const bootstrap = hasBootstrap && this.onBootstrap
        ? this.applyBootstrapData(data)
        : await this.loadBootstrapFromGas(settings);
      const loaded = bootstrap.team;
      const timerResult = bootstrap.timer;
      this.saveConnectionVerified();
      this.updateConnectionCard();
      this.setSummaryChip("admin-summary-test", "OK", "ok");
      this.setSummaryChip("admin-summary-team", this.teamImportSummaryLabel(loaded), loaded.status === "loaded" ? "ok" : loaded.status === "default" ? "warn" : "danger");
      el("timer-setting-status").textContent = timerResult.message;
      this.timerSettingLoaded = timerResult.status === "loaded" || timerResult.status === "cached";
      this.updateConnectionCard();
      this.setSummaryChip("admin-summary-timer", this.timerSettingSummary(AdminController.timerSetting() ?? this.effectiveTimerSetting()), timerResult.status === "failed" ? "danger" : timerResult.status === "cached" ? "warn" : "ok");
      const pendingBeforeRetry = this.syncSummaryProvider?.().unsent ?? 0;
      if (pendingBeforeRetry > 0 && this.retryPendingSends) {
        el("gas-status").textContent = `接続と設定読込が完了しました。未送信・送信失敗 ${pendingBeforeRetry}件を自動再送信しています...`;
        try {
          await this.retryPendingSends();
          const pendingAfterRetry = this.syncSummaryProvider?.().unsent ?? 0;
          const sentCount = Math.max(0, pendingBeforeRetry - pendingAfterRetry);
          el("gas-status").textContent = pendingAfterRetry > 0
            ? `接続と設定読込が完了しました。${sentCount}件を送信し、未送信・送信失敗が${pendingAfterRetry}件残っています。試合記録から確認してください。`
            : `接続と設定読込が完了しました。未送信・送信失敗 ${pendingBeforeRetry}件を自動送信しました。`;
        } catch {
          el("gas-status").textContent = "接続と設定読込は完了しましたが、未送信データの自動再送信に失敗しました。試合記録から再送信してください。";
        }
      }
      this.completeDayCheck();
      el("admin-success-summary").classList.remove("hidden");
    } catch (error) {
      this.connectionVerified = false;
      this.clearConnectionSummary();
      this.updateConnectionCard();
      el("gas-status").textContent = this.gasConnectionErrorMessage(error);
    }
  }

  private gasConnectionErrorMessage(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error || "");
    if (message.includes("gas_request_timeout")) {
      return "接続・設定読込が時間内に完了しませんでした。通信状態を確認して、もう一度実行してください。";
    }
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
    if (result.status === "loaded") return `${prefix} チームリストも読み込みました。${result.count}チーム、${courtRangeLabel()}を反映しています。`;
    if (result.status === "default") return `${prefix} ${result.message} 現在のチーム候補は初期チームリストです。`;
    return `${prefix} ${result.message}`;
  }

  private teamImportSummaryLabel(result: TeamImportResult): string {
    if (result.status === "loaded") return `チーム ${result.count}件 / ${courtRangeLabel()}`;
    if (result.status === "default") return `初期チームリスト ${result.count}件`;
    return "チーム失敗";
  }

  private completeDayCheck(): void {
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
    el("gas-status").textContent = this.dayCheckResultLabel(sync);
    this.updateConnectionCard();
  }

  private dayCheckResultLabel(sync: { unsent: number; reason: string }): string {
    const settings = AdminController.settings();
    if (!settings.apiKey) return "APIキー未入力";
    if (!settings.gasUrl.endsWith("/exec") || !this.connectionVerified) return "GAS未接続";
    if (!this.timerSettingLoaded) return "タイマー未読込";
    const teamSummary = el("admin-summary-team").textContent;
    if (!teamSummary || /失敗|未読込/.test(teamSummary)) return "チーム未読込";
    if (sync.unsent) return `未送信あり ${sync.unsent}件`;
    return "運用準備OK";
  }

  private setSummaryChip(id: string, text: string, state: "ok" | "warn" | "danger" | "pending"): void {
    const chip = el(id);
    chip.textContent = text;
    chip.classList.remove("ok", "warn", "danger", "pending");
    chip.classList.add(state);
  }

  private adminContextLabel(password: string): string {
    return managedGasUrlsByPassword.get(AdminController.normalizeAdminPassword(password))?.label ?? "標準の管理設定";
  }

  private static normalizeAdminPassword(value: string): string {
    return value.trim().toLowerCase();
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
    const readiness = this.readinessSummary(Boolean(apiKey), Boolean(gasUrl), sync);
    const statusMessage = el("admin-status-message");
    statusMessage.textContent = readiness.text;
    statusMessage.classList.remove("ok", "warn", "danger", "pending", "ready-ok");
    statusMessage.classList.add(readiness.state);
    statusMessage.classList.toggle("ready-ok", readiness.text === "運用準備OK");
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

  private readinessSummary(hasApiKey: boolean, hasGasUrl: boolean, sync?: { unsent: number; reason: string }): { text: string; state: "ok" | "warn" | "danger" | "pending" } {
    if (!hasApiKey) return { text: "APIキー未入力", state: "warn" };
    if (!hasGasUrl || !el<HTMLInputElement>("gas-url").value.trim().endsWith("/exec")) return { text: "GAS未接続", state: "warn" };
    if (!this.connectionVerified) return { text: "接続未確認", state: "pending" };
    if (!this.timerSettingLoaded) return { text: "タイマー未読込", state: "pending" };
    const teamSummary = el("admin-summary-team").textContent;
    if (!teamSummary || /失敗|未読込/.test(teamSummary)) return { text: "チーム未読込", state: "warn" };
    if (sync?.unsent) return { text: `未送信あり ${sync.unsent}件 / ${sync.reason}`, state: "warn" };
    return { text: "運用準備OK", state: "ok" };
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
    return timerSettingSummary(setting);
  }

  private updateTimerSettingSummary(setting: ExternalTimerSetting | null, applied: boolean): void {
    const summary = el("timer-setting-summary");
    summary.replaceChildren();
    const title = document.createElement("span");
    title.textContent = applied || setting ? `タイマー設定: ${this.timerSettingSummary(setting)}` : "タイマー設定";
    summary.append(title);
    if (setting?.source === "sheet") {
      const note = document.createElement("small");
      note.className = "timer-setting-summary-note";
      note.textContent = "スプレッドシートから読み込んでいるため、手動での設定変更は不要です。";
      summary.append(note);
    }
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
  private activeAdminKey = "";
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
  private operationBallsFullscreen = false;
  private operationBallsScroll: { x: number; y: number } | null = null;
  private fullscreenReturnScreen: Screen | null = null;
  private mobileMenuOpen = false;
  private operationActive = false;
  private operationMatch = 1;
  private operationBallDrawn = false;
  private operationTimeDrawn = false;
  private rsamMode = false;
  private operationHomeTimer = 0;
  private operationHomeCountdownTimer = 0;
  private operationTimerFinishDelay = 0;
  private homeSyncNotice = "";
  private homeSyncState: "idle" | "running" | "success" | "warning" = "idle";
  private homeSyncAlertMarkup = "";
  private homeRiskMarkup = "";
  private readonly homeAudioCheck = new TimerAudioCueController();
  private homeAudioSyncFrame = 0;
  private homeSyncNoticeTimer = 0;
  private homeUnsentAlertTimer = 0;
  private operationStep: "home" | "team" | "draw" | "between" | "finished" = "home";
  private readonly pausedOperationStorageKey = `tennis-assist-paused-operation-v1-${this.variant.id}`;
  private pausedOperationPanelTimer = 0;
  private pausedOperationPanelSeriesId = "";
  private pausedOperationPanelAutoHidden = false;
  private pendingOperationAction: (() => void) | null = null;
  private operationActionHoldTimer = 0;
  private readonly operationReturnHoldTimers = new Map<HTMLButtonElement, number>();
  private pendingOperationReturnPrimary: (() => void) | null = null;
  private pendingOperationReturnSecondary: (() => void) | null = null;
  private pendingOperationReturnCancel: (() => void) | null = null;
  private waitingServiceWorker: ServiceWorker | null = null;
  private serviceWorkerReloadPending = false;

  constructor() {
    syncViewportMetrics();
    this.setupDoubleTapZoomGuard();
    window.addEventListener("resize", scheduleViewportMetricsSync, { passive: true });
    window.visualViewport?.addEventListener("resize", scheduleViewportMetricsSync, { passive: true });
    this.timer = new TimerController(
      (naturalEnd) => this.handleTimerFinished(Boolean(naturalEnd)),
      () => this.show("timer"),
      () => this.restoreFullscreenReturn("timer"),
    );
    this.timer.setExternalTimerSetting(AdminController.timerSetting());
    this.timer.setDashboardUsesExternalSetting(this.variant.id === "venue");
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
        if (this.handleOperationNavGuard(screen)) {
          this.closeMobileMenu();
          return;
        }
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
    el<HTMLButtonElement>("operation-balls-fullscreen").addEventListener("click", () => {
      void this.toggleOperationBallsFullscreen();
    });
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
        const wasOperationBallsFullscreen = this.operationBallsFullscreen;
        if (this.operationBallsFullscreen) this.setOperationBallsFullscreen(false);
        if (this.ballsFullscreen) this.setBallsFullscreen(false);
        if (!wasOperationBallsFullscreen) this.restoreFullscreenReturn();
      }
    });
    el<HTMLButtonElement>("admin-exit").addEventListener("click", () => this.confirmDeactivateSecret());
    el<HTMLButtonElement>("admin-exit-confirm").addEventListener("click", () => this.deactivateSecret());
    el<HTMLButtonElement>("admin-exit-cancel").addEventListener("click", () => el<HTMLDialogElement>("admin-exit-dialog").close());
    this.content.init();
    this.restorePersistedAdminSession();
    this.show(this.currentScreen());
    this.restoreOperationProgress();
    this.showUpdateCompleteNotice();
    void navigator.storage?.persist?.().catch(() => false);
    window.addEventListener("beforeunload", (event) => {
      if (!this.operationActive) return;
      event.preventDefault();
      event.returnValue = "";
    });
    if ("serviceWorker" in navigator && import.meta.env.PROD) {
      let refreshing = false;
      const activateWaitingWorker = (registration: ServiceWorkerRegistration): void => {
        if (!registration.waiting) return;
        if (this.operationActive) {
          this.waitingServiceWorker = registration.waiting;
          return;
        }
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
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
        if (this.operationActive) {
          this.serviceWorkerReloadPending = true;
          return;
        }
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

  private setupDoubleTapZoomGuard(): void {
    let lastSingleTouchEnd = 0;
    document.addEventListener(
      "touchend",
      (event) => {
        if (event.touches.length > 0 || event.changedTouches.length !== 1) return;
        const now = Date.now();
        if (now - lastSingleTouchEnd < 320) {
          event.preventDefault();
        }
        lastSingleTouchEnd = now;
      },
      { passive: false },
    );
  }

  private show(screen: Screen): void {
    if (this.operationActive && screen === "rules") screen = this.operationScreen();
    if (screen === "development") this.ensureAdminController();
    this.timer.noteActivity();
    if (screen !== "development") this.admin?.stopTransientChecks();
    if (screen !== this.operationScreen()) this.stopHomeAudioSync();
    if (screen !== "timer") void this.timer.leaveFullscreen();
    if (screen !== "referee") void this.refereeTimer.leaveFullscreen();
    if (screen !== "balls" && this.ballsFullscreen) void this.leaveBallsFullscreen();
    document.body.classList.remove("operation-step-home", "operation-step-team", "operation-step-draw", "operation-step-between", "operation-step-finished");
    if (screen === this.operationScreen()) document.body.classList.add(`operation-step-${this.operationStep}`);
    document.querySelectorAll(".screen").forEach((element) => element.classList.remove("active"));
    el(`screen-${screen}`).classList.add("active");
    document.querySelectorAll<HTMLButtonElement>(".nav").forEach((button) => button.classList.toggle("active", button.dataset.screen === screen));
    el("current-mode-label").textContent = screenLabels[screen];
    this.content.open(screen, this.secret);
    if (screen === "records") {
      this.records.openHistoryView();
    }
    if (screen === this.operationScreen() && this.operationStep === "home") {
      this.updateHomeSyncAlert();
      this.updatePausedOperationPanel(true);
    }
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
    if (this.variant.id === "general") {
      document.querySelectorAll<HTMLElement>("#navigation .venue-default-hidden").forEach((button) => {
        button.classList.remove("venue-default-hidden");
        button.removeAttribute("hidden");
        button.removeAttribute("aria-disabled");
      });
    }
    this.applyVenueScreenVisibility(AdminController.settings().venueScreenVisibility);
  }

  private applyVenueScreenVisibility(visibility: VenueScreenVisibility): void {
    if (this.variant.id !== "venue") return;
    (Object.keys(defaultVenueScreenVisibility) as ConfigurableVenueScreen[]).forEach((screen) => {
      document.querySelectorAll<HTMLElement>(`#navigation [data-screen="${screen}"]`).forEach((button) => {
        const visible = visibility[screen];
        button.classList.toggle("venue-default-hidden", !visible);
        button.classList.toggle("venue-screen-disabled", !visible);
        button.toggleAttribute("hidden", !visible);
        button.setAttribute("aria-disabled", String(!visible));
      });
    });
  }

  private showUpdateCompleteNotice(): void {
    const url = new URL(window.location.href);
    if (url.searchParams.get("appVersion") !== __APP_VERSION__ || !url.searchParams.has("reload")) return;
    this.homeSyncState = "success";
    this.homeSyncNotice = `最新版 v${__APP_VERSION__} を読み込みました。`;
    url.searchParams.delete("appVersion");
    url.searchParams.delete("reload");
    window.history.replaceState(null, "", url.toString());
    this.updateHomeSyncAlert();
    this.hideHomeSyncNoticeAfter(30000);
  }

  private operationScreen(): Screen {
    return document.getElementById("screen-operation") ? "operation" : "dashboard";
  }

  private restoreOperationProgress(): void {
    const paused = this.readPausedOperation();
    const resume = this.records.operationResumeState();
    const pausedIsCurrent = Boolean(paused && resume && this.records.currentOperationSeriesId() === paused.progress.series.id);
    if (pausedIsCurrent) {
      this.operationActive = false;
      this.setOperationNavigationLocked(false);
      this.show(this.operationScreen());
      this.showOperationStep("home");
      this.updatePausedOperationPanel();
      return;
    }
    if (!resume) {
      if (paused) {
        this.show(this.operationScreen());
        this.showOperationStep("home");
        this.updatePausedOperationPanel();
      }
      return;
    }
    this.operationActive = true;
    this.operationMatch = resume.match;
    this.setOperationNavigationLocked(true);
    if (resume.step === "final") {
      this.setOperationFinalReview(true);
      this.show("records");
      return;
    }
    if (resume.step === "result") {
      this.show("records");
      el("record-status").textContent = `第${resume.match}マッチのリザルト入力へ復帰しました。結果を確認して保存してください。`;
      return;
    }
    if (resume.step === "between") {
      this.show(this.operationScreen());
      this.showOperationStep("between");
      const endedMatch = Math.max(1, resume.match - 1);
      el("operation-ended-match").textContent = `第${endedMatch}マッチが終了しました`;
      el("operation-between-message").innerHTML = `<span class="operation-between-line">選手の皆さんはコートチェンジと、</span><span class="operation-between-line">第${resume.match}マッチの準備をお願いします。</span><span class="operation-between-note">（コートチェンジ後）ロボットのボタンを一度押したらスタートできる状態にしてください。準備ができ次第、抽選を行います。</span>`;
      el<HTMLButtonElement>("operation-next-match").textContent = `第${resume.match}マッチへ進む`;
      return;
    }
    this.balls.beginWorkflow(resume.match);
    this.timer.prepare(true);
    this.show(this.operationScreen());
    this.showOperationStep("draw");
    el("record-status").textContent = `第${resume.match}マッチの安全な再開位置へ戻りました。ボール配置と試合時間を再抽選してください。`;
  }

  private applyDeferredServiceWorkerUpdate(): void {
    if (this.operationActive) return;
    if (this.waitingServiceWorker) {
      const worker = this.waitingServiceWorker;
      this.waitingServiceWorker = null;
      worker.postMessage({ type: "SKIP_WAITING" });
      return;
    }
    if (this.serviceWorkerReloadPending) window.location.reload();
  }

  private setupOperationFlow(): void {
    this.syncOperationTeams();
    this.setupOperationActionDialog();
    this.setupOperationReturnDialog();
    this.updatePausedOperationPanel();
    el<HTMLButtonElement>("operation-prepare").addEventListener("click", () => {
      this.operationActive = true;
      this.setOperationNavigationLocked(true);
      this.clearOperationHomeTimer();
      this.syncOperationTeams();
      this.show(this.operationScreen());
      this.showOperationStep("team");
    });
    el<HTMLButtonElement>("operation-team-ok").addEventListener("click", () => this.openOperationStartCheck());
    el<HTMLSelectElement>("operation-match-type").addEventListener("change", () => void this.refreshOperationTeamsForMatchType());
    el<HTMLButtonElement>("operation-start-check-confirm").addEventListener("click", () => this.startOperationSeries());
    document.querySelectorAll<HTMLButtonElement>("[data-operation-back]").forEach((button) => {
      const context = button.dataset.operationReturnContext as "team" | "draw" | "between";
      this.setupOperationReturnTrigger(button, context);
    });
    this.setupOperationReturnTrigger(el<HTMLButtonElement>("operation-timer-back"), "timer");
    this.setupOperationReturnTrigger(el<HTMLButtonElement>("operation-result-back"), "result");
    el<HTMLButtonElement>("paused-operation-resume").addEventListener("click", () => this.resumePausedOperation());
    el<HTMLButtonElement>("paused-operation-discard").addEventListener("click", () => this.confirmDiscardPausedOperation());
    el<HTMLButtonElement>("operation-ball-random").addEventListener("click", () => {
      this.balls.randomize();
      this.operationBallDrawn = true;
      this.operationTimeDrawn = false;
      this.setOperationDrawButtonsLocked(true, false, true);
      this.setOperationDrawStage(2);
    });
    el<HTMLButtonElement>("operation-time-random").addEventListener("click", () => {
      if (!this.operationBallDrawn) return;
      this.timer.setDashboardOverride(null);
      this.timer.prepare(true);
      setText(els("dashboard-time"), this.timer.displayText());
      this.operationTimeDrawn = true;
      this.setOperationDrawButtonsLocked(true, true, false);
      this.setOperationDrawStage(3);
    });
    el<HTMLButtonElement>("operation-ready").addEventListener("click", () => {
      if (!this.operationBallDrawn || !this.operationTimeDrawn) return;
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
      this.setOperationIntermediateReview(false);
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
      this.setOperationIntermediateReview(false);
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
    document.addEventListener("admin-settings-updated", () => {
      this.updateHomeSyncAlert();
      this.updateOperationTimerMatchLabel();
      if (!this.operationActive) this.syncOperationTeams();
    });
    window.addEventListener("online", () => this.updateHomeSyncAlert());
    window.addEventListener("offline", () => this.updateHomeSyncAlert());
    window.addEventListener("storage", (event) => {
      if (event.key === "tennis-assist-records-v1" || event.key === "tennis-assist-admin-v1") this.updateHomeSyncAlert();
    });
    document.addEventListener("series-match-edit", () => {
      if (!this.operationActive) return;
      this.setOperationFinalReview(false);
      this.setOperationIntermediateReview(false);
      this.setOperationRecordFocus(true);
      this.show("records");
    });
    this.updateHomeSyncAlert();
  }

  private syncOperationTeams(): void {
    const assignedCourt = courtFromDeviceRole(AdminController.settings().deviceRole);
    const selectedCourt = assignedCourt && activeCourtOptions.includes(assignedCourt)
      ? assignedCourt
      : el<HTMLSelectElement>("court-select").value || activeCourtOptions[0];
    options(el<HTMLSelectElement>("operation-court"), activeCourtOptions, selectedCourt);
    options(el<HTMLSelectElement>("operation-match-type"), operationMatchTypeOptions, "試合種別を選択");
    this.records.clearTeamPriority();
    this.syncOperationTeamSelects();
  }

  private syncOperationTeamSelects(): void {
    const values = this.records.teamOptions();
    const priorityCount = this.records.priorityTeamCount();
    const teamASelect = el<HTMLSelectElement>("operation-team-a");
    const teamBSelect = el<HTMLSelectElement>("operation-team-b");
    const currentA = values.includes(teamASelect.value) ? teamASelect.value : values[0];
    const currentB = values.includes(teamBSelect.value) ? teamBSelect.value : values.find((team) => team !== currentA) ?? values[1] ?? values[0];
    teamOptions(teamASelect, values, currentA, priorityCount);
    teamOptions(teamBSelect, values, currentB, priorityCount);
  }

  private operationMatchType(): MatchType | null {
    const selected = el<HTMLSelectElement>("operation-match-type").value;
    return isOperationMatchType(selected) ? selected : null;
  }

  private async refreshOperationTeamsForMatchType(): Promise<void> {
    const matchType = this.operationMatchType();
    if (!matchType) {
      this.syncOperationTeamSelects();
      this.setOperationTeamStatus("");
      return;
    }
    if (!priorityTeamMatchTypes.has(matchType)) {
      this.records.clearTeamPriority();
      this.syncOperationTeamSelects();
      this.setOperationTeamStatus("");
      return;
    }
    const settings = AdminController.settings();
    if (!settings.gasUrl.endsWith("/exec") || !settings.apiKey) {
      this.syncOperationTeamSelects();
      this.setOperationTeamStatus("");
      return;
    }
    this.setOperationTeamStatus("試合種別に合わせてチーム候補を確認しています。");
    try {
      const result = await this.records.refreshTeamsForMatchType(matchType);
      this.syncOperationTeamSelects();
      if (result.priorityCount && result.priorityCount > 0) {
        this.setOperationTeamStatus(`${matchType}のチーム候補を選択リストの上に表示しました。`);
      } else {
        this.setOperationTeamStatus("");
      }
    } catch {
      this.syncOperationTeamSelects();
      this.setOperationTeamStatus("チーム候補の更新に失敗しました。通常のチームリストを使用します。", true);
    }
  }

  private openOperationStartCheck(): void {
    const court = el<HTMLSelectElement>("operation-court").value;
    const teamA = el<HTMLSelectElement>("operation-team-a").value;
    const teamB = el<HTMLSelectElement>("operation-team-b").value;
    if (teamA === teamB) {
      this.setOperationTeamStatus("左右で別のチームを選択してください。", true);
      return;
    }
    const assignedCourt = courtFromDeviceRole(AdminController.settings().deviceRole);
    if (assignedCourt && court !== assignedCourt) {
      this.setOperationTeamStatus(`この端末は「${assignedCourt}用」です。コート選択を${assignedCourt}に合わせてください。`, true);
      return;
    }
    const matchType = this.operationMatchType();
    if (!matchType) {
      this.setOperationTeamStatus("試合種別を選択してください。", true);
      return;
    }
    this.setOperationTeamStatus("");
    el("operation-start-check-detail").innerHTML =
      `<dl class="start-check-list">` +
      `<div><dt>コート</dt><dd>${escapeText(court)}</dd></div>` +
      `<div><dt>試合種別</dt><dd>${escapeText(matchType)}</dd></div>` +
      `<div class="start-check-teams"><dt>チーム</dt><dd><span class="start-check-team-card left"><b>左側チーム</b><strong>${escapeText(teamA)}</strong></span><span class="start-check-team-card right"><b>右側チーム</b><strong>${escapeText(teamB)}</strong></span></dd></div>` +
      `</dl>`;
    el<HTMLDialogElement>("operation-start-check-dialog").showModal();
  }

  private startOperationSeries(): void {
    const court = el<HTMLSelectElement>("operation-court").value;
    const teamA = el<HTMLSelectElement>("operation-team-a").value;
    const teamB = el<HTMLSelectElement>("operation-team-b").value;
    if (teamA === teamB) {
      this.setOperationTeamStatus("左右で別のチームを選択してください。", true);
      return;
    }
    const assignedCourt = courtFromDeviceRole(AdminController.settings().deviceRole);
    if (assignedCourt && court !== assignedCourt) {
      this.setOperationTeamStatus(`この端末は「${assignedCourt}用」です。コート選択を${assignedCourt}に合わせてください。`, true);
      return;
    }
    const matchType = this.operationMatchType();
    if (!matchType) {
      this.setOperationTeamStatus("試合種別を選択してください。", true);
      return;
    }
    this.setOperationTeamStatus("");
    this.operationActive = true;
    this.operationMatch = 1;
    this.clearOperationHomeTimer();
    this.records.startSeriesForOperation(teamA, teamB, court, matchType);
  }

  private setOperationTeamStatus(message: string, warning = false): void {
    const status = el("operation-team-status");
    status.textContent = message;
    status.classList.toggle("warning-message", warning && Boolean(message));
  }

  private showOperationStep(step: "home" | "team" | "draw" | "between" | "finished", options: { preserveDraw?: boolean } = {}): void {
    if (step !== "finished") this.setOperationRecordFocus(false);
    if (step !== "finished") this.setOperationFinalReview(false);
    if (step !== "finished") this.setOperationIntermediateReview(false);
    this.operationStep = step;
    document.body.classList.remove("operation-step-home", "operation-step-team", "operation-step-draw", "operation-step-between", "operation-step-finished");
    document.body.classList.add(`operation-step-${step}`);
    document.querySelectorAll(".operation-step").forEach((panel) => panel.classList.remove("active"));
    el(`operation-${step}`).classList.add("active");
    if (step === "draw" && !options.preserveDraw) {
      this.setOperationTimerActive(false);
      this.resetOperationDrawPreparation();
      el("operation-match-title").textContent = `【第${this.operationMatch}マッチ抽選】`;
    } else if (step === "draw") {
      this.setOperationTimerActive(false);
      el("operation-match-title").textContent = `【第${this.operationMatch}マッチ抽選】`;
    }
    if (step === "home") {
      this.updateHomeSyncAlert();
      this.updatePausedOperationPanel(true);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  private updateHomeSyncAlert(): void {
    this.updateHomeOperationSummary();
    this.updateHomeRiskPanel();
    const panel = document.getElementById("home-sync-alert");
    if (!panel) return;
    const sync = this.records.syncSummary();
    const settings = AdminController.settings();
    const hasGasHistory = this.hasGasUsageHistory(settings);
    if (sync.unsent && !hasGasHistory) {
      panel.classList.add("hidden");
      this.homeSyncAlertMarkup = "";
      this.clearHomeUnsentAlertTimer();
      return;
    }
    const showDelayedUnsent = this.shouldShowHomeUnsentAlert(sync);
    if (sync.unsent && !showDelayedUnsent && !this.homeSyncNotice) {
      this.scheduleHomeUnsentAlert(sync);
      panel.classList.add("hidden");
      if (this.homeSyncAlertMarkup) {
        panel.innerHTML = "";
        this.homeSyncAlertMarkup = "";
      }
      return;
    }
    if (sync.unsent) this.scheduleHomeUnsentAlert(sync);
    else this.clearHomeUnsentAlertTimer();
    panel.classList.toggle("hidden", sync.unsent === 0 && !sync.configured && !hasGasHistory);
    const gasState = sync.configured ? "GAS接続OK" : settings.sendEnabled === false ? "送信OFF" : "GAS未接続";
    panel.classList.remove("sync-running", "sync-success", "sync-warning");
    panel.classList.add(this.homeSyncState === "running" ? "sync-running" : this.homeSyncState === "success" ? "sync-success" : "sync-warning");
    let markup = "";
    if (!sync.unsent) {
      panel.classList.toggle("hidden", !this.homeSyncNotice);
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

  private clearTimedHomeSyncNotice(): void {
    if (this.homeSyncNoticeTimer) {
      window.clearTimeout(this.homeSyncNoticeTimer);
      this.homeSyncNoticeTimer = 0;
    }
  }

  private clearHomeUnsentAlertTimer(): void {
    if (!this.homeUnsentAlertTimer) return;
    window.clearTimeout(this.homeUnsentAlertTimer);
    this.homeUnsentAlertTimer = 0;
  }

  private shouldShowHomeUnsentAlert(sync: SyncSummary): boolean {
    if (!sync.unsent) return false;
    if (!sync.oldestUnsentAt) return true;
    return Date.now() - sync.oldestUnsentAt >= homeUnsentAlertDelayMs;
  }

  private scheduleHomeUnsentAlert(sync: SyncSummary): void {
    this.clearHomeUnsentAlertTimer();
    if (!sync.unsent || !sync.oldestUnsentAt) return;
    const remaining = homeUnsentAlertDelayMs - (Date.now() - sync.oldestUnsentAt);
    if (remaining <= 0) return;
    this.homeUnsentAlertTimer = window.setTimeout(() => {
      this.homeUnsentAlertTimer = 0;
      this.updateHomeSyncAlert();
    }, remaining + 50);
  }

  private hideHomeSyncNoticeAfter(ms: number): void {
    this.clearTimedHomeSyncNotice();
    this.homeSyncNoticeTimer = window.setTimeout(() => {
      const sync = this.records.syncSummary();
      if (this.homeSyncState === "success" && sync.unsent === 0) {
        this.homeSyncNotice = "";
        this.homeSyncAlertMarkup = "";
        this.updateHomeSyncAlert();
      }
      this.homeSyncNoticeTimer = 0;
    }, ms);
  }

  private updateHomeRiskPanel(): void {
    const panel = document.getElementById("home-risk-panel");
    if (!panel) return;
    const sync = this.records.syncSummary();
    const settings = AdminController.settings();
    const hasGasHistory = this.hasGasUsageHistory(settings);
    const device = deviceLabel(settings);
    const online = navigator.onLine;
    const checked = settings.dayCheckAt ? `最終チェック ${settings.dayCheckAt.slice(5, 16).replace("-", "/")}` : "当日チェック未実行";
    const gas = sync.configured ? "GAS接続OK" : settings.sendEnabled === false ? "送信OFF" : hasGasHistory ? "GAS未接続" : "GAS未設定";
    const gasState = sync.configured ? "ok" : hasGasHistory ? "warn" : "pending";
    const unsentState = sync.unsent ? "warn" : "ok";
    const onlineState = online ? "ok" : "warn";
    const checkedState = settings.dayCheckAt ? "ok" : "pending";
    const teamCount = this.records.teamOptions().length;
    const markup =
      `<details class="home-risk-details">` +
      `<summary>端末・接続情報</summary>` +
      `<div class="home-risk-chips">` +
      `<span class="home-risk-chip ok">使用コート: ${escapeText(courtRangeLabel())}</span>` +
      `<span class="home-risk-chip ok">チーム数: ${teamCount}</span>` +
      `<span class="home-risk-chip ok">${escapeText(device)} / v${escapeText(__APP_VERSION__)}</span>` +
      (hasGasHistory || sync.configured ? `<span class="home-risk-chip ${gasState}">${escapeText(gas)}</span>` : "") +
      (hasGasHistory || sync.unsent ? `<span class="home-risk-chip ${unsentState}">未送信 ${sync.unsent}件${sync.unsent ? ` / ${escapeText(sync.reason)}` : ""}</span>` : "") +
      `<span class="home-risk-chip ${onlineState}">${online ? "オンライン" : "オフライン"}</span>` +
      `<span class="home-risk-chip ${checkedState}">${escapeText(checked)}</span>` +
      `</div>` +
      `<div class="home-risk-actions"><button id="home-force-update" class="button primary tiny home-force-update-button" type="button">強制更新</button><button id="home-sound-test" class="button tiny home-sound-test-button" type="button">30秒音再生</button></div>` +
      `<div class="home-audio-sync">` +
      `<div class="home-audio-sync-title"><strong>10秒音声同期確認</strong><span>10秒表示と音のタイミングを確認</span></div>` +
      `<output id="home-audio-sync-time" class="digital audio-sync-time home-audio-sync-time" aria-live="polite" role="timer">00 : 10</output>` +
      `<p id="home-audio-sync-status" class="hint">5秒から短音、0秒で長音を再生します。</p>` +
      `<div class="home-audio-sync-actions"><button id="home-audio-sync-test" class="button tiny" type="button">10秒タイマー音声を再生</button></div>` +
      `</div>` +
      `</details>`;
    if (this.homeRiskMarkup === markup) return;
    panel.innerHTML = markup;
    this.homeRiskMarkup = markup;
    panel.querySelector<HTMLButtonElement>("#home-force-update")?.addEventListener("click", () => void this.forceUpdate());
    panel.querySelector<HTMLButtonElement>("#home-sound-test")?.addEventListener("click", () => void this.playSoundTest());
    panel.querySelector<HTMLButtonElement>("#home-audio-sync-test")?.addEventListener("click", () => void this.testHomeAudioSync());
  }

  private async forceUpdate(): Promise<void> {
    this.homeSyncState = "running";
    this.homeSyncNotice = "強制更新を実行しています。再読み込み後にバージョンを確認してください。";
    this.updateHomeSyncAlert();
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update()));
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch {
      // Reloading with a cache-busting query is still useful if cache APIs fail.
    }
    const url = new URL(window.location.href);
    url.searchParams.set("appVersion", __APP_VERSION__);
    url.searchParams.set("reload", String(Date.now()));
    window.location.replace(url.toString());
  }

  private async playSoundTest(): Promise<void> {
    this.stopHomeAudioSync();
    try {
      await this.homeAudioCheck.testThirtySeconds();
      this.homeSyncState = "success";
      this.homeSyncNotice = "開始30秒の音を再生しました。聞こえない場合は端末音量、マナーモード、ブラウザ設定を確認してください。";
      this.hideHomeSyncNoticeAfter(20000);
    } catch {
      this.homeSyncState = "warning";
      this.homeSyncNotice = "音声テストを再生できませんでした。端末音量、マナーモード、ブラウザの音声許可を確認してください。";
      this.hideHomeSyncNoticeAfter(30000);
    }
    this.updateHomeSyncAlert();
  }

  private stopHomeAudioSync(): void {
    if (this.homeAudioSyncFrame) {
      cancelAnimationFrame(this.homeAudioSyncFrame);
      this.homeAudioSyncFrame = 0;
    }
    this.homeAudioCheck.stopScheduled();
    const button = document.getElementById("home-audio-sync-test") as HTMLButtonElement | null;
    if (button) {
      button.disabled = false;
      button.textContent = "10秒タイマー音声を再生";
    }
  }

  private async testHomeAudioSync(): Promise<void> {
    this.stopHomeAudioSync();
    const output = document.getElementById("home-audio-sync-time");
    const status = document.getElementById("home-audio-sync-status");
    const button = document.getElementById("home-audio-sync-test") as HTMLButtonElement | null;
    if (!output || !status || !button) return;
    button.disabled = true;
    button.textContent = "再生中…";
    output.classList.remove("warning");
    output.textContent = "00 : 10";
      status.textContent = "10秒から開始します。5秒から短音、0秒で長音を確認してください。";
    try {
      await this.homeAudioCheck.prepare();
      const startedAt = performance.now();
      this.homeAudioCheck.scheduleRefereeCountdown(10);
      const render = (): void => {
        const elapsed = Math.min(10, Math.max(0, (performance.now() - startedAt) / 1000));
        const remaining = Math.max(0, Math.ceil(10 - elapsed));
        output.textContent = `00 : ${String(remaining).padStart(2, "0")}`;
        output.classList.toggle("warning", remaining <= 5 && remaining > 0);
        if (remaining > 0) {
          this.homeAudioSyncFrame = requestAnimationFrame(render);
          return;
        }
        this.homeAudioSyncFrame = 0;
        button.disabled = false;
        button.textContent = "10秒タイマー音声を再生";
        status.textContent = "同期確認が完了しました。0秒の長音まで確認してください。";
      };
      this.homeAudioSyncFrame = requestAnimationFrame(render);
    } catch {
      button.disabled = false;
      button.textContent = "10秒タイマー音声を再生";
      status.textContent = "同期確認を開始できませんでした。端末音量、マナーモード、ブラウザ設定を確認してください。";
    }
  }

  private hasGasUsageHistory(settings = AdminController.settings()): boolean {
    return Boolean(settings.apiKey || settings.gasConnectedAt || settings.gasConnectedUrl);
  }

  private updateHomeOperationSummary(): void {
    const panel = document.getElementById("home-operation-summary");
    if (!panel) return;
    const resume = this.records.operationResumeState();
    const paused = this.readPausedOperation();
    const currentMatch = resume?.match ?? this.operationMatch;
    let markup = "";
    let action: "resume-current" | "resume-paused" | "" = "";
    if (this.operationActive || resume) {
      const step = resume?.step;
      const label =
        this.operationStep === "team" ? "コート・チーム選択中" :
        this.operationStep === "draw" || step === "draw" ? `第${currentMatch}マッチ 抽選中` :
        step === "result" ? `第${currentMatch}マッチ リザルト入力中` :
        step === "between" ? `第${Math.max(1, currentMatch - 1)}マッチ終了 / 第${currentMatch}マッチ準備中` :
        step === "final" || this.operationStep === "finished" ? "最終試合結果 確認中" :
        "試合進行中";
      markup =
        `<span class="home-operation-state">現在: ${escapeText(label)}</span>` +
        `<span>迷った場合はこのボタンから進行中の画面へ戻れます。</span>` +
        `<button id="home-operation-resume-current" class="button compact" type="button">進行中の画面へ</button>`;
      action = "resume-current";
    } else if (paused) {
      const stage = paused.step === "result" ? `第${paused.match}マッチ リザルト入力` : `第${paused.match}マッチ 抽選`;
      const series = paused.progress.series;
      markup =
        `<span class="home-operation-state warning">中断中: ${escapeText(series.teamA)} vs ${escapeText(series.teamB)}</span>` +
        `<span>${escapeText(stage)}で中断しています。</span>` +
        `<button id="home-operation-resume-paused" class="button compact" type="button">中断記録を再開</button>`;
      action = "resume-paused";
    }
    panel.classList.toggle("hidden", !markup);
    if (!markup) {
      if (panel.innerHTML) panel.innerHTML = "";
      return;
    }
    if (panel.innerHTML !== markup) panel.innerHTML = markup;
    if (action === "resume-current") {
      const button = panel.querySelector<HTMLButtonElement>("#home-operation-resume-current");
      if (button) button.onclick = () => this.restoreOperationProgress();
    } else if (action === "resume-paused") {
      const button = panel.querySelector<HTMLButtonElement>("#home-operation-resume-paused");
      if (button) button.onclick = () => this.resumePausedOperation();
    }
  }

  private async retryHomeUnsent(): Promise<void> {
    this.clearTimedHomeSyncNotice();
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
    if (!sync.unsent) this.hideHomeSyncNoticeAfter(10000);
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

  private setOperationDrawButtonsLocked(ballLocked: boolean, timeLocked: boolean, readyLocked = false): void {
    el<HTMLButtonElement>("operation-ball-random").disabled = ballLocked;
    el<HTMLButtonElement>("operation-time-random").disabled = timeLocked;
    el<HTMLButtonElement>("operation-ready").disabled = readyLocked;
  }

  private setupOperationReturnTrigger(button: HTMLButtonElement, context: "team" | "draw" | "between" | "timer" | "result"): void {
    const cancelHold = (): void => {
      const timer = this.operationReturnHoldTimers.get(button);
      if (timer) window.clearTimeout(timer);
      this.operationReturnHoldTimers.delete(button);
      button.classList.remove("is-holding");
    };
    const startHold = (): void => {
      if (button.disabled || this.operationReturnHoldTimers.has(button)) return;
      button.classList.add("is-holding");
      const timer = window.setTimeout(() => {
        this.operationReturnHoldTimers.delete(button);
        button.classList.remove("is-holding");
        this.handleOperationReturnTrigger(context);
      }, holdConfirmDurationMs);
      this.operationReturnHoldTimers.set(button, timer);
    };
    button.addEventListener("click", (event) => event.preventDefault());
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      startHold();
    });
    ["pointerup", "pointercancel"].forEach((eventName) => button.addEventListener(eventName, cancelHold));
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("keydown", (event) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        startHold();
      }
    });
    button.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") cancelHold();
    });
  }

  private setupOperationReturnDialog(): void {
    const dialog = el<HTMLDialogElement>("operation-return-dialog");
    el<HTMLButtonElement>("operation-return-close").addEventListener("click", () => dialog.close());
    el<HTMLButtonElement>("operation-return-primary").addEventListener("click", () => {
      const action = this.pendingOperationReturnPrimary;
      dialog.close();
      action?.();
    });
    el<HTMLButtonElement>("operation-return-secondary").addEventListener("click", () => {
      const action = this.pendingOperationReturnSecondary;
      dialog.close();
      action?.();
    });
    el<HTMLButtonElement>("operation-cancel-record").addEventListener("click", () => {
      const action = this.pendingOperationReturnCancel;
      dialog.close();
      action?.();
    });
    dialog.addEventListener("close", () => {
      this.pendingOperationReturnPrimary = null;
      this.pendingOperationReturnSecondary = null;
      this.pendingOperationReturnCancel = null;
    });
  }

  private handleOperationReturnTrigger(context: "team" | "draw" | "between" | "timer" | "result"): void {
    if (!this.operationActive) return;
    if (context === "team" || context === "between") {
      this.requestOperationBack();
      return;
    }
    if (context === "timer" && !this.operationTimeDrawn) return;
    if (context === "timer" && !document.body.classList.contains("operation-timer-returnable")) {
      this.confirmOperationTimerBack();
      return;
    }
    if (context === "draw") {
      this.openOperationReturnMenu(
        this.operationMatch > 1 ? "中間結果を表示" : "コート・チーム選択へ戻る",
        () => this.requestOperationBack(),
        "",
        null,
        () => this.confirmOperationPause("draw"),
      );
      return;
    }
    if (context === "timer") {
      this.openOperationReturnMenu(
        "マッチ抽選へ戻る",
        () => this.confirmOperationTimerBack(),
        "リザルト入力へ戻る",
        () => this.confirmOperationRecordReturn(),
      );
      return;
    }
    this.openOperationReturnMenu(
      "抽選済み時間でタイマーへ戻る",
      () => this.returnOperationTimerFromResult(this.operationMatch || this.records.currentMatchNumber()),
      "",
      null,
      () => this.confirmOperationPause("result"),
    );
  }

  private openOperationReturnMenu(
    primaryLabel: string,
    primaryAction: () => void,
    secondaryLabel = "",
    secondaryAction: (() => void) | null = null,
    cancelAction: (() => void) | null = null,
  ): void {
    const dialog = el<HTMLDialogElement>("operation-return-dialog");
    this.pendingOperationReturnPrimary = primaryAction;
    this.pendingOperationReturnSecondary = secondaryAction;
    this.pendingOperationReturnCancel = cancelAction;
    const primary = el<HTMLButtonElement>("operation-return-primary");
    const secondary = el<HTMLButtonElement>("operation-return-secondary");
    const cancel = el<HTMLButtonElement>("operation-cancel-record");
    primary.textContent = primaryLabel;
    secondary.textContent = secondaryLabel;
    secondary.classList.toggle("hidden", !secondaryAction);
    cancel.classList.toggle("hidden", !cancelAction);
    el("operation-return-message").textContent = secondaryAction || cancelAction ? "戻る場所または操作を選択してください。" : "戻る場所を選択してください。";
    if (!dialog.open) dialog.showModal();
  }

  private setupOperationActionDialog(): void {
    const dialog = el<HTMLDialogElement>("operation-action-dialog");
    const button = el<HTMLButtonElement>("operation-action-confirm");
    button.addEventListener("click", (event) => event.preventDefault());
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      this.startOperationActionHold();
    });
    ["pointerup", "pointercancel"].forEach((eventName) => {
      button.addEventListener(eventName, () => this.cancelOperationActionHold());
    });
    button.addEventListener("contextmenu", (event) => event.preventDefault());
    button.addEventListener("keydown", (event) => {
      if ((event.key === " " || event.key === "Enter") && !event.repeat) {
        event.preventDefault();
        this.startOperationActionHold();
      }
    });
    button.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") this.cancelOperationActionHold();
    });
    dialog.addEventListener("close", () => this.cancelOperationActionHold(true));
  }

  private openOperationAction(title: string, message: string, confirmLabel: string, action: () => void, danger = true): void {
    this.cancelOperationActionHold(true);
    this.pendingOperationAction = action;
    el("operation-action-title").textContent = title;
    el("operation-action-message").textContent = message;
    const button = el<HTMLButtonElement>("operation-action-confirm");
    button.textContent = confirmLabel;
    button.classList.toggle("danger", danger);
    button.classList.toggle("primary", !danger);
    el<HTMLDialogElement>("operation-action-dialog").showModal();
  }

  private startOperationActionHold(): void {
    if (!this.pendingOperationAction || this.operationActionHoldTimer) return;
    const button = el<HTMLButtonElement>("operation-action-confirm");
    button.classList.add("is-holding");
    this.operationActionHoldTimer = window.setTimeout(() => {
      const action = this.pendingOperationAction;
      this.operationActionHoldTimer = 0;
      this.pendingOperationAction = null;
      button.classList.remove("is-holding");
      el<HTMLDialogElement>("operation-action-dialog").close();
      action?.();
    }, holdConfirmDurationMs);
  }

  private cancelOperationActionHold(clearAction = false): void {
    if (this.operationActionHoldTimer) {
      window.clearTimeout(this.operationActionHoldTimer);
      this.operationActionHoldTimer = 0;
    }
    el<HTMLButtonElement>("operation-action-confirm").classList.remove("is-holding");
    if (clearAction) this.pendingOperationAction = null;
  }

  private readPausedOperation(): PausedOperationState | null {
    try {
      const raw = localStorage.getItem(this.pausedOperationStorageKey);
      if (!raw) return null;
      const state = JSON.parse(raw) as Omit<Partial<PausedOperationState>, "version"> & { version?: number };
      const progress = state.version === 2 ? state.progress : this.records.operationProgressSnapshot();
      const valid = (state.version === 1 || state.version === 2)
        && (state.step === "draw" || state.step === "result")
        && Number.isInteger(state.match)
        && Number(state.match) >= 1
        && Number(state.match) <= 3
        && typeof state.ballDrawn === "boolean"
        && typeof state.timeDrawn === "boolean"
        && Number.isFinite(state.timerSeconds)
        && Array.isArray(state.ballLayout)
        && Boolean(state.recordInput && typeof state.recordInput === "object")
        && Boolean(progress?.series?.id && progress.series.teamA && progress.series.teamB)
        && Array.isArray(progress?.series?.records)
        && (progress?.series?.records.length ?? 0) > 0
        && progress?.operationManaged === true
        && typeof state.savedAt === "string";
      if (!valid) {
        localStorage.removeItem(this.pausedOperationStorageKey);
        return null;
      }
      const normalized: PausedOperationState = {
        version: 2,
        match: Number(state.match),
        step: state.step as "draw" | "result",
        ballDrawn: state.ballDrawn as boolean,
        timeDrawn: state.timeDrawn as boolean,
        timerSeconds: Number(state.timerSeconds),
        ballLayout: state.ballLayout as BallLayout,
        recordInput: state.recordInput as RecordInputSnapshot,
        progress: progress as PersistedSeriesProgress,
        savedAt: state.savedAt as string,
      };
      if (state.version !== 2) localStorage.setItem(this.pausedOperationStorageKey, JSON.stringify(normalized));
      return normalized;
    } catch {
      try {
        localStorage.removeItem(this.pausedOperationStorageKey);
      } catch {
        // Storage can be unavailable in private browsing or when the device is full.
      }
      return null;
    }
  }

  private clearPausedOperation(): void {
    try {
      localStorage.removeItem(this.pausedOperationStorageKey);
    } catch {
      // The UI remains usable even when storage is unavailable.
    }
    this.resetPausedOperationPanelDisplay();
  }

  private resetPausedOperationPanelDisplay(): void {
    if (this.pausedOperationPanelTimer) {
      window.clearTimeout(this.pausedOperationPanelTimer);
      this.pausedOperationPanelTimer = 0;
    }
    this.pausedOperationPanelSeriesId = "";
    this.pausedOperationPanelAutoHidden = false;
  }

  private updatePausedOperationPanel(reveal = false): void {
    const state = this.readPausedOperation();
    const panel = el("paused-operation-panel");
    if (!state) {
      this.resetPausedOperationPanelDisplay();
      panel.classList.add("hidden");
      return;
    }
    const seriesId = state.progress.series.id;
    if (this.pausedOperationPanelSeriesId !== seriesId) {
      this.resetPausedOperationPanelDisplay();
      this.pausedOperationPanelSeriesId = seriesId;
    }
    if (reveal) this.pausedOperationPanelAutoHidden = false;
    panel.classList.toggle("hidden", this.pausedOperationPanelAutoHidden);
    const stage = state.step === "result" ? `第${state.match}マッチ リザルト入力` : `第${state.match}マッチ 抽選`;
    const series = state.progress.series;
    el("paused-operation-summary").textContent = `${series.teamA} vs ${series.teamB} / ${stage}で中断しました。スプレッドシートには送信されていません。`;
    if (!this.pausedOperationPanelAutoHidden && !this.pausedOperationPanelTimer) {
      this.pausedOperationPanelTimer = window.setTimeout(() => {
        this.pausedOperationPanelTimer = 0;
        if (this.pausedOperationPanelSeriesId !== seriesId) return;
        this.pausedOperationPanelAutoHidden = true;
        panel.classList.add("hidden");
      }, 180000);
    }
  }

  private confirmOperationPause(step: "draw" | "result"): void {
    if (!this.operationActive) return;
    if (!this.records.hasCompletedOperationMatch()) {
      this.openOperationAction(
        "試合をキャンセルしますか？",
        "第1マッチの結果が未確定のため、中断記録は保存せずホームへ戻ります。",
        "1秒長押しで試合をキャンセル",
        () => {
          this.returnOperationHome(true);
          this.updatePausedOperationPanel();
        },
      );
      return;
    }
    const paused = this.readPausedOperation();
    const currentSeriesId = this.records.currentOperationSeriesId();
    if (paused && paused.progress.series.id !== currentSeriesId) {
      window.alert("すでに別の中断記録があります。先に中断記録を再開または削除してから、現在の試合をキャンセルしてください。");
      return;
    }
    this.openOperationAction(
      "試合をキャンセルしますか？",
      "現在の試合はスプレッドシートへ送信せず、端末内の中断データとして保存してホームへ戻ります。\n\nホームから再開できます。",
      "1秒長押しで試合をキャンセル",
      () => this.pauseOperation(step),
    );
  }

  private pauseOperation(step: "draw" | "result"): void {
    if (!this.records.pauseForOperation()) {
      el("record-status").textContent = "端末内に中断データを保存できないため、試合をキャンセルしませんでした。";
      return;
    }
    const progress = this.records.operationProgressSnapshot();
    if (!progress) {
      el("record-status").textContent = "端末内に中断データを保存できないため、試合をキャンセルしませんでした。";
      return;
    }
    const state: PausedOperationState = {
      version: 2,
      match: this.operationMatch || this.records.currentMatchNumber(),
      step,
      ballDrawn: this.operationBallDrawn,
      timeDrawn: this.operationTimeDrawn,
      timerSeconds: this.timer.preparedSeconds(),
      ballLayout: this.balls.snapshotLayout(),
      recordInput: this.records.operationInputSnapshot(),
      progress,
      savedAt: timestamp(),
    };
    try {
      localStorage.setItem(this.pausedOperationStorageKey, JSON.stringify(state));
    } catch {
      el("record-status").textContent = "端末内に中断データを保存できないため、試合をキャンセルしませんでした。";
      return;
    }
    this.returnOperationHome(false);
    this.updatePausedOperationPanel();
  }

  private resumePausedOperation(): void {
    const state = this.readPausedOperation();
    if (!state) {
      this.updatePausedOperationPanel();
      return;
    }
    if (!this.records.restoreOperationProgress(state.progress) || !this.records.operationResumeState()) {
      el("record-status").textContent = "中断記録を端末内に復元できませんでした。中断記録は削除していません。";
      this.updatePausedOperationPanel();
      return;
    }
    this.operationActive = true;
    this.operationMatch = state.match;
    this.operationBallDrawn = state.ballDrawn;
    this.operationTimeDrawn = state.timeDrawn;
    this.setOperationNavigationLocked(true);
    this.clearOperationHomeTimer();
    this.balls.beginWorkflow(state.match);
    this.balls.restoreLayout(state.ballLayout);
    this.timer.setDashboardOverride(null);
    this.timer.restorePreparedDuration(state.timerSeconds);
    this.updatePausedOperationPanel();
    if (state.step === "result") {
      this.records.restoreOperationInput(state.recordInput);
      this.setOperationIntermediateReview(false);
      this.setOperationFinalReview(false);
      this.setOperationRecordFocus(true);
      this.show("records");
      this.clearPausedOperation();
      this.updatePausedOperationPanel();
      el("record-status").textContent = `第${state.match}マッチのリザルト入力を再開しました。`;
      return;
    }
    this.show(this.operationScreen());
    this.showOperationStep("draw", { preserveDraw: true });
    if (!state.ballDrawn) {
      this.setOperationDrawButtonsLocked(false, true, true);
      this.setOperationDrawStage(1);
      this.timer.setDashboardOverride("00 : 00");
      setText(els("dashboard-time"), "00 : 00");
    } else if (!state.timeDrawn) {
      this.setOperationDrawButtonsLocked(true, false, true);
      this.setOperationDrawStage(2);
      this.timer.setDashboardOverride("00 : 00");
      setText(els("dashboard-time"), "00 : 00");
    } else {
      this.setOperationDrawButtonsLocked(true, true, false);
      this.setOperationDrawStage(3);
      setText(els("dashboard-time"), this.timer.displayText());
    }
    this.clearPausedOperation();
    this.updatePausedOperationPanel();
  }

  private confirmDiscardPausedOperation(): void {
    const state = this.readPausedOperation();
    if (!state) return;
    this.openOperationAction(
      "中断記録を削除しますか？",
      "端末内に保存した試合進行と未確定の結果を削除します。この操作は元に戻せません。",
      "1秒長押しで中断記録を削除",
      () => {
        this.clearPausedOperation();
        this.records.discardOperationProgress(state.progress.series.id);
        this.returnOperationHome(false);
        this.updatePausedOperationPanel();
      },
    );
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
    if (active) this.setOperationIntermediateReview(false);
  }

  private setOperationFinalReview(active: boolean): void {
    document.body.classList.toggle("operation-final-review", active);
    if (active) this.setOperationIntermediateReview(false);
  }

  private setOperationIntermediateReview(active: boolean): void {
    document.body.classList.toggle("operation-intermediate-review", active);
  }

  private setOperationNavigationLocked(active: boolean): void {
    document.body.classList.toggle("operation-navigation-locked", active);
  }

  private setOperationTimerActive(active: boolean): void {
    document.body.classList.toggle("operation-timer-active", active);
    this.updateOperationTimerMatchLabel(active);
  }

  private updateOperationTimerMatchLabel(active = document.body.classList.contains("operation-timer-active")): void {
    const label = el("operation-timer-match-label");
    const settings = AdminController.settings();
    label.textContent = `第${this.operationMatch}マッチ`;
    label.style.fontSize = `${settings.operationMatchLabelSize}px`;
    label.classList.toggle("hidden", !active || !settings.showOperationMatchLabel);
  }

  private setOperationTimerReturnable(active: boolean): void {
    document.body.classList.toggle("operation-timer-returnable", active);
  }

  private startOperationTimer(): void {
    this.clearOperationHomeTimer();
    this.clearOperationTimerFinishDelay();
    this.timer.setDashboardOverride(null);
    this.setOperationDrawStage(3);
    this.operationBallDrawn = true;
    this.operationTimeDrawn = true;
    this.setOperationDrawButtonsLocked(true, true, false);
    this.setFlow(this.operationMatch, "タイマー待機中");
    this.recordTimerPending = true;
    this.setOperationTimerReturnable(false);
    this.show("timer");
    this.setOperationTimerActive(true);
    void this.timer.enterDisplayFullscreen();
  }

  private resetOperationDrawPreparation(): void {
    this.operationBallDrawn = false;
    this.operationTimeDrawn = false;
    this.setOperationDrawButtonsLocked(false, true, true);
    this.setOperationDrawStage(1);
    this.timer.setDashboardOverride("00 : 00");
    setText(els("dashboard-time"), "00 : 00");
  }

  private returnOperationRecordInput(): void {
    if (!this.operationActive) return;
    this.clearOperationHomeTimer();
    void this.timer.leaveFullscreen();
    this.setOperationTimerReturnable(false);
    this.setOperationTimerActive(false);
    this.setOperationIntermediateReview(false);
    this.setOperationRecordFocus(true);
    this.show("records");
  }

  private confirmOperationRecordReturn(): void {
    if (!this.operationActive || !el("screen-timer").classList.contains("active")) return;
    this.openOperationAction(
      "リザルト入力へ戻りますか？",
      "タイマーを終了し、現在のマッチのリザルト入力へ戻ります。",
      "1秒長押しでリザルト入力へ戻る",
      () => this.returnOperationRecordInput(),
    );
  }

  private returnOperationTimerFromResult(match: number): void {
    if (!this.operationActive || !document.body.classList.contains("operation-record-focus")) return;
    this.openOperationAction(
      "抽選済み時間でタイマーへ戻りますか？",
      "試合時間とボール配置は再抽選されません。タイマーは抽選済み時間からやり直します。",
      "1秒長押しでタイマーへ戻る",
      () => this.completeReturnOperationTimerFromResult(match),
    );
  }

  private completeReturnOperationTimerFromResult(match: number): void {
    this.clearOperationHomeTimer();
    this.clearOperationTimerFinishDelay();
    void this.timer.leaveFullscreen();
    this.timer.setDashboardOverride(null);
    this.timer.restartPreparedDuration();
    this.operationActive = true;
    this.operationMatch = match || this.records.currentMatchNumber();
    this.operationBallDrawn = true;
    this.operationTimeDrawn = true;
    this.setOperationDrawButtonsLocked(true, true, false);
    this.setOperationDrawStage(3);
    this.recordTimerPending = true;
    this.setOperationNavigationLocked(true);
    this.setOperationRecordFocus(false);
    this.setOperationIntermediateReview(false);
    this.setOperationFinalReview(false);
    this.setOperationTimerReturnable(true);
    this.setFlow(this.operationMatch, "タイマー待機中");
    this.show("timer");
    this.setOperationTimerActive(true);
    void this.timer.enterDisplayFullscreen();
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
      }, 3000);
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
    this.openOperationAction(
      "マッチ抽選へ戻りますか？",
      "ボール配置と試合時間は保持されます。タイマーをやり直す場合は、③準備完了を押してください。",
      "1秒長押しでマッチ抽選へ戻る",
      () => this.goOperationBack(),
    );
  }

  private requestOperationBack(): void {
    this.openOperationAction(
      "前の画面に戻りますか？",
      "現在の入力内容や試合進行を確認してから戻ってください。",
      "1秒長押しで前の画面に戻る",
      () => this.goOperationBack(),
    );
  }

  private handleOperationNavGuard(screen: Screen): boolean {
    if (!this.operationActive) return false;
    if (screen === "timer" || screen === "referee" || screen === "balls" || screen === "links" || screen === "news") {
      return true;
    }
    if (screen === "dashboard" && (document.body.classList.contains("operation-record-focus") || !el("record-input").classList.contains("hidden"))) {
      return true;
    }
    if (screen === "records" && this.operationStep === "draw") {
      if (this.operationMatch > 1) {
        this.setOperationIntermediateReview(true);
        this.show("records");
      }
      return true;
    }
    return false;
  }

  private goOperationBack(): void {
    this.clearOperationHomeTimer();
    this.clearOperationTimerFinishDelay();
    if (document.body.classList.contains("operation-record-focus")) {
      this.completeReturnOperationTimerFromResult(this.operationMatch || this.records.currentMatchNumber());
      return;
    }
    if (document.body.classList.contains("operation-final-review")) {
      this.setOperationFinalReview(false);
      this.setOperationRecordFocus(true);
      this.show("records");
      return;
    }
    if (document.body.classList.contains("operation-intermediate-review")) {
      this.setOperationIntermediateReview(false);
      this.show(this.operationScreen());
      this.showOperationStep("draw", { preserveDraw: true });
      this.operationBallDrawn = true;
      this.operationTimeDrawn = true;
      this.setOperationDrawButtonsLocked(true, true, false);
      return;
    }
    if (el("screen-timer").classList.contains("active")) {
      void this.timer.leaveFullscreen();
      this.timer.restartPreparedDuration();
      this.recordTimerPending = false;
      this.setOperationTimerActive(false);
      this.setOperationTimerReturnable(false);
      this.show(this.operationScreen());
      this.showOperationStep("draw", { preserveDraw: true });
      this.operationBallDrawn = true;
      this.operationTimeDrawn = true;
      this.setOperationDrawButtonsLocked(true, true, false);
      this.setOperationDrawStage(3);
      return;
    }
    if (this.operationStep === "between") {
      this.setOperationIntermediateReview(true);
      this.show("records");
      return;
    }
    if (this.operationStep === "draw") {
      if (this.operationMatch > 1) {
        this.setOperationIntermediateReview(true);
        this.show("records");
        return;
      }
      this.balls.resetWorkflow();
      this.balls.resetLayout();
      this.resetOperationDrawPreparation();
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
    this.setOperationIntermediateReview(false);
    this.setOperationNavigationLocked(false);
    this.setOperationTimerActive(false);
    this.setOperationTimerReturnable(false);
    this.operationBallDrawn = false;
    this.operationTimeDrawn = false;
    this.setOperationDrawButtonsLocked(false, true, true);
    if (resetSeries) this.records.resetForOperation();
    this.clearFlow();
    this.balls.resetWorkflow();
    this.timer.resetDefault();
    this.show(this.operationScreen());
    this.showOperationStep("home");
    this.applyDeferredServiceWorkerUpdate();
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
    setText(els<HTMLButtonElement>("operation-balls-fullscreen"), active ? "全画面解除" : "ボール配置を全画面表示");
  }

  private async toggleOperationBallsFullscreen(): Promise<void> {
    if (this.operationBallsFullscreen) {
      await this.leaveOperationBallsFullscreen();
      return;
    }
    this.operationBallsScroll = { x: window.scrollX, y: window.scrollY };
    this.setOperationBallsFullscreen(true);
  }

  private async leaveOperationBallsFullscreen(): Promise<void> {
    if (document.fullscreenElement === el("operation-court-panel")) {
      try {
        await document.exitFullscreen?.();
      } catch {
        // The in-page focused layout can still be restored.
      }
    }
    this.setOperationBallsFullscreen(false);
    const scroll = this.operationBallsScroll;
    this.operationBallsScroll = null;
    if (scroll) {
      requestAnimationFrame(() => {
        window.scrollTo({ left: scroll.x, top: scroll.y, behavior: "instant" });
      });
    }
  }

  private setOperationBallsFullscreen(active: boolean): void {
    this.operationBallsFullscreen = active;
    document.body.classList.toggle("operation-balls-compact", active);
    document.documentElement.classList.toggle("operation-balls-compact", active);
    el<HTMLButtonElement>("operation-balls-fullscreen").textContent = active ? "全画面解除" : "ボール配置を全画面表示";
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
      if (this.operationActive) {
        if (document.body.classList.contains("operation-record-focus")) this.returnOperationTimerFromResult(match);
        return;
      }
      this.setFlow(match, "タイマー確認中");
      this.recordTimerPending = true;
      this.show("timer");
      return;
    }
    if (this.operationActive && (event === "start" || event === "next")) {
      this.operationMatch = match || this.records.currentMatchNumber();
      this.clearFlow();
      this.balls.beginWorkflow(this.operationMatch);
      this.timer.prepare(true);
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
    this.ensureAdminController();
    this.setSecretDisplayActive();
  }

  private setSecretDisplayActive(): void {
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

  private ensureAdminController(): AdminController {
    this.admin ??= new AdminController(
      this.qrScanner,
      () => this.records.importTeamsFromGasConnection(),
      (data) => this.records.importTeamsFromBootstrap(data),
      (mode, settings, options) => this.applyAdminMode(mode, settings, options),
      (setting) => this.applyTimerSetting(setting),
      () => this.records.syncSummary(),
      () => this.records.portableState(),
      (value) => this.records.applyPortableState(value),
      () => this.records.persistCurrentTeams(),
      () => this.records.retryPendingSends("connection"),
      () => this.setSecretDisplayActive(),
    );
    return this.admin;
  }

  private restorePersistedAdminSession(): void {
    el("development-nav").classList.remove("hidden");
    const session = AdminController.loadPersistedSession();
    if (!session) return;
    this.activateSecret();
    this.admin?.restorePersistedSession(session.adminKey);
  }

  private confirmDeactivateSecret(): void {
    el<HTMLDialogElement>("admin-exit-dialog").showModal();
  }

  private applyAdminMode(mode: AdminMode, settings: AdminSettings, options: AdminModeApplyOptions = {}): void {
    if (options.adminKey) this.activeAdminKey = options.adminKey;
    this.hyogo = mode === "hyogo";
    this.rsamMode = mode === "rsam";
    const shouldApplyTheme = options.applyTheme !== false;
    if (shouldApplyTheme) {
      const lightAllowed = this.variant.allowLightUi;
      const accentMode = lightAllowed ? settings.accentMode : settings.accentMode === "admin" ? "admin" : "standard";
      document.documentElement.classList.toggle("venue-standard-accent", accentMode === "standard");
      document.documentElement.classList.toggle("venue-admin-accent", accentMode === "admin");
      document.documentElement.classList.toggle("venue-light-accent", accentMode === "light");
    }
    document.documentElement.classList.toggle("rsam-admin-mode", this.rsamMode);
    this.content.setRestrictedRulesVisible(this.hyogo || this.rsamMode || mode === "mie");
    this.timer.setHyogoMode(this.hyogo);
    this.timer.setTokyoClockModeAvailable(this.variant.allowTokyoClock);
    this.balls.setHyogoMode(this.hyogo);
    this.applyVenueScreenVisibility(settings.venueScreenVisibility);
    this.updateTitle();
    this.updateHomeSyncAlert();
  }

  private applyTimerSetting(setting: ExternalTimerSetting | null): void {
    this.timer.setExternalTimerSetting(setting);
  }

  private updateTitle(): void {
    const edition = this.secret ? adminTitleSuffix(this.activeAdminKey) : "";
    const base = ["RoboSports Assist", edition].filter(Boolean).join(" ");
    const title = [base, this.variant.titleSuffix].filter(Boolean).join(" ");
    el("title").textContent = title;
    document.title = title;
  }

  private deactivateSecret(): void {
    this.secret = false;
    this.hyogo = false;
    this.activeAdminKey = "";
    this.rsamMode = false;
    this.linksClicks = 0;
    this.rulesClicks = 0;
    document.documentElement.classList.remove("secret");
    document.documentElement.classList.remove("venue-standard-accent");
    document.documentElement.classList.remove("venue-admin-accent");
    document.documentElement.classList.remove("venue-light-accent");
    document.documentElement.classList.remove("rsam-admin-mode");
    this.updateTitle();
    el("development-nav").classList.remove("hidden");
    el("admin-exit").classList.add("hidden");
    this.timer.setSecret(false);
    this.timer.setHyogoMode(false);
    this.timer.setExternalTimerSetting(AdminController.timerSetting());
    this.timer.setTokyoClockModeAvailable(false);
    this.balls.setHyogoMode(false);
    this.admin?.stopTransientChecks();
    this.admin?.lock({ clearSession: true });
    this.content.renderLinks(false);
    this.content.setRestrictedRulesVisible(false);
    this.show("dashboard");
  }
}

function installDialogFallback(): void {
  if (typeof HTMLDialogElement !== "undefined" && typeof HTMLDialogElement.prototype.showModal === "function") return;
  document.documentElement.classList.add("dialog-fallback");
  document.querySelectorAll<HTMLElement>("dialog").forEach((element) => {
    const dialog = element as unknown as HTMLDialogElement;
    Object.defineProperty(dialog, "open", {
      configurable: true,
      get: () => element.hasAttribute("open"),
      set: (value: boolean) => element.toggleAttribute("open", Boolean(value)),
    });
    dialog.showModal = () => element.setAttribute("open", "");
    dialog.close = (returnValue = "") => {
      dialog.returnValue = returnValue;
      element.removeAttribute("open");
      element.dispatchEvent(new Event("close"));
    };
  });
  document.addEventListener("click", (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('dialog form[method="dialog"] button[value]');
    if (!button) return;
    const dialog = button.closest("dialog") as HTMLDialogElement | null;
    if (!dialog) return;
    event.preventDefault();
    dialog.close(button.value);
  });
}

installDialogFallback();
new Application();
