import { SIZE_LIMITS } from "./size-limits.js?v=20260927a";
import { isTextAutoSizeEnabled } from "./text-auto-size-values.js?v=20260927a";

function readFit(refs, fallback) {
  const value = Number.parseFloat(
    refs.app.style.getPropertyValue("--timerFit") ||
    getComputedStyle(refs.app).getPropertyValue("--timerFit")
  );
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function clear(refs) {
  refs.mainValue.style.removeProperty("font-size");
  delete refs.app.dataset.timerPreferredSize;
  delete refs.app.dataset.timerAutoSize;
  delete refs.app.dataset.timerSizeApplied;
}

export function fitTimerSize(refs, settings) {
  if (refs.app.dataset.timerPhase !== "countdown") {
    clear(refs);
    return;
  }

  const automatic = isTextAutoSizeEnabled(settings, "timer");
  const configured = Math.max(
    SIZE_LIMITS.timerSize.minimum,
    Number(settings.timerSize) || SIZE_LIMITS.timerSize.minimum
  );

  // display-fit.js owns automatic fitting. Manual mode is authoritative and
  // never yields to another display, viewport collision, or sibling text.
  const size = automatic ? readFit(refs, configured) : configured;
  refs.app.style.setProperty("--timerFit", `${size}px`);
  refs.mainValue.style.setProperty("font-size", "var(--timerFit)", "important");

  refs.app.dataset.timerPreferredSize = size.toFixed(2);
  refs.app.dataset.timerAutoSize = String(automatic);
  refs.app.dataset.timerSizeApplied = "true";
}
