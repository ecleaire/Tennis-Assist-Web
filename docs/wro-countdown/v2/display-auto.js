export function createAutoWro(getSettings, callbacks) {
  let showingWro = false;
  let startTimer = 0;
  let endTimer = 0;
  let endAt = 0;

  function clear() {
    clearTimeout(startTimer);
    clearTimeout(endTimer);
    startTimer = 0;
    endTimer = 0;
    endAt = 0;
  }

  function schedule() {
    const settings = getSettings();
    clearTimeout(startTimer);
    startTimer = 0;

    if (settings.mode !== "timer" || !settings.autoWroEnabled) return;

    startTimer = setTimeout(
      begin,
      settings.autoWroIntervalMin * 60000
    );
  }

  function begin() {
    const settings = getSettings();
    if (settings.mode !== "timer" || !settings.autoWroEnabled) return;

    showingWro = true;
    endAt = Date.now() + settings.autoWroDurationMin * 60000;
    callbacks.change();
    callbacks.animate();

    endTimer = setTimeout(
      finish,
      settings.autoWroDurationMin * 60000
    );
  }

  function finish() {
    showingWro = false;
    endAt = 0;
    callbacks.change();
    callbacks.animate();
    schedule();
  }

  function restart(animate = false) {
    clear();
    showingWro = false;
    schedule();
    callbacks.change();
    if (animate) callbacks.animate();
  }

  return {
    restart,
    active: () => showingWro,
    endAt: () => endAt
  };
}
