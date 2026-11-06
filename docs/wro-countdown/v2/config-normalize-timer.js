import { alarmOffsets, legacyAlarmFields } from "./alarm-timing.js?v=20261106a";
import {
  clamp,
  normalize as normalizeBase,
  pad
} from "./config-normalize.js?v=20260821e";
import { SIZE_LIMITS } from "./size-limits.js?v=20260926a";

export { clamp, pad };

/**
 * Compatibility layer for the expanded timer-size range.
 *
 * The previous normalizer was cached under an older module URL and capped the
 * value at 520px. Read timerSize from the raw settings again so valid values
 * up to the new limit cannot be silently reduced before rendering.
 */
export function normalize(raw = {}) {
  const normalized = normalizeBase(raw);
  const limits = SIZE_LIMITS.timerSize;
  const numeric = Number(raw.timerSize);
  const offsets = alarmOffsets({ ...normalized, alarmOffsetsSec: raw.alarmOffsetsSec });
  const grace = raw.alarmCatchUpSec;

  return {
    ...normalized,
    alarmOffsetsSec: offsets,
    ...legacyAlarmFields(offsets),
    alarmCatchUpSec: typeof grace === "number" && Number.isFinite(grace)
      ? Math.max(1, Math.min(300, Math.round(grace))) : 20,
    timerSize: Number.isFinite(numeric)
      ? Math.max(limits.minimum, Math.round(numeric))
      : normalized.timerSize
  };
}
