import { bindDialog } from "./events-dialog.js";
import { bindModeSettings } from "./events-mode.js?v=20260820b";
import { bindNoiseSettings } from "./events-noise.js";
import { bindAlertTimes } from "./events-alert-time.js";
import { bindSoundSettings } from "./events-sound.js?v=20260814o";
import { bindAudioFile } from "./events-file.js";
import { $ } from "./ui.js?v=20260814j";

export function bindEvents(context) {
  const {
    refs,
    controls,
    display,
    noise,
    audio,
    render,
    reset
  } = context;

  bindDialog(refs, audio);
  bindModeSettings(controls, context.setSettings);
  bindNoiseSettings(refs, controls, context.setSettings, noise);
  bindAlertTimes(context);
  bindSoundSettings(refs, controls, context.setSettings, audio);
  bindAudioFile(controls, audio, render);

  $("reset").onclick = reset;
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) display.tick();
  });
}
