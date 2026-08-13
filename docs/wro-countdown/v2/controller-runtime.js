import { renderLabels } from "./display-render.js?v=20260814f";
import { fitDisplay } from "./display-fit.js?v=20260814f";
import { createAutoWro } from "./display-auto.js?v=20260814f";
import { createTimerTarget } from "./display-target.js?v=20260814f";
import { applyDisplayTheme } from "./display-theme.js?v=20260814f";
import { updateDisplay } from "./display-tick.js?v=20260814f";

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
