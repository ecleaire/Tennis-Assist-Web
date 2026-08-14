import {
  DEFAULTS,
  PATTERNS,
  POSITION_VALUES,
  SOUND_TYPES
} from "./config-values.js?v=20260814m";
import { SIZE_LIMITS } from "./size-limits.js?v=20260814m";

export const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number(value)));

export const pad = value => String(value).padStart(2, "0");

const position = (value, fallback) =>
  POSITION_VALUES.includes(value) ? value : fallback;

const offset = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? clamp(number, -1000, 1000)
    : fallback;
};

export function normalize(raw = {}) {
  const value = { ...DEFAULTS, ...raw };

  return {
    mode: value.mode === "wro" ? "wro" : "timer",
    targetTime: /^\d{2}:\d{2}$/.test(value.targetTime)
      ? value.targetTime
      : DEFAULTS.targetTime,
    showTarget: Boolean(value.showTarget),
    showHourMinute: raw.showHourMinute === undefined
      ? DEFAULTS.showHourMinute
      : Boolean(raw.showHourMinute),
    timerText: typeof value.timerText === "string"
      ? value.timerText.slice(0, 160)
      : "",
    theme: value.theme === "light" ? "light" : "dark",
    autoSize: raw.autoSize === undefined
      ? DEFAULTS.autoSize
      : Boolean(raw.autoSize),
    clockSize: clamp(
      value.clockSize,
      SIZE_LIMITS.clockSize.minimum,
      SIZE_LIMITS.clockSize.maximum
    ),
    timerSize: clamp(
      value.timerSize,
      SIZE_LIMITS.timerSize.minimum,
      SIZE_LIMITS.timerSize.maximum
    ),
    targetSize: clamp(
      value.targetSize,
      SIZE_LIMITS.targetSize.minimum,
      SIZE_LIMITS.targetSize.maximum
    ),
    subSize: clamp(
      value.subSize,
      SIZE_LIMITS.subSize.minimum,
      SIZE_LIMITS.subSize.maximum
    ),
    timerTextSize: clamp(
      value.timerTextSize,
      SIZE_LIMITS.timerTextSize.minimum,
      SIZE_LIMITS.timerTextSize.maximum
    ),

    clockPosition: position(
      value.clockPosition,
      DEFAULTS.clockPosition
    ),
    clockOffsetX: offset(value.clockOffsetX, DEFAULTS.clockOffsetX),
    clockOffsetY: offset(value.clockOffsetY, DEFAULTS.clockOffsetY),
    timerPosition: position(
      value.timerPosition,
      DEFAULTS.timerPosition
    ),
    timerOffsetX: offset(value.timerOffsetX, DEFAULTS.timerOffsetX),
    timerOffsetY: offset(value.timerOffsetY, DEFAULTS.timerOffsetY),
    wroPosition: position(value.wroPosition, DEFAULTS.wroPosition),
    wroOffsetX: offset(value.wroOffsetX, DEFAULTS.wroOffsetX),
    wroOffsetY: offset(value.wroOffsetY, DEFAULTS.wroOffsetY),

    noiseStrength: clamp(value.noiseStrength, 0, 100),
    noisePattern: ["random", ...PATTERNS].includes(value.noisePattern)
      ? value.noisePattern
      : "random",
    noiseIntervalMin: clamp(
      raw.noiseIntervalMin ?? DEFAULTS.noiseIntervalMin,
      0,
      180
    ),
    lineGap: clamp(value.lineGap, 0, 1000),
    autoWroEnabled: raw.autoWroEnabled === undefined
      ? DEFAULTS.autoWroEnabled
      : Boolean(raw.autoWroEnabled),
    autoWroIntervalMin: clamp(
      raw.autoWroIntervalMin ?? DEFAULTS.autoWroIntervalMin,
      1,
      1440
    ),
    autoWroDurationMin: clamp(
      raw.autoWroDurationMin ?? DEFAULTS.autoWroDurationMin,
      0.1,
      60
    ),
    alarmEnabled: Boolean(value.alarmEnabled),
    atTarget: Boolean(value.atTarget),
    leadTimes: Array.isArray(value.leadTimes)
      ? [...new Set(
          value.leadTimes
            .map(Number)
            .filter(minutes => minutes > 0 && minutes <= 1440)
        )].sort((a, b) => a - b)
      : [...DEFAULTS.leadTimes],
    volume: clamp(value.volume, 0, 100),
    soundType: SOUND_TYPES.includes(value.soundType)
      ? value.soundType
      : "bell",
    fileName: typeof value.fileName === "string" ? value.fileName : ""
  };
}
