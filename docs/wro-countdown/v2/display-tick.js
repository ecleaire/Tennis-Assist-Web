import { WRO_TARGET } from "./config.js?v=20260820b";
import {
  shouldDisplayAutomaticWro,
  shouldPauseAutomaticWro
} from "./completion-auto-wro.js?v=20260820b";
import {
  renderCurrentTime,
  renderTimer,
  renderWro,
  renderLabels
} from "./display-render.js?v=20260820a";
import { renderStatus } from "./display-status.js?v=20260820b";

export function updateDisplay(refs, settings, timer, automatic, scheduleFit) {
  const date = new Date();
  const now = date.getTime();
  renderCurrentTime(refs, date, settings);

  const timerState = settings.mode === "timer"
    ? timer.state(now)
    : null;
  const completionActive = timerState?.phase === "completion";

  automatic.setPaused(
    shouldPauseAutomaticWro(settings, completionActive)
  );
  const automaticWroActive = shouldDisplayAutomaticWro(
    settings,
    completionActive,
    automatic.active()
  );

  renderLabels(
    refs,
    settings,
    automaticWroActive,
    timerState
  );

  if (settings.mode === "wro" || automaticWroActive) {
    renderWro(refs, WRO_TARGET - now, date);
  } else {
    renderTimer(refs, timerState, settings);
  }

  renderStatus(
    refs,
    settings,
    automatic,
    now,
    timerState
  );
  scheduleFit();
}
