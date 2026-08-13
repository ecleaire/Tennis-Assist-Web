export function watchDisplaySize(scheduleFit) {
  window.addEventListener("resize", scheduleFit, { passive: true });
  window.addEventListener("orientationchange", () => {
    window.setTimeout(scheduleFit, 120);
  }, { passive: true });
}
