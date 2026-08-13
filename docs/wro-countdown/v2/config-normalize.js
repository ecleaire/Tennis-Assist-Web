import {
  DEFAULTS,
  PATTERNS,
  SOUND_TYPES
} from "./config-values.js";

export const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number(value)));

export const pad = value => String(value).padStart(2, "0");

export function normalize(raw = {}) {
  const value = { ...DEFAULTS, ...raw };

  return {
    mode: value.mode === "wro" ? "wro" : "timer",
    targetTime: /^\d{2}:\d{2}$/.test(value.targetTime)
      ? value.targetTime
      : DEFAULTS.targetTime,
    showTarget: Boolean(value.showTarget),
    theme: value.theme === "light" ? "light" : "dark",
    clockSize: clamp(value.clockSize, 20, 180),
    timerSize: clamp(value.timerSize, 36, 260),
    targetSize: clamp(value.targetSize, 12, 100),
    subSize: clamp(value.subSize, 12, 80),
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
