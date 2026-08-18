const THEME_BACKGROUNDS = {
  dark: { base: "#020405", accent: "#56d1e7" },
  light: { base: "#ffffff", accent: "#0089a0" }
};

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

function rgb(hex) {
  const value = hex.replace("#", "");
  return {
    red: Number.parseInt(value.slice(0, 2), 16),
    green: Number.parseInt(value.slice(2, 4), 16),
    blue: Number.parseInt(value.slice(4, 6), 16)
  };
}

function hex({ red, green, blue }) {
  const part = value => Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, "0");
  return `#${part(red)}${part(green)}${part(blue)}`;
}

function mix(first, second, amount) {
  const start = rgb(first);
  const end = rgb(second);
  const ratio = clamp(amount);
  return hex({
    red: start.red + (end.red - start.red) * ratio,
    green: start.green + (end.green - start.green) * ratio,
    blue: start.blue + (end.blue - start.blue) * ratio
  });
}

function alpha(color, opacity) {
  const value = rgb(color);
  return `rgba(${value.red}, ${value.green}, ${value.blue}, ${clamp(opacity)})`;
}

function applyBackground(refs, settings) {
  const automatic = THEME_BACKGROUNDS[settings.theme];
  const base = settings.backgroundUseThemeColors
    ? automatic.base
    : settings.backgroundBaseColor;
  const accent = settings.backgroundUseThemeColors
    ? automatic.accent
    : settings.backgroundAccentColor;
  const strength = clamp(settings.backgroundStrength / 100);
  const edgeTarget = settings.theme === "dark" ? "#000000" : "#e8f1f3";
  const scanlineColor = settings.theme === "dark" ? "#ffffff" : "#000000";
  const vignetteColor = settings.theme === "dark" ? "#000000" : "#0d272e";

  refs.app.dataset.backgroundStyle = settings.backgroundStyle;
  refs.app.dataset.backgroundGuides = settings.backgroundGuides ? "on" : "off";
  refs.app.dataset.backgroundScanlines = settings.backgroundScanlines
    ? "on"
    : "off";

  refs.app.style.setProperty("--background-base", base);
  refs.app.style.setProperty(
    "--background-mid",
    mix(base, accent, 0.09 * strength)
  );
  refs.app.style.setProperty(
    "--background-edge",
    mix(base, edgeTarget, 0.16 * strength)
  );
  refs.app.style.setProperty(
    "--background-accent-strong",
    alpha(accent, 0.22 * strength)
  );
  refs.app.style.setProperty(
    "--background-accent-soft",
    alpha(accent, 0.12 * strength)
  );
  refs.app.style.setProperty(
    "--background-accent-faint",
    alpha(accent, 0.07 * strength)
  );
  refs.app.style.setProperty(
    "--background-guide",
    alpha(accent, 0.16 * strength)
  );
  refs.app.style.setProperty(
    "--background-scanline",
    alpha(scanlineColor, 0.05 * strength)
  );
  refs.app.style.setProperty(
    "--background-vignette",
    alpha(vignetteColor, 0.3 * strength)
  );

  document.body.style.background = base;
  refs.metaTheme.content = base;
}

export function applyDisplayTheme(refs, settings, updateLabels, scheduleFit) {
  refs.app.dataset.theme = settings.theme;
  refs.app.style.setProperty("--clock", `${settings.clockSize}px`);
  refs.app.style.setProperty("--date", `${settings.dateSize}px`);
  refs.app.style.setProperty("--timer", `${settings.timerSize}px`);
  refs.app.style.setProperty("--target", `${settings.targetSize}px`);
  refs.app.style.setProperty("--sub", `${settings.subSize}px`);
  refs.app.style.setProperty("--timerText", `${settings.timerTextSize}px`);
  refs.app.style.setProperty("--wroTitle", `${settings.wroTitleSize}px`);
  refs.app.style.setProperty(
    "--wroSuffix",
    `${settings.wroDateSuffixSize}px`
  );
  document.documentElement.style.colorScheme = settings.theme;
  applyBackground(refs, settings);
  updateLabels();
  scheduleFit();
}
