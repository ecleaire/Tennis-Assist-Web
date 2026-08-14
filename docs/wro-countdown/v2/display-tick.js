import { WRO_TARGET } from "./config.js?v=20260814r";
import {
  renderCurrentTime,
  renderTimer,
  renderWro,
  renderLabels
} from "./display-render.js?v=20260814r";
import { renderStatus } from "./display-status.js?v=20260814r";

export function updateDisplay(refs, settings, timer, automatic, scheduleFit) {
  const date = new Date();
  const now = date.getTime();
  renderCurrentTime(refs, date, settings);

  let remaining = null;
  if (settings.mode === "timer") {
    remaining = timer.remaining(now);
  }

  renderLabels(refs, settings, automatic.active());
  if (settings.mode === "wro" || automatic.active()) {
    renderWro(refs, WRO_TARGET - now);
  } else {
    renderTimer(refs, remaining, settings);
  }

  renderStatus(refs, settings, automatic, now);
  scheduleFit();
}
