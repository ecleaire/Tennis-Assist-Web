export function fitDisplay(refs, settings) {
  function fitElement(element, variable, size, available, minimum) {
    refs.app.style.setProperty(variable, `${size}px`);
    const width = Math.max(1, element.scrollWidth);
    if (width <= available) return;

    const fitted = Math.max(minimum, size * (available / width) * 0.965);
    refs.app.style.setProperty(variable, `${fitted}px`);
  }

  const actionWidth = refs.gear.parentElement.offsetWidth;
  fitElement(
    refs.clock,
    "--clockFit",
    settings.clockSize,
    Math.max(120, refs.top.clientWidth - actionWidth - 16),
    20
  );
  fitElement(
    refs.mainValue,
    "--timerFit",
    settings.timerSize,
    Math.max(120, refs.display.clientWidth - 3),
    30
  );
}
