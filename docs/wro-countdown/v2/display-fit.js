let lastKey = "";

function measureSample(refs, element, variable, size, sample) {
  refs.app.style.setProperty(variable, `${size}px`);

  const clone = element.cloneNode(false);
  clone.removeAttribute("id");
  clone.removeAttribute("hidden");
  clone.classList.remove("glitch");
  clone.textContent = sample;
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "max-content",
    maxWidth: "none",
    visibility: "hidden",
    pointerEvents: "none",
    animation: "none",
    clipPath: "none",
    transform: "none"
  });

  refs.app.append(clone);
  const width = Math.max(1, clone.getBoundingClientRect().width);
  clone.remove();
  return width;
}

function fitElement({
  refs,
  element,
  variable,
  configured,
  available,
  minimum,
  maximum,
  sample,
  autoSize,
  autoMultiplier
}) {
  const target = Math.max(minimum * 2, available - 8);
  const initial = autoSize
    ? Math.min(maximum, configured * autoMultiplier)
    : configured;

  const sampleWidth = measureSample(
    refs,
    element,
    variable,
    initial,
    sample
  );

  let fitted = initial;
  if (sampleWidth > target) {
    fitted = Math.max(
      minimum,
      initial * (target / sampleWidth) * 0.975
    );
  }

  refs.app.style.setProperty(variable, `${fitted}px`);
  void element.offsetWidth;

  const actualWidth = Math.max(
    1,
    element.scrollWidth,
    element.getBoundingClientRect().width
  );

  if (actualWidth > target) {
    fitted = Math.max(
      minimum,
      fitted * (target / actualWidth) * 0.97
    );
    refs.app.style.setProperty(variable, `${fitted}px`);
  }
}

export function fitDisplay(refs, settings) {
  const actionWidth = refs.gear.parentElement.offsetWidth;
  const clockAvailable = Math.max(
    120,
    refs.top.clientWidth - actionWidth - 16
  );
  const timerAvailable = Math.max(120, refs.display.clientWidth - 4);
  const mainLength = refs.mainValue.textContent.length;

  const key = [
    settings.autoSize,
    settings.clockSize,
    settings.timerSize,
    Math.round(clockAvailable),
    Math.round(timerAvailable),
    mainLength
  ].join("|");

  if (key === lastKey) return;
  lastKey = key;

  fitElement({
    refs,
    element: refs.clock,
    variable: "--clockFit",
    configured: settings.clockSize,
    available: clockAvailable,
    minimum: 20,
    maximum: 180,
    sample: "00:00:00",
    autoSize: settings.autoSize,
    autoMultiplier: 1.55
  });

  fitElement({
    refs,
    element: refs.mainValue,
    variable: "--timerFit",
    configured: settings.timerSize,
    available: timerAvailable,
    minimum: 30,
    maximum: 260,
    sample: "00:00:00",
    autoSize: settings.autoSize,
    autoMultiplier: 1.7
  });
}
