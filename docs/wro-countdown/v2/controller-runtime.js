import { renderLabels } from "./display-render.js?v=20260927a";
import { fitDisplay } from "./display-fit.js?v=20260927a";
import { enforceAutoSizeCeilings } from "./fit-safety.js?v=20260927a";
import { fitTimerSize } from "./timer-size-fit.js?v=20260927a";
import { finalizeTimerSize } from "./timer-size-guard.js?v=20260927a";
import { fitCompletionMessage } from "./completion-fit.js?v=20260927a";
import { createAutoWro } from "./display-auto.js?v=20260927a";
import { createTimerTarget } from "./display-target.js?v=20260927a";
import { applyDisplayTheme } from "./display-theme.js?v=20260927a";
import { applyPositioning } from "./display-position.js?v=20260927a";
import { applyLayoutPolicy } from "./layout-policy.js?v=20260927a";
import { updateDisplay } from "./display-tick.js?v=20260927a";

export function createDisplay(refs, getSettings, onAlarm, onSwitch) {
  const timer = createTimerTarget(getSettings, onAlarm);
  let automatic;

  function position() {
    applyPositioning(refs, getSettings(), automatic?.active() || false);
  }

  function notifyLayoutUpdated() {
    refs.app.dispatchEvent(new CustomEvent("wro:layout-updated"));
  }

  function fit() {
    const settings = getSettings();
    position();
    fitDisplay(refs, settings);
    enforceAutoSizeCeilings(refs, settings);
    fitTimerSize(refs, settings);
    fitCompletionMessage(refs, settings);
    applyLayoutPolicy(refs, settings);
    finalizeTimerSize(refs, settings);
    notifyLayoutUpdated();
  }

  function tick() {
    position();
    updateDisplay(refs, getSettings(), timer, automatic, fit);
  }

  automatic = createAutoWro(getSettings, {
    change: tick,
    animate: onSwitch
  });

  function labels() {
    renderLabels(refs, getSettings(), automatic.active());
  }

  function applyVisual() {
    applyDisplayTheme(refs, getSettings(), labels, fit);
    position();
    fit();
  }

  window.addEventListener("resize", fit, { passive: true });
  window.visualViewport?.addEventListener("resize", fit, { passive: true });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(fit, 120);
  }, { passive: true });

  return {
    tick,
    setTarget: timer.reset,
    restartSchedule: automatic.restart,
    applyVisual,
    labels,
    scheduleFit: fit
  };
}
