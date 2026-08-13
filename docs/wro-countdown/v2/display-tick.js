import { WRO_TARGET } from "./config.js";
import {
  renderCurrentTime,
  renderTimer,
  renderWro,
  renderLabels
} from "./display-render.js";
import { renderStatus } from "./display-status.js";

export function updateDisplay(refs, settings, timer, automatic, scheduleFit) {
  const date = new Date();
  const now = date.getTime();
  renderCurrentTime(refs, date);

  let remaining = null;
  if (settings.mode === "timer") {
    remaining = timer.remaining(now);
  }

  renderLabels(refs, settings, automatic.active());
  if (settings.mode === "wro" || automatic.active()) {
    renderWro(refs, WRO_TARGET - now);
  } else {
    renderTimer(refs, remaining);
  }

  renderStatus(refs, settings, automatic, now);
  scheduleFit();
}
