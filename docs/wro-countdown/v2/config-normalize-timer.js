import {
  clamp,
  normalize as normalizeBase,
  pad
} from "./config-normalize.js?v=20260821c";
import { SIZE_LIMITS } from "./size-limits.js?v=20260821d";

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

  return {
    ...normalized,
    timerSize: Number.isFinite(numeric)
      ? clamp(Math.round(numeric), limits.minimum, limits.maximum)
      : normalized.timerSize
  };
}
