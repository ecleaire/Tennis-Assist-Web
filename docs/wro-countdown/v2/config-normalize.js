import {
  BACKGROUND_STYLES,
  DEFAULTS,
  PATTERNS,
  POSITION_VALUES,
  SOUND_TYPES
} from "./config-values.js?v=20260820b";
import { SIZE_LIMITS } from "./size-limits.js?v=20260820a";

export const clamp = (value, minimum, maximum) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.min(maximum, Math.max(minimum, numeric));
};

export const pad = value => String(value).padStart(2, "0");

const numberSetting = (value, fallback, minimum, maximum) => {
  const numeric = Number(value);
  return Number.isFinite(numeric)
    ? clamp(numeric, minimum, maximum)
    : fallback;
};

const booleanSetting = (value, fallback) =>
  typeof value === "boolean" ? value : fallback;

const position = (value, fallback) =>
  POSITION_VALUES.includes(value) ? value : fallback;

const offset = (value, fallback = 0) =>
  numberSetting(value, fallback, -1000, 1000);

const text = (value, fallback, maximum) =>
  typeof value === "string"
    ? value
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .slice(0, maximum)
    : fallback;

const color = (value, fallback) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : fallback;

const targetTime = value =>
  typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? value
    : DEFAULTS.targetTime;

const sizeSetting = (key, value) => numberSetting(
  value,
  DEFAULTS[key],
  SIZE_LIMITS[key].minimum,
  SIZE_LIMITS[key].maximum
);

export function normalize(raw = {}) {
  const value = { ...DEFAULTS, ...raw };

  return {
    mode: value.mode === "wro" ? "wro" : "timer",
    targetTime: targetTime(value.targetTime),
    showTarget: booleanSetting(raw.showTarget, DEFAULTS.showTarget),
    showHourMinute: booleanSetting(
      raw.showHourMinute,
      DEFAULTS.showHourMinute
    ),
    timerText: text(value.timerText, DEFAULTS.timerText, 160),
    completionText: text(
      value.completionText,
      DEFAULTS.completionText,
      120
    ),
    completionDurationMin: numberSetting(
      raw.completionDurationMin,
      DEFAULTS.completionDurationMin,
      1,
      1440
    ),

    showCurrentTime: booleanSetting(
      raw.showCurrentTime,
      DEFAULTS.showCurrentTime
    ),
    currentTimeLabel: text(
      value.currentTimeLabel,
      DEFAULTS.currentTimeLabel,
      40
    ),

    wroTitleSize: sizeSetting("wroTitleSize", value.wroTitleSize),
    wroDateSuffix: text(
      value.wroDateSuffix,
      DEFAULTS.wroDateSuffix,
      120
    ),
    wroDateSuffixSize: sizeSetting(
      "wroDateSuffixSize",
      value.wroDateSuffixSize
    ),

    theme: value.theme === "light" ? "light" : "dark",
    backgroundStyle: BACKGROUND_STYLES.includes(value.backgroundStyle)
      ? value.backgroundStyle
      : DEFAULTS.backgroundStyle,
    backgroundUseThemeColors: booleanSetting(
      raw.backgroundUseThemeColors,
      DEFAULTS.backgroundUseThemeColors
    ),
    backgroundBaseColor: color(
      value.backgroundBaseColor,
      DEFAULTS.backgroundBaseColor
    ),
    backgroundAccentColor: color(
      value.backgroundAccentColor,
      DEFAULTS.backgroundAccentColor
    ),
    backgroundStrength: numberSetting(
      value.backgroundStrength,
      DEFAULTS.backgroundStrength,
      0,
      100
    ),
    backgroundGuides: booleanSetting(
      raw.backgroundGuides,
      DEFAULTS.backgroundGuides
    ),
    backgroundScanlines: booleanSetting(
      raw.backgroundScanlines,
      DEFAULTS.backgroundScanlines
    ),

    autoSize: booleanSetting(raw.autoSize, DEFAULTS.autoSize),
    clockSize: sizeSetting("clockSize", value.clockSize),
    dateSize: sizeSetting("dateSize", value.dateSize),
    timerSize: sizeSetting("timerSize", value.timerSize),
    completionTextSize: sizeSetting(
      "completionTextSize",
      value.completionTextSize
    ),
    targetSize: sizeSetting("targetSize", value.targetSize),
    subSize: sizeSetting("subSize", value.subSize),
    timerTextSize: sizeSetting("timerTextSize", value.timerTextSize),

    clockPosition: position(value.clockPosition, DEFAULTS.clockPosition),
    clockOffsetX: offset(value.clockOffsetX, DEFAULTS.clockOffsetX),
    clockOffsetY: offset(value.clockOffsetY, DEFAULTS.clockOffsetY),
    timerPosition: position(value.timerPosition, DEFAULTS.timerPosition),
    timerOffsetX: offset(value.timerOffsetX, DEFAULTS.timerOffsetX),
    timerOffsetY: offset(value.timerOffsetY, DEFAULTS.timerOffsetY),
    wroPosition: position(value.wroPosition, DEFAULTS.wroPosition),
    wroOffsetX: offset(value.wroOffsetX, DEFAULTS.wroOffsetX),
    wroOffsetY: offset(value.wroOffsetY, DEFAULTS.wroOffsetY),

    noiseStrength: numberSetting(
      value.noiseStrength,
      DEFAULTS.noiseStrength,
      0,
      100
    ),
    noisePattern: ["random", ...PATTERNS].includes(value.noisePattern)
      ? value.noisePattern
      : DEFAULTS.noisePattern,
    noiseIntervalMin: numberSetting(
      raw.noiseIntervalMin,
      DEFAULTS.noiseIntervalMin,
      0,
      180
    ),
    lineGap: numberSetting(
      value.lineGap,
      DEFAULTS.lineGap,
      0,
      1000
    ),
    autoWroEnabled: booleanSetting(
      raw.autoWroEnabled,
      DEFAULTS.autoWroEnabled
    ),
    autoWroDuringCompletion: booleanSetting(
      raw.autoWroDuringCompletion,
      DEFAULTS.autoWroDuringCompletion
    ),
    autoWroIntervalMin: numberSetting(
      raw.autoWroIntervalMin,
      DEFAULTS.autoWroIntervalMin,
      1,
      1440
    ),
    autoWroDurationMin: numberSetting(
      raw.autoWroDurationMin,
      DEFAULTS.autoWroDurationMin,
      0.1,
      60
    ),
    alarmEnabled: booleanSetting(
      raw.alarmEnabled,
      DEFAULTS.alarmEnabled
    ),
    atTarget: booleanSetting(raw.atTarget, DEFAULTS.atTarget),
    leadTimes: Array.isArray(value.leadTimes)
      ? [...new Set(
          value.leadTimes
            .map(Number)
            .filter(minutes =>
              Number.isFinite(minutes) &&
              minutes > 0 &&
              minutes <= 1440
            )
        )].sort((a, b) => a - b)
      : [...DEFAULTS.leadTimes],
    volume: numberSetting(value.volume, DEFAULTS.volume, 0, 100),
    soundType: SOUND_TYPES.includes(value.soundType)
      ? value.soundType
      : DEFAULTS.soundType,
    fileName: text(value.fileName, DEFAULTS.fileName, 255)
  };
}
