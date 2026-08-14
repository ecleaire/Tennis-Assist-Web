function place(element, position, offsetX, offsetY) {
  element.dataset.position = position;
  element.style.setProperty("--position-offset-x", `${offsetX}px`);
  element.style.setProperty("--position-offset-y", `${offsetY}px`);
}

export function applyPositioning(refs, settings, temporaryWro = false) {
  const wroActive = settings.mode === "wro" || temporaryWro;

  refs.app.dataset.activeDisplay = wroActive ? "wro" : "timer";

  place(
    refs.currentBlock,
    settings.clockPosition,
    settings.clockOffsetX,
    settings.clockOffsetY
  );

  if (wroActive) {
    place(
      refs.display,
      settings.wroPosition,
      settings.wroOffsetX,
      settings.wroOffsetY
    );
  } else {
    place(
      refs.display,
      settings.timerPosition,
      settings.timerOffsetX,
      settings.timerOffsetY
    );
  }
}
