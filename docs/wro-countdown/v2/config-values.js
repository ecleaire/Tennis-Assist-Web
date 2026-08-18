import { BUILT_IN_SOUND_KEYS } from "./sound-catalog.js?v=20260815h";

// Fixed event data and user-setting defaults.
export const SETTINGS_KEY = "wro-countdown-settings-v4";
export const OLD_SETTINGS_KEY = "wro-countdown-settings-v3";

// 2026-08-22 14:00 in Japan Standard Time.
export const WRO_TARGET = Date.UTC(2026, 7, 22, 5);
export const WRO_DATE = "8月22日（土）";

export const PRESET_LEADS = [5, 10, 30, 60];
export const PATTERNS = [
  "horizontal",
  "diagonal",
  "blocks",
  "grid",
  "digital",
  "scanline"
];

export const BACKGROUND_STYLES = [
  "gradient",
  "spotlight",
  "solid"
];

export const POSITION_VALUES = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right"
];

export const BUILT_INS = [...BUILT_IN_SOUND_KEYS];
export const SOUND_TYPES = [...BUILT_INS, "custom"];

export const DEFAULTS = {
  mode: "timer",
  targetTime: "20:30",
  showTarget: true,
  showHourMinute: true,
  timerText: "",

  // Current-time display shared by both modes.
  showCurrentTime: true,
  currentTimeLabel: "現在時刻",

  // WRO countdown labels.
  wroTitleSize: 30,
  wroDateSuffix: "",
  wroDateSuffixSize: 22,

  theme: "dark",

  // Background appearance. Theme colors follow dark/light mode until the
  // user switches to custom colors.
  backgroundStyle: "gradient",
  backgroundUseThemeColors: true,
  backgroundBaseColor: "#020405",
  backgroundAccentColor: "#56d1e7",
  backgroundStrength: 60,
  backgroundGuides: true,
  backgroundScanlines: true,

  autoSize: true,
  clockSize: 64,
  dateSize: 16,
  timerSize: 116,
  targetSize: 32,
  subSize: 23,
  timerTextSize: 26,

  // PC / landscape placement defaults.
  clockPosition: "top-right",
  clockOffsetX: 0,
  clockOffsetY: 0,
  timerPosition: "center",
  timerOffsetX: 0,
  timerOffsetY: 0,
  wroPosition: "center",
  wroOffsetX: 0,
  wroOffsetY: 0,

  noiseStrength: 88,
  noisePattern: "random",
  noiseIntervalMin: 3,
  lineGap: 110,
  autoWroEnabled: true,
  autoWroIntervalMin: 5,
  autoWroDurationMin: 1,
  alarmEnabled: true,
  atTarget: true,
  leadTimes: [5, 10, 30, 60],
  volume: 70,
  soundType: "bell",
  fileName: ""
};
