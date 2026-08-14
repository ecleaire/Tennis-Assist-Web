import { renderLabels } from "./display-render.js?v=20260814r";
import { fitDisplay } from "./display-fit.js?v=20260815c";
import { createAutoWro } from "./display-auto.js?v=20260814m";
import { createTimerTarget } from "./display-target.js?v=20260814m";
import { applyDisplayTheme } from "./display-theme.js?v=20260814r";
import {
  applyPositioning,
  constrainPositioning
} from "./display-position.js?v=20260815c";
import { updateDisplay } from "./display-tick.js?v=20260814r";

export function createDisplay(refs, getSettings, onAlarm, onSwitch) {
  const timer = createTimerTarget(getSettings, onAlarm);
  let automatic;

  function position() {
    applyPositioning(refs, getSettings(), automatic?.active() || false);
  }

  function fit() {
    position();
    fitDisplay(refs, getSettings());
    constrainPositioning(refs);
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
