import { renderLabels } from "./display-render.js";
import { fitDisplay } from "./display-fit.js?v=20260814i";
import { createAutoWro } from "./display-auto.js";
import { createTimerTarget } from "./display-target.js";
import { applyDisplayTheme } from "./display-theme.js";
import { updateDisplay } from "./display-tick.js";

export function createDisplay(refs, getSettings, onAlarm, onSwitch) {
  const timer = createTimerTarget(getSettings, onAlarm);
  let automatic;

  function fit() {
    fitDisplay(refs, getSettings());
  }

  function tick() {
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
  }

  window.addEventListener("resize", fit, { passive: true });
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
