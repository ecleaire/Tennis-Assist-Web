import { configureGlitch } from "./visual-config.js";

function burstCount(settings, compact) {
  const strength = settings.noiseStrength / 100;
  return Math.round((compact ? 2 : 3) + strength * (compact ? 8 : 16));
}

function fillBursts(layer, settings, compact = false) {
  layer.replaceChildren();
  if (!settings.noiseStrength) return;

  const strength = settings.noiseStrength / 100;
  const count = burstCount(settings, compact);

  for (let index = 0; index < count; index += 1) {
    const band = document.createElement("span");
    const leftToRight = Math.random() > 0.28;
    const alpha = 0.12 + strength * 0.62;

    band.className = "burst";
    band.style.top = `${Math.random() * 100}%`;
    band.style.setProperty(
      "--bw",
      compact
        ? `${42 + Math.random() * 92}%`
        : `${18 + Math.random() * 70}vw`
    );
    band.style.setProperty(
      "--bh",
      `${1 + Math.random() * (2 + strength * 7)}px`
    );
    band.style.setProperty("--ba", String(alpha));
    band.style.setProperty("--bam", String(alpha * 0.8));
    band.style.setProperty("--blur", `${Math.random() * 0.8}px`);
    band.style.setProperty(
      "--skew",
      `${Math.round(Math.random() * 20 - 10)}deg`
    );
    band.style.setProperty(
      "--steps",
      String(Math.round(3 + Math.random() * 8))
    );
    band.style.setProperty(
      "--bdelay",
      `${Math.round(Math.random() * (compact ? 180 : 420))}ms`
    );
    band.style.setProperty(
      "--bd",
      `${Math.round(230 + Math.random() * (compact ? 430 : 620))}ms`
    );
    band.style.setProperty(
      "--bs",
      compact
        ? (leftToRight ? "-160%" : "160%")
        : (leftToRight ? "-110vw" : "110vw")
    );
    band.style.setProperty(
      "--be",
      compact
        ? (leftToRight ? "170%" : "-170%")
        : (leftToRight ? "115vw" : "-115vw")
    );
    layer.append(band);
  }
}

export function createNoise(refs, getSettings) {
  let automaticTimer = 0;
  let mainCleanup = 0;
  let previewCleanup = 0;

  function clearLater(layer, key, delay) {
    window.clearTimeout(key === "main" ? mainCleanup : previewCleanup);
    const timer = window.setTimeout(() => layer.replaceChildren(), delay);
    if (key === "main") mainCleanup = timer;
    else previewCleanup = timer;
  }

  function play() {
    const settings = getSettings();
    if (!settings.noiseStrength) return;

    refs.app.classList.remove("play");
    [...refs.display.querySelectorAll(".glitch:not([hidden])")]
      .forEach((element, index) => configureGlitch(element, index, settings));
    fillBursts(refs.noiseLayer, settings, false);
    void refs.app.offsetWidth;
    refs.app.classList.add("play");
    clearLater(
      refs.noiseLayer,
      "main",
      2300 + settings.lineGap * 4
    );
  }

  function preview() {
    const settings = getSettings();
    refs.previewStage.classList.remove("play");
    refs.previewNoiseLayer.replaceChildren();

    if (!settings.noiseStrength) {
      refs.previewText.textContent = "NOISE OFF";
      return;
    }

    refs.previewText.textContent = "GLITCH PREVIEW";
    configureGlitch(refs.previewText, 0, settings);
    fillBursts(refs.previewNoiseLayer, settings, true);
    void refs.previewText.offsetWidth;

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        refs.previewStage.classList.add("play");
      });
    });

    clearLater(refs.previewNoiseLayer, "preview", 1900);
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
