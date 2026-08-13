// Fixed event data and user-setting defaults.
export const SETTINGS_KEY = "wro-countdown-settings-v4";
export const OLD_SETTINGS_KEY = "wro-countdown-settings-v3";

// 2026-08-22 14:00 in Japan Standard Time.
export const WRO_TARGET = Date.UTC(2026, 7, 22, 5);
export const WRO_DATE = "8月22日（土）";

export const PRESET_LEADS = [5, 10, 30];
export const PATTERNS = [
  "horizontal",
  "diagonal",
  "blocks",
  "grid",
  "digital",
  "scanline"
];

export const BUILT_INS = [
  "bell",
  "chime",
  "digital",
  "alarm",
  "doubleBell",
  "school",
  "softPing",
  "siren",
  "pulse",
  "robot"
];

export const SOUND_TYPES = [...BUILT_INS, "custom"];

export const DEFAULTS = {
  mode: "timer",
  targetTime: "14:00",
  showTarget: true,
  showHourMinute: true,
  timerText: "",
  theme: "dark",
  autoSize: true,
  clockSize: 64,
  timerSize: 116,
  targetSize: 32,
  subSize: 23,
  timerTextSize: 26,
  noiseStrength: 88,
  noisePattern: "random",
  noiseIntervalMin: 3,
  lineGap: 110,
  autoWroEnabled: true,
  autoWroIntervalMin: 5,
  autoWroDurationMin: 1,
  alarmEnabled: true,
  atTarget: true,
  leadTimes: [5, 10, 30],
  volume: 70,
  soundType: "bell",
  fileName: ""
};
