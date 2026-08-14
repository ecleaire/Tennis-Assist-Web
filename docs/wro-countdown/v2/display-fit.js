const BASE = {
  clock: 64,
  timer: 116,
  target: 32,
  sub: 23,
  timerText: 26
};

const FREE_LAYOUT_QUERY =
  "(min-width: 800px), (orientation: landscape)";

const limit = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

function freeLayout() {
  return window.matchMedia(FREE_LAYOUT_QUERY).matches;
}

function viewportSize(refs) {
  const visual = window.visualViewport;
  const layoutWidth = freeLayout()
    ? refs.app.clientWidth
    : refs.display.clientWidth;

  return {
    width: Math.max(
      280,
      Math.min(
        layoutWidth || window.innerWidth,
        visual?.width || window.innerWidth
      )
    ),
    height: Math.max(320, visual?.height || window.innerHeight || 720)
  };
}

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

  const viewport = viewportSize(refs);
  const portrait = viewport.height >= viewport.width;
  const widthProgress = limit((viewport.width - 320) / 800, 0, 1);
  const heightScale = !portrait && viewport.height < 560
    ? 0.78
    : portrait && viewport.height < 620
      ? 0.94
      : 1;

  return {
    clock: limit(
      (80 + widthProgress * 48) * heightScale * settings.clockSize / BASE.clock,
      20,
      180
    ),
    timer: limit(
      (252 + widthProgress * 38) * heightScale * settings.timerSize / BASE.timer,
      36,
      260
    ),
    target: limit(
      (36 + widthProgress * 20) * heightScale * settings.targetSize / BASE.target,
      12,
      100
    ),
    sub: limit(
      (24 + widthProgress * 14) * heightScale * settings.subSize / BASE.sub,
      12,
      80
    ),
    timerText: limit(
      (27 + widthProgress * 17) * heightScale * settings.timerTextSize / BASE.timerText,
      12,
      100
    )
  };
}

function layoutWidth(element) {
  // offsetWidth deliberately excludes the animated ::before/::after noise bands.
  return Math.max(1, element.offsetWidth);
}

export function fitDisplay(refs, settings) {
  function fitSingleLine(element, variable, preferred, available, minimum) {
    const safeWidth = Math.max(minimum * 2, available - 18);
    refs.app.style.setProperty(variable, `${preferred}px`);
    void element.offsetWidth;

    let width = layoutWidth(element);
    if (width <= safeWidth) return;

    let fitted = Math.max(
      minimum,
      preferred * safeWidth / width * 0.99
    );
    refs.app.style.setProperty(variable, `${fitted}px`);
    void element.offsetWidth;

    width = layoutWidth(element);
    if (width > safeWidth && fitted > minimum) {
      fitted = Math.max(
        minimum,
        fitted * safeWidth / width * 0.99
      );
      refs.app.style.setProperty(variable, `${fitted}px`);
    }
  }

  const sizes = responsiveSizes(refs, settings);
  refs.app.style.setProperty("--targetFit", `${sizes.target}px`);
  refs.app.style.setProperty("--subFit", `${sizes.sub}px`);
  refs.app.style.setProperty("--timerTextFit", `${sizes.timerText}px`);

  const wide = freeLayout();
  const appWidth = Math.max(280, refs.app.clientWidth || window.innerWidth);
  const actionWidth = refs.gear.parentElement.offsetWidth;
  const clockAvailable = wide
    ? appWidth - 48
    : refs.top.clientWidth - actionWidth - 12;
  const timerAvailable = wide
    ? appWidth - 48
    : refs.display.clientWidth;

  fitSingleLine(
    refs.clock,
    "--clockFit",
    sizes.clock,
    Math.max(120, clockAvailable),
    20
  );
  fitSingleLine(
    refs.mainValue,
    "--timerFit",
    sizes.timer,
    Math.max(120, timerAvailable),
    30
  );
}
