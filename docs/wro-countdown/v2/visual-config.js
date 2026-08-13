import { PATTERNS } from "./config.js";

function choosePattern(settings) {
  if (settings.noisePattern !== "random") return settings.noisePattern;
  return PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
}

export function configureGlitch(element, index, settings) {
  const strength = settings.noiseStrength / 100;
  const elementWidth = Math.max(
    1,
    element.scrollWidth || element.getBoundingClientRect().width
  );
  const bandWidth = 50 + strength * 125 + Math.random() * 55;
  const duration = 520 + strength * 260 + Math.random() * 170;
  const shift = 0.8 + strength * 6.2;
  const verticalShift = Math.random() * 2.4 - 1.2;

  element.dataset.pattern = choosePattern(settings);
  element.style.setProperty("--delay", `${index * settings.lineGap}ms`);
  element.style.setProperty("--dur", `${Math.round(duration)}ms`);
  element.style.setProperty(
    "--jitter",
    `${Math.round(index * settings.lineGap + duration * 0.56)}ms`
  );
  element.style.setProperty("--width", `${Math.round(bandWidth)}px`);
  element.style.setProperty("--alpha", String(0.28 + strength * 0.72));
  element.style.setProperty("--gx", `${shift.toFixed(1)}px`);
  element.style.setProperty("--gxn", `${(-shift).toFixed(1)}px`);
  element.style.setProperty("--gy", `${verticalShift.toFixed(1)}px`);
  element.style.setProperty("--gyn", `${(-verticalShift).toFixed(1)}px`);
  element.style.setProperty("--start", `${Math.round(-bandWidth - 18)}px`);
  element.style.setProperty(
    "--end",
    `${Math.round(elementWidth + bandWidth + 20)}px`
  );
}
