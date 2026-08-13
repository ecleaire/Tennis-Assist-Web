const BASE = {
  clock: 64,
  timer: 116,
  target: 32,
  sub: 23,
  timerText: 26
};

const limit = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

function responsiveSizes(refs, settings) {
  if (!settings.autoSize) {
    return {
      clock: settings.clockSize,
      timer: settings.timerSize,
      target: settings.targetSize,
      sub: settings.subSize,
      timerText: settings.timerTextSize
    };
  }

  const width = Math.max(280, refs.display.clientWidth || window.innerWidth);
  const progress = limit((width - 320) / 800, 0, 1);
  const height = window.innerHeight || 720;
  const heightScale = height < 560 ? 0.78 : height < 700 ? 0.9 : 1;

  return {
    clock: limit(
      (76 + progress * 52) * heightScale * settings.clockSize / BASE.clock,
      20,
      180
    ),
    timer: limit(
      (220 + progress * 40) * heightScale * settings.timerSize / BASE.timer,
      36,
      260
    ),
    target: limit(
      (34 + progress * 20) * heightScale * settings.targetSize / BASE.target,
      12,
      100
    ),
    sub: limit(
      (22 + progress * 14) * heightScale * settings.subSize / BASE.sub,
      12,
      80
    ),
    timerText: limit(
      (26 + progress * 16) * heightScale * settings.timerTextSize / BASE.timerText,
      12,
      100
    )
  };
}

export function fitDisplay(refs, settings) {
  function fitElement(element, variable, size, available, minimum) {
    const safe = Math.max(minimum * 2, available - 18);
    refs.app.style.setProperty(variable, `${size}px`);
    void element.offsetWidth;

    let width = Math.max(
      1,
      element.scrollWidth,
      element.getBoundingClientRect().width
    );
    if (width <= safe) return;

    let fitted = Math.max(minimum, size * safe / width * 0.965);
    refs.app.style.setProperty(variable, `${fitted}px`);
    void element.offsetWidth;

    width = Math.max(
      1,
      element.scrollWidth,
      element.getBoundingClientRect().width
    );
    if (width > safe && fitted > minimum) {
      fitted = Math.max(minimum, fitted * safe / width * 0.97);
      refs.app.style.setProperty(variable, `${fitted}px`);
    }
  }

  const sizes = responsiveSizes(refs, settings);
  refs.app.style.setProperty("--targetFit", `${sizes.target}px`);
  refs.app.style.setProperty("--subFit", `${sizes.sub}px`);
  refs.app.style.setProperty("--timerTextFit", `${sizes.timerText}px`);

  const actionWidth = refs.gear.parentElement.offsetWidth;
  fitElement(
    refs.clock,
    "--clockFit",
    sizes.clock,
    Math.max(120, refs.top.clientWidth - actionWidth - 16),
    20
  );
  fitElement(
    refs.mainValue,
    "--timerFit",
    sizes.timer,
    Math.max(120, refs.display.clientWidth),
    30
  );
}
