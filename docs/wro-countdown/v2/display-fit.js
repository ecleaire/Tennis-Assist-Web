import { SIZE_LIMITS } from "./size-limits.js?v=20260927a";
import {
  applyTextAutoSizeData,
  isTextAutoSizeEnabled
} from "./text-auto-size-values.js?v=20260927a";

const BASE = {
  clock: 64,
  date: 16,
  timer: 116,
  completionText: 96,
  target: 32,
  sub: 23,
  timerText: 26,
  wroTitle: 30,
  wroSuffix: 22
};

const SETTING = {
  clock: "clockSize",
  date: "dateSize",
  timer: "timerSize",
  completionText: "completionTextSize",
  target: "targetSize",
  sub: "subSize",
  timerText: "timerTextSize",
  wroTitle: "wroTitleSize",
  wroSuffix: "wroDateSuffixSize"
};

const VARIABLE = {
  clock: "--clockFit",
  date: "--dateFit",
  timer: "--timerFit",
  completionText: "--completionTextFit",
  target: "--targetFit",
  sub: "--subFit",
  timerText: "--timerTextFit",
  wroTitle: "--wroTitleFit",
  wroSuffix: "--wroSuffixFit"
};

const MINIMUM = {
  clock: SIZE_LIMITS.clockSize.minimum,
  date: SIZE_LIMITS.dateSize.minimum,
  timer: 12,
  completionText: 8,
  target: SIZE_LIMITS.targetSize.minimum,
  sub: SIZE_LIMITS.subSize.minimum,
  timerText: SIZE_LIMITS.timerTextSize.minimum,
  wroTitle: SIZE_LIMITS.wroTitleSize.minimum,
  wroSuffix: SIZE_LIMITS.wroDateSuffixSize.minimum
};

const DESKTOP_QUERY = "(min-width: 1000px) and (orientation: landscape)";

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number(value)));

function desktopLayout() {
  return window.matchMedia(DESKTOP_QUERY).matches;
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

function profile(viewport) {
  if (viewport.width < 1200 || viewport.height < 700) return "compact";
  if (viewport.width < 1600 || viewport.height < 900) return "notebook";
  if (viewport.width < 2200 || viewport.height < 1200) return "desktop";
  if (viewport.width < 3200 || viewport.height < 1800) return "large";
  return "xlarge";
}

function configured(settings, kind) {
  const key = SETTING[kind];
  const limits = SIZE_LIMITS[key];
  const numeric = Number(settings[key]);
  const fallback = BASE[kind];
  return clamp(
    Number.isFinite(numeric) ? numeric : fallback,
    limits?.minimum ?? MINIMUM[kind],
    limits?.maximum ?? Infinity
  );
}

function automaticPreferred(settings, kind, viewport) {
  const value = configured(settings, kind);
  const portrait = viewport.height >= viewport.width;

  if (desktopLayout()) {
    const scale = clamp(
      Math.min(viewport.width / 1920, viewport.height / 1080),
      0.52,
      4
    );
    const desktopBase = {
      clock: 112,
      date: 26,
      timer: 300,
      completionText: 180,
      target: 52,
      sub: 34,
      timerText: 40,
      wroTitle: 46,
      wroSuffix: 30
    }[kind];
    return Math.max(MINIMUM[kind], desktopBase * scale * value / BASE[kind]);
  }

  const progress = clamp((viewport.width - 320) / 800, 0, 1);
  const heightScale = !portrait && viewport.height < 560
    ? 0.78
    : portrait && viewport.height < 620
      ? 0.94
      : 1;
  const mobileBase = {
    clock: 80 + progress * 48,
    date: 16 + progress * 10,
    timer: 252 + progress * 38,
    completionText: 66 + progress * 62,
    target: 36 + progress * 20,
    sub: 24 + progress * 14,
    timerText: 27 + progress * 17,
    wroTitle: 26 + progress * 22,
    wroSuffix: 19 + progress * 14
  }[kind];

  return Math.max(
    MINIMUM[kind],
    mobileBase * heightScale * value / BASE[kind]
  );
}

function preferred(settings, kind, viewport) {
  return isTextAutoSizeEnabled(settings, kind)
    ? automaticPreferred(settings, kind, viewport)
    : configured(settings, kind);
}

function allSizes(settings, viewport) {
  return Object.fromEntries(
    Object.keys(SETTING).map(kind => [kind, preferred(settings, kind, viewport)])
  );
}

function applyVariable(refs, kind, value) {
  refs.app.style.setProperty(VARIABLE[kind], `${Math.max(1, value)}px`);
}

function applyAll(refs, sizes) {
  for (const [kind, value] of Object.entries(sizes)) {
    applyVariable(refs, kind, value);
  }
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

function measureSingleLine(refs, element) {
  const clone = element.cloneNode(false);
  clone.removeAttribute("id");
  clone.removeAttribute("hidden");
  clone.classList.remove("glitch");
  clone.textContent = element.textContent || "00:00:00";
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    position: "fixed",
    left: "-100000px",
    top: "0",
    right: "auto",
    bottom: "auto",
    width: "max-content",
    minWidth: "0",
    maxWidth: "none",
    margin: "0",
    visibility: "hidden",
    pointerEvents: "none",
    animation: "none",
    clipPath: "none",
    transform: "none",
    whiteSpace: "nowrap"
  });
  refs.app.append(clone);
  const width = Math.max(1, clone.getBoundingClientRect().width);
  clone.remove();
  return width;
}

function fitSingleLine(refs, settings, kind, element, available, sizes) {
  if (!visible(element) || !isTextAutoSizeEnabled(settings, kind)) return;

  const minimum = MINIMUM[kind];
  let current = sizes[kind];
  const safeWidth = Math.max(minimum * 2, available - 8);
  applyVariable(refs, kind, current);
  void element.offsetWidth;

  let width = measureSingleLine(refs, element);
  if (width <= safeWidth) return;

  current = Math.max(minimum, current * safeWidth / width * 0.99);
  sizes[kind] = current;
  applyVariable(refs, kind, current);
  void element.offsetWidth;

  width = measureSingleLine(refs, element);
  if (width > safeWidth && current > minimum) {
    current = Math.max(minimum, current * safeWidth / width * 0.99);
    sizes[kind] = current;
    applyVariable(refs, kind, current);
  }
}

function displayWidth(refs, viewport) {
  if (desktopLayout()) return Math.max(240, viewport.width - 48);
  const rect = refs.display.getBoundingClientRect();
  return Math.max(120, Math.min(rect.width || viewport.width, viewport.width - 24));
}

function contentHeight(element) {
  const children = [...element.children].filter(visible);
  if (!children.length) return Math.max(1, element.getBoundingClientRect().height);
  const rects = children.map(child => child.getBoundingClientRect());
  return Math.max(...rects.map(rect => rect.bottom)) -
    Math.min(...rects.map(rect => rect.top));
}

function displayHeightBudget(refs, viewport) {
  if (desktopLayout()) return Math.max(120, viewport.height - 80);

  const displayRect = refs.display.getBoundingClientRect();
  const available = displayRect.height || viewport.height;
  return Math.max(72, Math.min(available, viewport.height - 20));
}

function displayEntries(refs) {
  const completion = refs.app.dataset.timerPhase === "completion";
  const wro = refs.app.dataset.timerPhase === "wro";
  const entries = [
    { kind: "target", element: refs.targetLabel },
    { kind: "wroSuffix", element: refs.wroSuffix },
    { kind: "timerText", element: refs.timerText },
    {
      kind: completion ? "completionText" : "timer",
      element: refs.mainValue
    },
    { kind: "sub", element: refs.subValue }
  ];
  if (wro && refs.modeLabel.classList.contains("wroTitle")) {
    entries.push({ kind: "wroTitle", element: refs.modeLabel });
  }
  return entries.filter(entry => visible(entry.element));
}

function fitDisplayHeight(refs, settings, sizes, budget) {
  refs.app.dataset.tightLayout = "false";
  applyAll(refs, sizes);
  void refs.display.offsetHeight;

  let height = contentHeight(refs.display);
  const adjustable = displayEntries(refs)
    .filter(entry => isTextAutoSizeEnabled(settings, entry.kind))
    .sort((a, b) => sizes[a.kind] - sizes[b.kind]);

  if (height <= budget || !adjustable.length) {
    refs.app.dataset.autoLayoutOverflow = String(height > budget);
    return;
  }

  refs.app.dataset.tightLayout = "true";
  void refs.display.offsetHeight;
  height = contentHeight(refs.display);

  // Smaller automatic text yields first. The largest automatic display is
  // reduced only after all smaller automatic items have reached their minima.
  for (const entry of adjustable) {
    if (height <= budget) break;

    const kind = entry.kind;
    const original = sizes[kind];
    const minimum = MINIMUM[kind];
    if (original <= minimum + 0.1) continue;

    sizes[kind] = minimum;
    applyVariable(refs, kind, minimum);
    void refs.display.offsetHeight;
    const minimumHeight = contentHeight(refs.display);

    if (minimumHeight > budget) {
      height = minimumHeight;
      continue;
    }

    let low = minimum;
    let high = original;
    let best = minimum;
    for (let pass = 0; pass < 14 && high - low > 0.25; pass += 1) {
      const middle = (low + high) / 2;
      applyVariable(refs, kind, middle);
      void refs.display.offsetHeight;
      const nextHeight = contentHeight(refs.display);
      if (nextHeight <= budget) {
        best = middle;
        low = middle;
      } else {
        high = middle;
      }
    }
    sizes[kind] = best;
    applyVariable(refs, kind, best);
    void refs.display.offsetHeight;
    height = contentHeight(refs.display);
  }

  refs.app.dataset.autoLayoutOverflow = String(height > budget);
}

export function fitDisplay(refs, settings) {
  applyTextAutoSizeData(refs.app, settings);

  const viewport = viewportSize(refs);
  refs.app.dataset.viewportProfile = profile(viewport);
  refs.app.dataset.viewportAspect = viewport.width / viewport.height >= 2.3
    ? "ultrawide"
    : viewport.width / viewport.height <= 1.5
      ? "square"
      : "wide";

  const sizes = allSizes(settings, viewport);
  applyAll(refs, sizes);

  const width = displayWidth(refs, viewport);
  if (settings.showCurrentTime) {
    fitSingleLine(refs, settings, "clock", refs.clock, viewport.width - 32, sizes);
    fitSingleLine(refs, settings, "date", refs.date, viewport.width - 32, sizes);
  }

  const completion = refs.app.dataset.timerPhase === "completion";
  fitSingleLine(
    refs,
    settings,
    completion ? "completionText" : "timer",
    refs.mainValue,
    width,
    sizes
  );

  if (refs.modeLabel.classList.contains("wroTitle")) {
    fitSingleLine(refs, settings, "wroTitle", refs.modeLabel, width, sizes);
  }

  fitDisplayHeight(refs, settings, sizes, displayHeightBudget(refs, viewport));
  applyAll(refs, sizes);
}
