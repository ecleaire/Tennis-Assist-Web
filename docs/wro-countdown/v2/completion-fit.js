import { isTextAutoSizeEnabled } from "./text-auto-size-values.js?v=20261001a";

const MINIMUM = 20;

function readFit(refs, fallback) {
  const value = Number.parseFloat(
    refs.app.style.getPropertyValue("--completionTextFit") ||
    getComputedStyle(refs.app).getPropertyValue("--completionTextFit")
  );
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function fitCompletionMessage(refs, settings) {
  if (refs.app.dataset.timerPhase !== "completion") {
    refs.app.style.removeProperty("--completionTextMaxWidth");
    refs.app.dataset.completionFit = "inactive";
    delete refs.app.dataset.completionRequestedSize;
    delete refs.app.dataset.completionPreferredSize;
    delete refs.app.dataset.completionFitSize;
    delete refs.app.dataset.completionAutoSize;
    return;
  }

  const configured = Math.max(
    MINIMUM,
    Number(settings.completionTextSize) || MINIMUM
  );
  const automatic = isTextAutoSizeEnabled(settings, "completionText");
  const size = automatic ? readFit(refs, configured) : configured;

  refs.app.style.setProperty("--completionTextFit", `${size}px`);
  if (automatic) {
    refs.app.style.setProperty("--completionTextMaxWidth", "100%");
  } else {
    refs.app.style.removeProperty("--completionTextMaxWidth");
  }

  refs.app.dataset.completionRequestedSize = configured.toFixed(2);
  refs.app.dataset.completionPreferredSize = size.toFixed(2);
  refs.app.dataset.completionFitSize = size.toFixed(2);
  refs.app.dataset.completionAutoSize = String(automatic);
  refs.app.dataset.completionFit = automatic ? "fitted" : "manual-overlap";
}
