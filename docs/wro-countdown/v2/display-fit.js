import { SIZE_LIMITS } from "./size-limits.js?v=20260814r";

const BASE = {
  clock: 64,
  timer: 116,
  target: 32,
  sub: 23,
  timerText: 26,
  wroTitle: 30,
  wroSuffix: 22
};

const DESKTOP_QUERY =
  "(min-width: 1000px) and (orientation: landscape)";
const FREE_LAYOUT_QUERY =
  "(min-width: 800px), (orientation: landscape)";

const limit = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

function desktopLayout() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

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
    height: Math.max(
      320,
      Math.min(
        refs.app.clientHeight || window.innerHeight || 720,
        visual?.height || window.innerHeight || 720
      )
    )
  };
}

function viewportProfile(viewport) {
  const aspect = viewport.width / viewport.height;
  if (viewport.width < 1200 || viewport.height < 700) return "compact";
  if (viewport.width < 1600 || viewport.height < 900) return "notebook";
  if (viewport.width < 2200 || viewport.height < 1200) return "desktop";
  if (viewport.width < 3200 || viewport.height < 1800) return "large";
  return aspect >= 2.3 ? "ultrawide" : "xlarge";
}

function responsiveSizes(refs, settings) {
  if (!settings.autoSize) {
    return {
      clock: settings.clockSize,
      timer: settings.timerSize,
      target: settings.targetSize,
      sub: settings.subSize,
      timerText: settings.timerTextSize,
      wroTitle: settings.wroTitleSize,
      wroSuffix: settings.wroDateSuffixSize
    };
  }

  const viewport = viewportSize(refs);
  const portrait = viewport.height >= viewport.width;

  if (desktopLayout()) {
    const referenceScale = limit(
      Math.min(viewport.width / 1920, viewport.height / 1080),
      0.52,
      2
    );

    return {
      clock: limit(
        112 * referenceScale * settings.clockSize / BASE.clock,
        SIZE_LIMITS.clockSize.minimum,
        SIZE_LIMITS.clockSize.maximum
      ),
      timer: limit(
        300 * referenceScale * settings.timerSize / BASE.timer,
        SIZE_LIMITS.timerSize.minimum,
        SIZE_LIMITS.timerSize.maximum
      ),
      target: limit(
        52 * referenceScale * settings.targetSize / BASE.target,
        SIZE_LIMITS.targetSize.minimum,
        SIZE_LIMITS.targetSize.maximum
      ),
      sub: limit(
        34 * referenceScale * settings.subSize / BASE.sub,
        SIZE_LIMITS.subSize.minimum,
        SIZE_LIMITS.subSize.maximum
      ),
      timerText: limit(
        40 * referenceScale * settings.timerTextSize / BASE.timerText,
        SIZE_LIMITS.timerTextSize.minimum,
        SIZE_LIMITS.timerTextSize.maximum
      ),
      wroTitle: limit(
        46 * referenceScale * settings.wroTitleSize / BASE.wroTitle,
        SIZE_LIMITS.wroTitleSize.minimum,
        SIZE_LIMITS.wroTitleSize.maximum
      ),
      wroSuffix: limit(
        30 * referenceScale * settings.wroDateSuffixSize / BASE.wroSuffix,
        SIZE_LIMITS.wroDateSuffixSize.minimum,
        SIZE_LIMITS.wroDateSuffixSize.maximum
      )
    };
  }

  const widthProgress = limit((viewport.width - 320) / 800, 0, 1);
  const heightScale = !portrait && viewport.height < 560
    ? 0.78
    : portrait && viewport.height < 620
      ? 0.94
      : 1;

  return {
    clock: limit(
      (80 + widthProgress * 48) * heightScale * settings.clockSize / BASE.clock,
      SIZE_LIMITS.clockSize.minimum,
      SIZE_LIMITS.clockSize.maximum
    ),
    timer: limit(
      (252 + widthProgress * 38) * heightScale * settings.timerSize / BASE.timer,
      SIZE_LIMITS.timerSize.minimum,
      SIZE_LIMITS.timerSize.maximum
    ),
    target: limit(
      (36 + widthProgress * 20) * heightScale * settings.targetSize / BASE.target,
      SIZE_LIMITS.targetSize.minimum,
      SIZE_LIMITS.targetSize.maximum
    ),
    sub: limit(
      (24 + widthProgress * 14) * heightScale * settings.subSize / BASE.sub,
      SIZE_LIMITS.subSize.minimum,
      SIZE_LIMITS.subSize.maximum
    ),
    timerText: limit(
      (27 + widthProgress * 17) * heightScale * settings.timerTextSize / BASE.timerText,
      SIZE_LIMITS.timerTextSize.minimum,
      SIZE_LIMITS.timerTextSize.maximum
    ),
    wroTitle: limit(
      (26 + widthProgress * 22) * heightScale * settings.wroTitleSize / BASE.wroTitle,
      SIZE_LIMITS.wroTitleSize.minimum,
      SIZE_LIMITS.wroTitleSize.maximum
    ),
    wroSuffix: limit(
      (19 + widthProgress * 14) * heightScale * settings.wroDateSuffixSize / BASE.wroSuffix,
      SIZE_LIMITS.wroDateSuffixSize.minimum,
      SIZE_LIMITS.wroDateSuffixSize.maximum
    )
  };
}

function layoutWidth(element) {
  return Math.max(1, element.offsetWidth);
}

function positionColumn(position = "center") {
  if (position.endsWith("-left")) return "left";
  if (position.endsWith("-right")) return "right";
  return "center";
}

function positionRow(position = "center") {
  if (position.startsWith("top-")) return "top";
  if (position.startsWith("bottom-")) return "bottom";
  return "middle";
}

function horizontalBudget(kind, element, viewport) {
  if (!desktopLayout()) {
    return Math.max(120, element.parentElement.clientWidth);
  }

  const column = positionColumn(element.dataset.position);
  const side = column !== "center";
  const width = viewport.width;

  if (kind === "clock") {
    const fraction = side
      ? width < 1200 ? 0.48 : width < 1600 ? 0.43 : width < 2200 ? 0.39 : 0.35
      : 0.88;
    return Math.max(180, width * fraction);
  }

  const fraction = side
    ? width < 1200 ? 0.70 : width < 1600 ? 0.75 : width < 2200 ? 0.79 : 0.82
    : 0.92;
  return Math.max(260, width * fraction);
}

function cssPixels(style, name, fallback) {
  const value = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

function verticalBudget(refs, element, viewport, kind) {
  if (!desktopLayout()) return viewport.height;

  const style = getComputedStyle(refs.shell);
  const top = cssPixels(style, "--layout-top", 64);
  const bottom = cssPixels(style, "--layout-bottom", 64);
  const usable = Math.max(180, viewport.height - top - bottom);
  const row = positionRow(element.dataset.position);

  if (kind === "clock") {
    return row === "middle" ? usable * 0.52 : usable * 0.34;
  }

  return row === "middle" ? usable * 0.92 : usable * 0.52;
}

function applyDisplayVariables(refs, sizes) {
  refs.app.style.setProperty("--targetFit", `${sizes.target}px`);
  refs.app.style.setProperty("--subFit", `${sizes.sub}px`);
  refs.app.style.setProperty("--timerTextFit", `${sizes.timerText}px`);
  refs.app.style.setProperty("--wroTitleFit", `${sizes.wroTitle}px`);
  refs.app.style.setProperty("--wroSuffixFit", `${sizes.wroSuffix}px`);
  refs.app.style.setProperty("--timerFit", `${sizes.timer}px`);
  refs.app.style.setProperty("--clockFit", `${sizes.clock}px`);
}

function fitBlockHeight(refs, sizes, budget) {
  let height = refs.display.offsetHeight;
  if (height <= budget) return sizes;

  let next = { ...sizes };
  for (let pass = 0; pass < 2 && height > budget; pass += 1) {
    const ratio = limit(budget / height * 0.97, 0.45, 1);
    next = {
      ...next,
      timer: Math.max(30, next.timer * ratio),
      target: Math.max(SIZE_LIMITS.targetSize.minimum, next.target * ratio),
      sub: Math.max(SIZE_LIMITS.subSize.minimum, next.sub * ratio),
      timerText: Math.max(
        SIZE_LIMITS.timerTextSize.minimum,
        next.timerText * ratio
      ),
      wroTitle: Math.max(
        SIZE_LIMITS.wroTitleSize.minimum,
        next.wroTitle * ratio
      ),
      wroSuffix: Math.max(
        SIZE_LIMITS.wroDateSuffixSize.minimum,
        next.wroSuffix * ratio
      )
    };
    applyDisplayVariables(refs, next);
    void refs.display.offsetHeight;
    height = refs.display.offsetHeight;
  }

  return next;
}

export function fitDisplay(refs, settings) {
  function fitSingleLine(element, variable, preferred, available, minimum) {
    const safeWidth = Math.max(minimum * 2, available - 18);
    refs.app.style.setProperty(variable, `${preferred}px`);
    void element.offsetWidth;

    let width = layoutWidth(element);
    if (width <= safeWidth) return preferred;

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
    return fitted;
  }

  const viewport = viewportSize(refs);
  refs.app.dataset.viewportProfile = viewportProfile(viewport);
  refs.app.dataset.viewportAspect = viewport.width / viewport.height >= 2.3
    ? "ultrawide"
    : viewport.width / viewport.height <= 1.5
      ? "square"
      : "wide";

  let sizes = responsiveSizes(refs, settings);
  applyDisplayVariables(refs, sizes);

  if (settings.showCurrentTime) {
    sizes.clock = fitSingleLine(
      refs.clock,
      "--clockFit",
      sizes.clock,
      horizontalBudget("clock", refs.currentBlock, viewport),
      SIZE_LIMITS.clockSize.minimum
    );
  }

  sizes.timer = fitSingleLine(
    refs.mainValue,
    "--timerFit",
    sizes.timer,
    horizontalBudget("timer", refs.display, viewport),
    30
  );

  if (refs.modeLabel.classList.contains("wroTitle")) {
    sizes.wroTitle = fitSingleLine(
      refs.modeLabel,
      "--wroTitleFit",
      sizes.wroTitle,
      horizontalBudget("timer", refs.display, viewport),
      SIZE_LIMITS.wroTitleSize.minimum
    );
  }

  sizes = fitBlockHeight(
    refs,
    sizes,
    verticalBudget(refs, refs.display, viewport, "timer")
  );
  applyDisplayVariables(refs, sizes);
}
