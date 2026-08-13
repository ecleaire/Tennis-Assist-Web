export function applyDisplayTheme(refs, settings, updateLabels, scheduleFit) {
  refs.app.dataset.theme = settings.theme;
  refs.app.style.setProperty("--clock", `${settings.clockSize}px`);
  refs.app.style.setProperty("--timer", `${settings.timerSize}px`);
  refs.app.style.setProperty("--target", `${settings.targetSize}px`);
  refs.app.style.setProperty("--custom", `${settings.customTextSize}px`);
  refs.app.style.setProperty("--sub", `${settings.subSize}px`);
  document.documentElement.style.colorScheme = settings.theme;
  document.body.style.background =
    settings.theme === "dark" ? "#050708" : "#fff";
  refs.metaTheme.content =
    settings.theme === "dark" ? "#050708" : "#fff";
  updateLabels();
  scheduleFit();
}
