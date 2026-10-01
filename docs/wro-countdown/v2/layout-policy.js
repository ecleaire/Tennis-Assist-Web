import { isTextAutoSizeEnabled } from "./text-auto-size-values.js?v=20261001a";

const GAP = 14;
const ABSOLUTE_QUERY = "(min-width: 800px), (orientation: landscape)";
const PHONE_LANDSCAPE_QUERY = "(orientation: landscape) and (max-width: 999px)";
const MAX_SHRINK_PASSES = 160;

const DISPLAY_KINDS = [
  "timer",
  "completionText",
  "target",
  "sub",
  "timerText",
  "wroTitle",
  "wroSuffix"
];

const FIT_VARIABLES = {
  clock: ["--clockFit", 20],
  date: ["--dateFit", 10],
  timer: ["--timerFit", 12],
  completionText: ["--completionTextFit", 8],
  target: ["--targetFit", 12],
  sub: ["--subFit", 12],
  timerText: ["--timerTextFit", 12],
  wroTitle: ["--wroTitleFit", 12],
  wroSuffix: ["--wroSuffixFit", 12]
};

function usesAbsolutePlacement() {
  if (window.matchMedia(PHONE_LANDSCAPE_QUERY).matches) return false;
  return window.matchMedia(ABSOLUTE_QUERY).matches;
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

function visualRect(element) {
  if (!visible(element)) return null;
  const children = [...element.children].filter(visible);
  const rects = [element, ...children]
    .map(node => node.getBoundingClientRect());
  const left = Math.min(...rects.map(rect => rect.left));
  const top = Math.min(...rects.map(rect => rect.top));
  const right = Math.max(...rects.map(rect => rect.right));
  const bottom = Math.max(...rects.map(rect => rect.bottom));
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top
  };
}

function elementRect(element) {
  if (!visible(element)) return null;
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
}

function overlaps(first, second, gap = 0) {
  if (!first || !second) return false;
  return first.left < second.right + gap &&
    first.right > second.left - gap &&
    first.top < second.bottom + gap &&
    first.bottom > second.top - gap;
}

function translateRect(rect, x, y) {
  return {
    left: rect.left + x,
    top: rect.top + y,
    right: rect.right + x,
    bottom: rect.bottom + y,
    width: rect.width,
    height: rect.height
  };
}

function readPixels(element, name) {
  const value = Number.parseFloat(element.style.getPropertyValue(name));
  return Number.isFinite(value) ? value : 0;
}

function correction(element) {
  return {
    x: readPixels(element, "--collision-x"),
    y: readPixels(element, "--collision-y")
  };
}

function resetCorrection(element) {
  element.style.setProperty("--collision-x", "0px");
  element.style.setProperty("--collision-y", "0px");
}

function applyCorrection(element, x, y) {
  element.style.setProperty("--collision-x", `${x}px`);
  element.style.setProperty("--collision-y", `${y}px`);
}

function addCorrection(element, x, y) {
  const base = correction(element);
  applyCorrection(element, base.x + x, base.y + y);
  void element.offsetWidth;
}

function blockFontPriority(element) {
  const nodes = [element, ...element.querySelectorAll("*")].filter(visible);
  return nodes.reduce((largest, node) => {
    const size = Number.parseFloat(getComputedStyle(node).fontSize);
    return Number.isFinite(size) ? Math.max(largest, size) : largest;
  }, 0);
}

function currentIsFullyAutomatic(refs, settings) {
  if (!settings.showCurrentTime || !visible(refs.currentBlock)) return false;
  const clockAuto = isTextAutoSizeEnabled(settings, "clock");
  const dateAuto = !visible(refs.date) || isTextAutoSizeEnabled(settings, "date");
  return clockAuto && dateAuto;
}

function displayKinds(refs) {
  const phase = refs.app.dataset.timerPhase;
  return DISPLAY_KINDS.filter(kind => {
    switch (kind) {
      case "timer": return phase === "countdown" && visible(refs.mainValue);
      case "completionText": return phase === "completion" && visible(refs.mainValue);
      case "target": return visible(refs.targetLabel);
      case "sub": return visible(refs.subValue);
      case "timerText": return visible(refs.timerText);
      case "wroTitle": return refs.modeLabel.classList.contains("wroTitle") && visible(refs.modeLabel);
      case "wroSuffix": return visible(refs.wroSuffix);
      default: return false;
    }
  });
}

function displayIsFullyAutomatic(refs, settings) {
  const kinds = displayKinds(refs);
  return kinds.length > 0 && kinds.every(kind => isTextAutoSizeEnabled(settings, kind));
}

function viewportBounds() {
  const visual = window.visualViewport;
  const left = visual?.offsetLeft || 0;
  const top = visual?.offsetTop || 0;
  const width = visual?.width || window.innerWidth;
  const height = visual?.height || window.innerHeight;
  return {
    left: left + 8,
    top: top + 8,
    right: left + width - 8,
    bottom: top + height - 8,
    width: Math.max(1, width - 16),
    height: Math.max(1, height - 16)
  };
}

function within(rect, bounds) {
  const tolerance = 0.1;
  return rect.left >= bounds.left - tolerance && rect.right <= bounds.right + tolerance &&
    rect.top >= bounds.top - tolerance && rect.bottom <= bounds.bottom + tolerance;
}

function clampDelta(rect, bounds) {
  let x = 0;
  let y = 0;

  if (rect.width <= bounds.width) {
    if (rect.left < bounds.left) x += bounds.left - rect.left;
    const moved = translateRect(rect, x, 0);
    if (moved.right > bounds.right) x -= moved.right - bounds.right;
  } else {
    x = bounds.left + (bounds.width - rect.width) / 2 - rect.left;
  }

  if (rect.height <= bounds.height) {
    if (rect.top < bounds.top) y += bounds.top - rect.top;
    const moved = translateRect(rect, 0, y);
    if (moved.bottom > bounds.bottom) y -= moved.bottom - bounds.bottom;
  } else {
    y = bounds.top + (bounds.height - rect.height) / 2 - rect.top;
  }

  return { x, y };
}

function constrainAutomatic(element, bounds) {
  const rect = visualRect(element);
  if (!rect) return;
  const delta = clampDelta(rect, bounds);
  if (Math.abs(delta.x) > 0.25 || Math.abs(delta.y) > 0.25) {
    addCorrection(element, delta.x, delta.y);
  }
}

function movementCandidates(mover, fixed) {
  return [
    { x: 0, y: fixed.bottom + GAP - mover.top },
    { x: 0, y: fixed.top - GAP - mover.bottom },
    { x: fixed.right + GAP - mover.left, y: 0 },
    { x: fixed.left - GAP - mover.right, y: 0 }
  ];
}

function chooseMovement(mover, fixed, bounds, obstacles = []) {
  const forbidden = [fixed, ...obstacles];
  return forbidden.flatMap(obstacle => movementCandidates(mover, obstacle))
    .map(candidate => {
      let rect = translateRect(mover, candidate.x, candidate.y);
      const clamp = clampDelta(rect, bounds);
      const x = candidate.x + clamp.x;
      const y = candidate.y + clamp.y;
      rect = translateRect(mover, x, y);
      const overlap = forbidden.some(obstacle => overlaps(rect, obstacle, GAP));
      const inside = within(rect, bounds);
      const distance = Math.hypot(x, y);
      return { x, y, rect, overlap, inside, distance };
    })
    .sort((a, b) => {
      const scoreA = (a.overlap ? 1_000_000 : 0) +
        (a.inside ? 0 : 100_000) + a.distance;
      const scoreB = (b.overlap ? 1_000_000 : 0) +
        (b.inside ? 0 : 100_000) + b.distance;
      return scoreA - scoreB;
    })[0] || null;
}

function moveAway(element, obstacle, bounds, obstacles = []) {
  const mover = visualRect(element);
  if (!mover || !obstacle || !overlaps(mover, obstacle, GAP)) return true;
  const movement = chooseMovement(mover, obstacle, bounds, obstacles);
  if (!movement || movement.overlap) return false;
  addCorrection(element, movement.x, movement.y);
  return true;
}

function fixedObstacles(refs) {
  return [
    elementRect(refs.gear?.parentElement),
    elementRect(refs.foot)
  ].filter(Boolean);
}

function avoidFixed(element, bounds, obstacles) {
  for (const obstacle of obstacles) {
    if (!moveAway(element, obstacle, bounds, obstacles)) return false;
    constrainAutomatic(element, bounds);
  }
  return true;
}

function readFit(app, variable, fallback) {
  const value = Number.parseFloat(
    app.style.getPropertyValue(variable) ||
    getComputedStyle(app).getPropertyValue(variable)
  );
  return Number.isFinite(value) ? value : fallback;
}

function shrinkKind(refs, settings, kind, factor = 0.86) {
  if (!isTextAutoSizeEnabled(settings, kind)) return false;
  const [variable, minimum] = FIT_VARIABLES[kind];
  const current = readFit(refs.app, variable, minimum);
  if (current <= minimum + 0.5) return false;
  const next = Math.max(minimum, current * factor);
  refs.app.style.setProperty(variable, `${next}px`);
  return next < current - 0.25;
}

function shrinkBlock(refs, settings, element) {
  const kinds = element === refs.currentBlock
    ? ["clock", ...(visible(refs.date) ? ["date"] : [])]
    : displayKinds(refs);
  // Exhaust smaller automatic text before reducing the largest display.
  const adjustable = kinds.filter(kind => isTextAutoSizeEnabled(settings, kind))
    .sort((a, b) => readFit(refs.app, FIT_VARIABLES[a][0], 0) -
      readFit(refs.app, FIT_VARIABLES[b][0], 0));
  for (const kind of adjustable) {
    if (shrinkKind(refs, settings, kind)) {
      void element.offsetWidth;
      return true;
    }
  }
  return false;
}

function resetAndPrepareAutomatic(refs, settings, element, isAutomatic, bounds, obstacles) {
  if (!isAutomatic) return true;
  for (let pass = 0; pass <= MAX_SHRINK_PASSES; pass += 1) {
    resetCorrection(element);
    constrainAutomatic(element, bounds);
    const avoided = avoidFixed(element, bounds, obstacles);
    const rect = visualRect(element);
    if (!rect || (avoided && within(rect, bounds) &&
        !obstacles.some(obstacle => overlaps(rect, obstacle, GAP)))) return true;
    if (pass === MAX_SHRINK_PASSES || !shrinkBlock(refs, settings, element)) break;
  }
  return false;
}

function choosePriority(refs, currentAuto, displayAuto) {
  if (currentAuto && displayAuto) {
    const currentPriority = blockFontPriority(refs.currentBlock);
    const displayPriority = blockFontPriority(refs.display);
    const moveCurrent = currentPriority < displayPriority;
    return {
      mover: moveCurrent ? refs.currentBlock : refs.display,
      fixed: moveCurrent ? refs.display : refs.currentBlock,
      label: moveCurrent ? "display" : "current"
    };
  }
  if (currentAuto) {
    return {
      mover: refs.currentBlock,
      fixed: refs.display,
      label: "manual-display"
    };
  }
  if (displayAuto) {
    return {
      mover: refs.display,
      fixed: refs.currentBlock,
      label: "manual-current"
    };
  }
  return null;
}

function autoCollisionRemaining(refs, currentAuto, displayAuto, obstacles) {
  const current = visualRect(refs.currentBlock);
  const display = visualRect(refs.display);

  if ((currentAuto || displayAuto) && overlaps(current, display, GAP)) return true;

  if (currentAuto && current) {
    if (obstacles.some(obstacle => overlaps(current, obstacle, GAP))) return true;
  }
  if (displayAuto && display) {
    if (obstacles.some(obstacle => overlaps(display, obstacle, GAP))) return true;
  }
  return false;
}

export function applyLayoutPolicy(refs, settings) {
  resetCorrection(refs.currentBlock);
  resetCorrection(refs.display);
  delete refs.app.dataset.layoutPriority;

  const currentAuto = currentIsFullyAutomatic(refs, settings);
  const displayAuto = displayIsFullyAutomatic(refs, settings);
  refs.app.dataset.currentBlockAutoLayout = String(currentAuto);
  refs.app.dataset.displayBlockAutoLayout = String(displayAuto);

  // Flow/grid layouts naturally separate automatic blocks. Manual text can
  // overflow those cells by design, without forcing sibling sizes to change.
  if (!usesAbsolutePlacement()) {
    refs.app.dataset.layoutCollision = "flow";
    return;
  }

  const bounds = viewportBounds();
  const obstacles = fixedObstacles(refs);

  resetAndPrepareAutomatic(refs, settings, refs.currentBlock, currentAuto, bounds, obstacles);
  resetAndPrepareAutomatic(refs, settings, refs.display, displayAuto, bounds, obstacles);

  let current = visualRect(refs.currentBlock);
  let display = visualRect(refs.display);
  if (!overlaps(current, display, GAP)) {
    const unresolved = autoCollisionRemaining(
      refs,
      currentAuto,
      displayAuto,
      obstacles
    );
    refs.app.dataset.layoutCollision = unresolved ? "unresolved" : "none";
    return;
  }

  // All-manual means no priority, no collision avoidance and no safety shrink.
  if (!currentAuto && !displayAuto) {
    refs.app.dataset.layoutCollision = "allowed-manual";
    return;
  }

  const priority = choosePriority(refs, currentAuto, displayAuto);
  refs.app.dataset.layoutPriority = priority?.label || "";

  let resolved = false;
  for (let pass = 0; pass <= MAX_SHRINK_PASSES; pass += 1) {
    current = visualRect(refs.currentBlock);
    display = visualRect(refs.display);

    if (!overlaps(current, display, GAP)) {
      resolved = true;
      break;
    }

    const fixedRect = visualRect(priority.fixed);
    if (moveAway(priority.mover, fixedRect, bounds, obstacles)) {
      constrainAutomatic(priority.mover, bounds);
      avoidFixed(priority.mover, bounds, obstacles);
      current = visualRect(refs.currentBlock);
      display = visualRect(refs.display);
      if (!overlaps(current, display, GAP)) {
        resolved = true;
        break;
      }
    }

    if (pass === MAX_SHRINK_PASSES) break;
    if (!shrinkBlock(refs, settings, priority.mover)) {
      // Only after the smaller block reaches its minima may the larger
      // automatic block yield. A manual block always remains fixed.
      if (!currentAuto || !displayAuto ||
          !shrinkBlock(refs, settings, priority.fixed)) break;
      resetAndPrepareAutomatic(refs, settings, priority.fixed, true, bounds, obstacles);
    }

    // Size changes invalidate earlier translations. Re-anchor automatic blocks
    // before trying again, while manual blocks remain untouched.
    resetCorrection(priority.mover);
    constrainAutomatic(priority.mover, bounds);
    avoidFixed(priority.mover, bounds, obstacles);
  }

  const unresolved = !resolved || autoCollisionRemaining(
    refs,
    currentAuto,
    displayAuto,
    obstacles
  );
  refs.app.dataset.layoutCollision = unresolved ? "unresolved" : "resolved";
}
