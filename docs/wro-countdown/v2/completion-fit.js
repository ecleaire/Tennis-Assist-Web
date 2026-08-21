import {
  isTextAutoSizeEnabled
} from "./text-auto-size-values.js?v=20260821e";

const DESKTOP_QUERY =
  "(min-width: 1000px) and (orientation: landscape)";
const PHONE_LANDSCAPE_QUERY =
  "(max-width: 999px) and (orientation: landscape)";
const BASE_COMPLETION_SIZE = 96;
const CONFIGURED_MINIMUM = 20;
const SAFETY_MINIMUM = 8;
const CONFIGURED_MAXIMUM = 320;
const cache = new WeakMap();

const limit = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

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
    rect.width > 0 &&
    rect.height > 0;
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
  if (!desktopLayout()) {
    const displayWidth = refs.display.clientWidth ||
      refs.display.getBoundingClientRect().width;
    return Math.max(120, Math.min(displayWidth, viewport.width - 24));
  }

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

function configuredSize(settings) {
  return limit(
    Number(settings.completionTextSize) || BASE_COMPLETION_SIZE,
    CONFIGURED_MINIMUM,
    CONFIGURED_MAXIMUM
  );
}

// Long messages used to reach their maximum safe size at the default slider
// value, so increasing the value on PC appeared to do nothing. Give longer
// text a lower automatic starting scale while preserving the full slider
// range for later enlargement.
function contentScale(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map(line => Array.from(line.replace(/\s+/g, "")).length)
    .filter(Boolean);

  if (!lines.length) return 1;

  const longest = Math.max(...lines);
  const total = lines.reduce((sum, length) => sum + length, 0);
  const longestScale = Math.sqrt(8 / Math.max(8, longest));
  const totalScale = Math.pow(16 / Math.max(16, total), 0.15);
  return limit(longestScale * totalScale, 0.42, 1);
}

function preferredSize(settings, viewport, text) {
  const configured = configuredSize(settings);

  if (!isTextAutoSizeEnabled(settings, "completionText")) {
    return configured;
  }

  const messageScale = contentScale(text);
  const portrait = viewport.height >= viewport.width;
  if (desktopLayout()) {
    const referenceScale = limit(
      Math.min(viewport.width / 1920, viewport.height / 1080),
      0.52,
      2
    );
    return limit(
      180 * referenceScale * configured /
        BASE_COMPLETION_SIZE * messageScale,
      CONFIGURED_MINIMUM,
      CONFIGURED_MAXIMUM
    );
  }

  const widthProgress = limit((viewport.width - 320) / 800, 0, 1);
  const heightScale = !portrait && viewport.height < 560
    ? 0.78
    : portrait && viewport.height < 620
      ? 0.94
      : 1;

  return limit(
    (66 + widthProgress * 62) * heightScale *
      configured / BASE_COMPLETION_SIZE * messageScale,
    CONFIGURED_MINIMUM,
    CONFIGURED_MAXIMUM
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

function setFit(refs, size, width) {
  refs.app.style.setProperty("--completionTextFit", `${size}px`);
  refs.app.style.setProperty(
    "--completionTextMaxWidth",
    `${Math.max(80, Math.floor(width))}px`
  );
  void refs.mainValue.offsetHeight;
}

function fits(refs, width, height) {
  const rect = refs.mainValue.getBoundingClientRect();
  return rect.width <= width + 1 &&
    rect.height <= height + 1 &&
    contentHeight(refs.display) <= height + 1;
}

function signature(refs, settings, viewport, width, height) {
  return JSON.stringify([
    refs.mainValue.textContent,
    refs.modeLabel.textContent,
    refs.targetLabel.hidden ? "" : refs.targetLabel.textContent,
    refs.subValue.hidden ? "" : refs.subValue.textContent.length,
    refs.display.dataset.position,
    settings.completionTextSize,
    isTextAutoSizeEnabled(settings, "completionText"),
    settings.showTarget,
    settings.showHourMinute,
    settings.targetSize,
    settings.subSize,
    Math.round(viewport.width),
    Math.round(viewport.height),
    Math.round(width),
    Math.round(height),
    Math.round(refs.currentBlock.getBoundingClientRect().height)
  ]);
}

function actualFontSize(refs) {
  const value = Number.parseFloat(getComputedStyle(refs.mainValue).fontSize);
  return Number.isFinite(value) ? value : 0;
}

function exposeSizes(refs, requested, preferred, scale) {
  refs.app.dataset.completionRequestedSize = requested.toFixed(2);
  refs.app.dataset.completionPreferredSize = preferred.toFixed(2);
  refs.app.dataset.completionContentScale = scale.toFixed(4);
}

export function fitCompletionMessage(refs, settings) {
  if (refs.app.dataset.timerPhase !== "completion") {
    refs.app.style.removeProperty("--completionTextMaxWidth");
    refs.app.dataset.completionFit = "inactive";
    delete refs.app.dataset.completionRequestedSize;
    delete refs.app.dataset.completionPreferredSize;
    delete refs.app.dataset.completionContentScale;
    delete refs.app.dataset.completionFitSize;
    cache.delete(refs.app);
    return;
  }

  const viewport = viewportSize(refs);
  const width = horizontalBudget(refs, viewport);
  const height = verticalBudget(refs, viewport);
  const requested = configuredSize(settings);
  const automatic = isTextAutoSizeEnabled(settings, "completionText");
  const scale = automatic
    ? contentScale(refs.mainValue.textContent)
    : 1;
  const preferred = preferredSize(
    settings,
    viewport,
    refs.mainValue.textContent
  );
  exposeSizes(refs, requested, preferred, scale);
  refs.app.dataset.completionAutoSize = String(automatic);

  const key = signature(refs, settings, viewport, width, height);
  const previous = cache.get(refs.app);

  if (previous?.key === key) {
    setFit(refs, previous.size, previous.width);
    refs.app.dataset.completionFit = previous.status;
    refs.app.dataset.completionFitSize =
      actualFontSize(refs).toFixed(2);
    return;
  }

  let low = SAFETY_MINIMUM;
  let high = preferred;
  let best = SAFETY_MINIMUM;

  setFit(refs, high, width);
  if (fits(refs, width, height)) {
    best = high;
  } else {
    setFit(refs, low, width);
    if (fits(refs, width, height)) best = low;

    for (let pass = 0; pass < 15 && high - low > 0.25; pass += 1) {
      const middle = (low + high) / 2;
      setFit(refs, middle, width);
      if (fits(refs, width, height)) {
        best = middle;
        low = middle;
      } else {
        high = middle;
      }
    }
  }

  best = Math.max(SAFETY_MINIMUM, Math.floor(best * 4) / 4);
  setFit(refs, best, width);
  const status = fits(refs, width, height) ? "fitted" : "minimum";

  refs.app.dataset.completionFit = status;
  refs.app.dataset.completionFitSize = actualFontSize(refs).toFixed(2);
  cache.set(refs.app, { key, size: best, width, status });
}
