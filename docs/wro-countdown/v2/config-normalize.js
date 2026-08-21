import {
  BACKGROUND_STYLES,
  DEFAULTS,
  PATTERNS,
  POSITION_VALUES,
  SOUND_TYPES
} from "./config-values.js?v=20260821e";
import {
  normalizeCompletionMessages
} from "./completion-messages.js?v=20260821c";
import { SIZE_LIMITS } from "./size-limits.js?v=20260821d";
import {
  TEXT_AUTO_SIZE_ITEMS
} from "./text-auto-size-values.js?v=20260821e";

export const clamp = (value, minimum, maximum) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return minimum;
  return Math.min(maximum, Math.max(minimum, numeric));
};

export const pad = value => String(value).padStart(2, "0");

function decimalPlaces(value) {
  const text = String(value);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

const numberSetting = (
  value,
  fallback,
  minimum,
  maximum,
  step = 0
) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;

  const bounded = clamp(numeric, minimum, maximum);
  if (!(step > 0)) return bounded;

  const stepped = minimum + Math.round((bounded - minimum) / step) * step;
  const precision = Math.max(
    decimalPlaces(step),
    decimalPlaces(minimum),
    decimalPlaces(maximum)
  );
  return Number(clamp(stepped, minimum, maximum).toFixed(precision));
};

const booleanSetting = (value, fallback) =>
  typeof value === "boolean" ? value : fallback;

const position = (value, fallback) =>
  POSITION_VALUES.includes(value) ? value : fallback;

const offset = (value, fallback = 0) =>
  numberSetting(value, fallback, -1000, 1000, 1);

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
  SIZE_LIMITS[key].maximum,
  1
);

function normalizeTextAutoSize(raw) {
  const legacyMaster = booleanSetting(raw.autoSize, DEFAULTS.autoSize);
  const values = Object.fromEntries(
    TEXT_AUTO_SIZE_ITEMS.map(item => [
      item.key,
      booleanSetting(raw[item.key], legacyMaster)
    ])
  );

  return {
    autoSize: Object.values(values).every(Boolean),
    ...values
  };
}

export function normalize(raw = {}) {
  const value = { ...DEFAULTS, ...raw };
  const completionMessages = normalizeCompletionMessages(
    Array.isArray(raw.completionMessages)
      ? raw.completionMessages
      : null,
    typeof raw.completionText === "string"
      ? raw.completionText
      : DEFAULTS.completionText,
    DEFAULTS.completionMessages
  );
  const textAutoSize = normalizeTextAutoSize(raw);

  return {
    mode: value.mode === "wro" ? "wro" : "timer",
    targetTime: targetTime(value.targetTime),
    showTarget: booleanSetting(raw.showTarget, DEFAULTS.showTarget),
    showHourMinute: booleanSetting(
      raw.showHourMinute,
      DEFAULTS.showHourMinute
    ),
    timerText: text(value.timerText, DEFAULTS.timerText, 160),
    completionText: completionMessages[0],
    completionMessages,
    completionMessageIntervalSec: numberSetting(
      raw.completionMessageIntervalSec,
      DEFAULTS.completionMessageIntervalSec,
      1,
      600,
      1
    ),
    completionDurationMin: numberSetting(
      raw.completionDurationMin,
      DEFAULTS.completionDurationMin,
      1,
      1440,
      1
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
      100,
      1
    ),
    backgroundGuides: booleanSetting(
      raw.backgroundGuides,
      DEFAULTS.backgroundGuides
    ),
    backgroundScanlines: booleanSetting(
      raw.backgroundScanlines,
      DEFAULTS.backgroundScanlines
    ),

    ...textAutoSize,
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
      100,
      1
    ),
    noisePattern: ["random", ...PATTERNS].includes(value.noisePattern)
      ? value.noisePattern
      : DEFAULTS.noisePattern,
    noiseIntervalMin: numberSetting(
      raw.noiseIntervalMin,
      DEFAULTS.noiseIntervalMin,
      0,
      180,
      0.5
    ),
    lineGap: numberSetting(
      value.lineGap,
      DEFAULTS.lineGap,
      0,
      1000,
      1
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
      1440,
      1
    ),
    autoWroDurationMin: numberSetting(
      raw.autoWroDurationMin,
      DEFAULTS.autoWroDurationMin,
      0.1,
      60,
      0.1
    ),
    alarmEnabled: booleanSetting(
      raw.alarmEnabled,
      DEFAULTS.alarmEnabled
    ),
    atTarget: booleanSetting(raw.atTarget, DEFAULTS.atTarget),
    leadTimes: Array.isArray(value.leadTimes)
      ? [...new Set(
          value.leadTimes
            .map(minutes => Math.round(Number(minutes)))
            .filter(minutes =>
              Number.isFinite(minutes) &&
              minutes > 0 &&
              minutes <= 1440
            )
        )].sort((a, b) => a - b)
      : [...DEFAULTS.leadTimes],
    volume: numberSetting(
      value.volume,
      DEFAULTS.volume,
      0,
      100,
      1
    ),
    soundType: SOUND_TYPES.includes(value.soundType)
      ? value.soundType
      : DEFAULTS.soundType,
    fileName: text(value.fileName, DEFAULTS.fileName, 255)
  };
}
