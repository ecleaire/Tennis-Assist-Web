import { configureGlitch } from "./visual-config.js";

export function createNoise(refs, getSettings) {
  let automaticTimer = 0;

  function play() {
    const settings = getSettings();
    if (!settings.noiseStrength) return;

    refs.app.classList.remove("play");
    [...refs.display.querySelectorAll(".glitch:not([hidden])")]
      .forEach((element, index) => configureGlitch(element, index, settings));
    void refs.app.offsetWidth;
    refs.app.classList.add("play");
  }

  function preview() {
    const settings = getSettings();
    if (!settings.noiseStrength) return;

    refs.previewStage.classList.remove("play");
    configureGlitch(refs.previewText, 0, settings);
    void refs.previewStage.offsetWidth;
    refs.previewStage.classList.add("play");
  }

  function restart() {
    window.clearInterval(automaticTimer);
    automaticTimer = 0;

    const intervalMinutes = getSettings().noiseIntervalMin;
    if (intervalMinutes > 0) {
      automaticTimer = window.setInterval(() => {
        if (!refs.overlay.classList.contains("open")) play();
      }, intervalMinutes * 60000);
    }
  }

  return { play, preview, restart };
}
