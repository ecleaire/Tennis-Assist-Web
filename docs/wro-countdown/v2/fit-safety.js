import { SIZE_LIMITS } from "./size-limits.js?v=20260927a";
import { isTextAutoSizeEnabled } from "./text-auto-size-values.js?v=20260927a";

const ITEMS = [
  ["clock", "clockSize", "--clockFit"],
  ["date", "dateSize", "--dateFit"],
  ["timer", "timerSize", "--timerFit"],
  ["completionText", "completionTextSize", "--completionTextFit"],
  ["target", "targetSize", "--targetFit"],
  ["sub", "subSize", "--subFit"],
  ["timerText", "timerTextSize", "--timerTextFit"],
  ["wroTitle", "wroTitleSize", "--wroTitleFit"],
  ["wroSuffix", "wroDateSuffixSize", "--wroSuffixFit"]
];

export function enforceAutoSizeCeilings(refs, settings) {
  for (const [kind, sizeKey, variable] of ITEMS) {
    if (!isTextAutoSizeEnabled(settings, kind)) continue;

    const limits = SIZE_LIMITS[sizeKey];
    const current = Number.parseFloat(
      refs.app.style.getPropertyValue(variable) ||
      getComputedStyle(refs.app).getPropertyValue(variable)
    );
    if (!Number.isFinite(current) || current <= 0) {
      refs.app.style.setProperty(variable, `${limits.minimum}px`);
      continue;
    }
    if (Number.isFinite(limits.maximum) && current > limits.maximum) {
      refs.app.style.setProperty(variable, `${limits.maximum}px`);
    }
  }
}
