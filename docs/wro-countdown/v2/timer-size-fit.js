import { SIZE_LIMITS } from "./size-limits.js?v=20260821d";

const DESKTOP_QUERY =
  "(min-width: 1000px) and (orientation: landscape)";
const PHONE_LANDSCAPE_QUERY =
  "(max-width: 999px) and (orientation: landscape)";
const BASE_TIMER_SIZE = 116;
const SAFETY_MINIMUM = 12;
const cache = new WeakMap();

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number(value)));

function desktopLayout() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function phoneLandscape() {
  return window.matchMedia(PHONE_LANDSCAPE_QUERY).matches;
}

function visible(element) {
  if (!element || element.hidden) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity || 1) > 0 &&
    rect.width > 0 && rect.height > 0;
}

function cssPixels(style, name, fallback = 0) {
  const value = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

function viewportSize(refs) {
  const visual = window.visualViewport;
  return {
    width: Math.max(
      280,
      Math.min(
        refs.app.clientWidth || window.innerWidth,
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

function horizontalBudget(refs, viewport) {
  if (desktopLayout()) {
    const column = positionColumn(refs.display.dataset.position);
    const side = column !== "center";
    const width = viewport.width;
    const fraction = side
      ? width < 1200
        ? 0.70
        : width < 1600
          ? 0.75
          : width < 2200
            ? 0.79
            : 0.82
      : 0.92;
    return Math.max(260, Math.min(width * fraction, width - 48));
  }

  const displayStyle = getComputedStyle(refs.display);
  const displayPadding = cssPixels(displayStyle, "padding-left") +
    cssPixels(displayStyle, "padding-right");

  if (phoneLandscape()) {
    const shellStyle = getComputedStyle(refs.shell);
    const columns = shellStyle.gridTemplateColumns
      .split(/\s+/)
      .map(value => Number.parseFloat(value))
      .filter(Number.isFinite);
    if (columns.length >= 2) {
      return Math.max(120, columns[columns.length - 1] - displayPadding - 4);
    }
  }

  const shellStyle = getComputedStyle(refs.shell);
  const shellPadding = cssPixels(shellStyle, "padding-left") +
    cssPixels(shellStyle, "padding-right");
  const displayWidth = refs.display.clientWidth ||
    refs.display.getBoundingClientRect().width;

  return Math.max(
    120,
    Math.min(
      displayWidth || viewport.width - shellPadding,
      viewport.width - shellPadding
    ) - displayPadding - 4
  );
}

function verticalBudget(refs, viewport) {
  if (desktopLayout()) {
    const style = getComputedStyle(refs.shell);
    const top = cssPixels(style, "--layout-top", 64);
    const bottom = cssPixels(style, "--layout-bottom", 64);
    const usable = Math.max(180, viewport.height - top - bottom);
    return positionRow(refs.display.dataset.position) === "middle"
      ? usable * 0.92
      : usable * 0.52;
  }

  const shellStyle = getComputedStyle(refs.shell);
  const displayStyle = getComputedStyle(refs.display);
  const shellPadding = cssPixels(shellStyle, "padding-top") +
    cssPixels(shellStyle, "padding-bottom");
  const rowGap = cssPixels(shellStyle, "row-gap");
  const displayPadding = cssPixels(displayStyle, "padding-top") +
    cssPixels(displayStyle, "padding-bottom");
  const footerHeight = visible(refs.foot)
    ? refs.foot.getBoundingClientRect().height
    : 0;
  const topHeight = visible(refs.top)
    ? refs.top.getBoundingClientRect().height
    : 0;
  const fallback = phoneLandscape()
    ? viewport.height - shellPadding - footerHeight - rowGap
    : viewport.height - shellPadding - topHeight - footerHeight - rowGap * 2;
  const gridArea = refs.display.clientHeight > 0
    ? refs.display.clientHeight
    : fallback;

  return Math.max(
    72,
    Math.min(gridArea, fallback) - displayPadding - 4
  );
}

function preferredSize(settings, viewport) {
  const limits = SIZE_LIMITS.timerSize;
  const configured = clamp(
    settings.timerSize,
    limits.minimum,
    limits.maximum
  );

  if (!settings.autoSize) return configured;

  const portrait = viewport.height >= viewport.width;
  if (desktopLayout()) {
    const referenceScale = clamp(
      Math.min(viewport.width / 1920, viewport.height / 1080),
      0.52,
      4
    );
    return clamp(
      300 * referenceScale * configured / BASE_TIMER_SIZE,
      limits.minimum,
      limits.maximum
    );
  }

  const widthProgress = clamp((viewport.width - 320) / 800, 0, 1);
  const heightScale = !portrait && viewport.height < 560
    ? 0.78
    : portrait && viewport.height < 620
      ? 0.94
      : 1;

  return clamp(
    (252 + widthProgress * 38) * heightScale *
      configured / BASE_TIMER_SIZE,
    limits.minimum,
    limits.maximum
  );
}

function contentHeight(element) {
  const children = [...element.children].filter(visible);
  if (!children.length) {
    return Math.max(1, element.getBoundingClientRect().height);
  }
  const rects = children.map(child => child.getBoundingClientRect());
  return Math.max(...rects.map(rect => rect.bottom)) -
    Math.min(...rects.map(rect => rect.top));
}

function setTimerSize(refs, size) {
  refs.app.style.setProperty("--timerFit", `${size}px`);
  refs.mainValue.style.setProperty(
    "font-size",
    "var(--timerFit)",
    "important"
  );
  void refs.mainValue.offsetWidth;
}

function fits(refs, width, height) {
  const rect = refs.mainValue.getBoundingClientRect();
  return rect.width <= width + 1 &&
    rect.height <= height + 1 &&
    contentHeight(refs.display) <= height + 1;
}

function signature(refs, settings, viewport, width, height) {
  return JSON.stringify([
    refs.app.dataset.timerPhase,
    refs.app.dataset.activeDisplay,
    refs.display.dataset.position,
    refs.mainValue.textContent?.length || 0,
    refs.targetLabel.hidden ? "" : refs.targetLabel.textContent,
    refs.timerText.hidden ? "" : refs.timerText.textContent?.length || 0,
    refs.subValue.hidden ? "" : refs.subValue.textContent?.length || 0,
    settings.timerSize,
    settings.autoSize,
    settings.targetSize,
    settings.timerTextSize,
    settings.subSize,
    Math.round(viewport.width),
    Math.round(viewport.height),
    Math.round(width),
    Math.round(height)
  ]);
}

export function fitTimerSize(refs, settings) {
  if (refs.app.dataset.timerPhase === "completion") {
    cache.delete(refs.app);
    return;
  }

  const viewport = viewportSize(refs);
  const width = horizontalBudget(refs, viewport);
  const height = verticalBudget(refs, viewport);
  const preferred = preferredSize(settings, viewport);
  const key = signature(refs, settings, viewport, width, height);
  const previous = cache.get(refs.app);

  refs.app.dataset.timerPreferredSize = preferred.toFixed(2);

  if (previous?.key === key) {
    setTimerSize(refs, previous.size);
    return;
  }

  let low = SAFETY_MINIMUM;
  let high = preferred;
  let best = SAFETY_MINIMUM;

  setTimerSize(refs, high);
  if (fits(refs, width, height)) {
    best = high;
  } else {
    setTimerSize(refs, low);
    if (fits(refs, width, height)) best = low;

    for (let pass = 0; pass < 17 && high - low > 0.2; pass += 1) {
      const middle = (low + high) / 2;
      setTimerSize(refs, middle);
      if (fits(refs, width, height)) {
        best = middle;
        low = middle;
      } else {
        high = middle;
      }
    }
  }

  best = Math.max(SAFETY_MINIMUM, Math.floor(best * 4) / 4);
  setTimerSize(refs, best);
  cache.set(refs.app, { key, size: best });
}
