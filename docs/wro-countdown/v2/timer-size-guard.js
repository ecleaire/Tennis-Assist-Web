import { SIZE_LIMITS } from "./size-limits.js?v=20260821d";

const parsePixels = value => {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number(value)));

function clearTimerState(refs) {
  refs.mainValue.style.removeProperty("font-size");
  delete refs.app.dataset.timerRequestedSize;
  delete refs.app.dataset.timerFitVariable;
  delete refs.app.dataset.timerFitSize;
  delete refs.app.dataset.timerSizeApplied;
}

/**
 * Runs after responsive fitting and collision handling for countdown mode.
 *
 * The CSS variable may legitimately be smaller than the configured setting
 * when the screen cannot fit the requested value. What must never happen is a
 * second CSS vw/vh cap making the computed size smaller than --timerFit.
 */
export function finalizeTimerSize(refs, settings) {
  if (refs.app.dataset.timerPhase !== "countdown") {
    clearTimerState(refs);
    return;
  }

  const limits = SIZE_LIMITS.timerSize;
  const requested = clamp(
    settings.timerSize,
    limits.minimum,
    limits.maximum
  );

  let fitted = parsePixels(
    refs.app.style.getPropertyValue("--timerFit") ||
    getComputedStyle(refs.app).getPropertyValue("--timerFit")
  );

  if (fitted === null || fitted <= 0) {
    fitted = requested;
    refs.app.style.setProperty("--timerFit", `${fitted}px`);
  }

  // Inline important is a final regression guard. The fitting calculation has
  // already chosen a safe --timerFit value, so this only prevents a later
  // stylesheet from silently applying an unrelated vw/vh ceiling.
  refs.mainValue.style.setProperty(
    "font-size",
    "var(--timerFit)",
    "important"
  );

  const computed = parsePixels(getComputedStyle(refs.mainValue).fontSize);
  const applied = computed !== null && Math.abs(computed - fitted) <= 0.75;

  refs.app.dataset.timerRequestedSize = requested.toFixed(2);
  refs.app.dataset.timerFitVariable = fitted.toFixed(2);
  refs.app.dataset.timerFitSize = (computed ?? fitted).toFixed(2);
  refs.app.dataset.timerSizeApplied = applied ? "true" : "false";
}
