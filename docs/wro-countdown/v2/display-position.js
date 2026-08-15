const DESKTOP_QUERY =
  "(min-width: 1000px) and (orientation: landscape)";
const COLLISION_GAP = 18;

const DISPLAY_VARIABLES = [
  ["--timerFit", 30],
  ["--targetFit", 12],
  ["--subFit", 12],
  ["--timerTextFit", 12],
  ["--wroTitleFit", 12],
  ["--wroSuffixFit", 12]
];

function place(element, position, offsetX, offsetY) {
  element.dataset.position = position;
  element.style.setProperty("--position-offset-x", `${offsetX}px`);
  element.style.setProperty("--position-offset-y", `${offsetY}px`);
  element.style.setProperty("--safe-correction-x", "0px");
  element.style.setProperty("--safe-correction-y", "0px");
}

function cssPixels(style, name, fallback) {
  const value = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

function inlinePixels(element, name) {
  const value = Number.parseFloat(element.style.getPropertyValue(name));
  return Number.isFinite(value) ? value : 0;
}

function visible(element) {
  if (!element || element.hidden) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" && style.visibility !== "hidden" &&
    Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
}

function visualRect(element) {
  if (!visible(element)) return null;
  const children = [...element.children].filter(visible);
  const nodes = children.length ? children : [element];
  const rects = nodes.map(node => node.getBoundingClientRect());
  return {
    left: Math.min(...rects.map(rect => rect.left)),
    top: Math.min(...rects.map(rect => rect.top)),
    right: Math.max(...rects.map(rect => rect.right)),
    bottom: Math.max(...rects.map(rect => rect.bottom)),
    width: Math.max(...rects.map(rect => rect.right)) -
      Math.min(...rects.map(rect => rect.left)),
    height: Math.max(...rects.map(rect => rect.bottom)) -
      Math.min(...rects.map(rect => rect.top))
  };
}

function visibleViewport(refs) {
  const visual = window.visualViewport;
  return {
    left: visual?.offsetLeft || 0,
    top: visual?.offsetTop || 0,
    width: Math.min(
      refs.app.clientWidth || window.innerWidth,
      visual?.width || window.innerWidth
    ),
    height: Math.min(
      refs.app.clientHeight || window.innerHeight,
      visual?.height || window.innerHeight
    )
  };
}

function safeBounds(refs) {
  const viewport = visibleViewport(refs);
  const style = getComputedStyle(refs.shell);
  const leftInset = cssPixels(style, "--layout-left", 24);
  const rightInset = cssPixels(style, "--layout-right", 24);
  const topInset = cssPixels(style, "--layout-top", 64);
  const bottomInset = cssPixels(style, "--layout-bottom", 64);

  return {
    left: viewport.left + leftInset,
    right: viewport.left + viewport.width - rightInset,
    top: viewport.top + topInset,
    bottom: viewport.top + viewport.height - bottomInset
  };
}

function translated(rect, x, y) {
  return {
    left: rect.left + x,
    top: rect.top + y,
    right: rect.right + x,
    bottom: rect.bottom + y,
    width: rect.width,
    height: rect.height
  };
}

function expanded(rect, gap) {
  return {
    left: rect.left - gap,
    top: rect.top - gap,
    right: rect.right + gap,
    bottom: rect.bottom + gap,
    width: rect.width + gap * 2,
    height: rect.height + gap * 2
  };
}

function overlapArea(first, second) {
  if (!first || !second) return 0;
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left)
  );
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
  );
  return width * height;
}

function clampDelta(rect, x, y, bounds) {
  let nextX = x;
  let nextY = y;
  let moved = translated(rect, nextX, nextY);
  const safeWidth = Math.max(1, bounds.right - bounds.left);
  const safeHeight = Math.max(1, bounds.bottom - bounds.top);

  if (moved.width <= safeWidth) {
    if (moved.left < bounds.left) nextX += bounds.left - moved.left;
    moved = translated(rect, nextX, nextY);
    if (moved.right > bounds.right) nextX -= moved.right - bounds.right;
  } else {
    nextX += bounds.left + (safeWidth - moved.width) / 2 - moved.left;
  }

  moved = translated(rect, nextX, nextY);
  if (moved.height <= safeHeight) {
    if (moved.top < bounds.top) nextY += bounds.top - moved.top;
    moved = translated(rect, nextX, nextY);
    if (moved.bottom > bounds.bottom) nextY -= moved.bottom - bounds.bottom;
  } else {
    nextY += bounds.top + (safeHeight - moved.height) / 2 - moved.top;
  }

  return { x: nextX, y: nextY };
}

function applyCorrection(element, x, y) {
  element.style.setProperty("--safe-correction-x", `${Math.round(x)}px`);
  element.style.setProperty("--safe-correction-y", `${Math.round(y)}px`);
}

function currentCorrection(element) {
  return {
    x: inlinePixels(element, "--safe-correction-x"),
    y: inlinePixels(element, "--safe-correction-y")
  };
}

function constrainElement(element, bounds) {
  if (!visible(element)) {
    applyCorrection(element, 0, 0);
    return null;
  }

  applyCorrection(element, 0, 0);
  void element.offsetWidth;
  const rect = visualRect(element);
  const correction = clampDelta(rect, 0, 0, bounds);
  applyCorrection(element, correction.x, correction.y);
  void element.offsetWidth;
  return visualRect(element);
}

function obstacleRect(element) {
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

function uniqueNumbers(values) {
  const rounded = values.map(value => Math.round(value * 100) / 100);
  return [...new Set(rounded)];
}

function displayObstacles(refs) {
  return [
    visualRect(refs.currentBlock),
    obstacleRect(refs.gear.parentElement),
    obstacleRect(refs.foot)
  ].filter(Boolean);
}

function overlapWithObstacles(rect, obstacles, gap = COLLISION_GAP) {
  return obstacles.reduce(
    (total, obstacle) => total + overlapArea(rect, expanded(obstacle, gap)),
    0
  );
}

function anchorPenalty(position, x, y) {
  const row = positionRow(position);
  const column = positionColumn(position);
  let penalty = Math.abs(y) + Math.abs(x) * 24;

  // A top/bottom selection should stay in the selected row. Moving down from
  // the top or up from the bottom is allowed so two items in the same anchor
  // can stack without changing the selected corner.
  if (row === "top" && y < 0) penalty += Math.abs(y) * 80;
  if (row === "bottom" && y > 0) penalty += Math.abs(y) * 80;

  // Keep the selected left/right edge whenever possible. Horizontal movement
  // is a last resort; vertical stacking is strongly preferred.
  if (column === "left" && x < 0) penalty += Math.abs(x) * 80;
  if (column === "right" && x > 0) penalty += Math.abs(x) * 80;

  return penalty;
}

function resolveDisplayCollision(refs, bounds) {
  const display = visualRect(refs.display);
  if (!display) return true;

  const obstacles = displayObstacles(refs);
  if (!overlapWithObstacles(display, obstacles)) return true;

  const base = currentCorrection(refs.display);
  const vertical = [0];
  const horizontal = [0];

  for (const obstacle of obstacles) {
    vertical.push(
      obstacle.top - COLLISION_GAP - display.bottom,
      obstacle.bottom + COLLISION_GAP - display.top
    );
    horizontal.push(
      obstacle.left - COLLISION_GAP - display.right,
      obstacle.right + COLLISION_GAP - display.left
    );
  }

  const candidates = [];
  for (const rawY of uniqueNumbers(vertical)) {
    for (const rawX of uniqueNumbers(horizontal)) {
      const delta = clampDelta(display, rawX, rawY, bounds);
      const moved = translated(display, delta.x, delta.y);
      const overlap = overlapWithObstacles(moved, obstacles);
      const score = overlap * 1_000_000 +
        anchorPenalty(refs.display.dataset.position, delta.x, delta.y);
      candidates.push({ ...delta, overlap, score });
    }
  }

  candidates.sort((first, second) => first.score - second.score);
  const best = candidates[0] || { x: 0, y: 0, overlap: Infinity };
  applyCorrection(refs.display, base.x + best.x, base.y + best.y);
  void refs.display.offsetWidth;
  return best.overlap === 0;
}

function readVariable(app, name, fallback) {
  const value = Number.parseFloat(
    app.style.getPropertyValue(name) ||
    getComputedStyle(app).getPropertyValue(name)
  );
  return Number.isFinite(value) ? value : fallback;
}

function baseSizes(refs) {
  return {
    clock: readVariable(refs.app, "--clockFit", 64),
    display: Object.fromEntries(
      DISPLAY_VARIABLES.map(([name, minimum]) => [
        name,
        readVariable(refs.app, name, minimum)
      ])
    )
  };
}

function applySafetyScale(refs, bases, clockScale, displayScale) {
  refs.app.style.setProperty(
    "--clockFit",
    `${Math.max(20, bases.clock * clockScale)}px`
  );
  for (const [name, minimum] of DISPLAY_VARIABLES) {
    refs.app.style.setProperty(
      name,
      `${Math.max(minimum, bases.display[name] * displayScale)}px`
    );
  }
}

function collisionState(refs) {
  const current = visualRect(refs.currentBlock);
  const display = visualRect(refs.display);
  const actions = obstacleRect(refs.gear.parentElement);
  const footer = obstacleRect(refs.foot);

  const state = {
    currentDisplay: Boolean(
      current && display && overlapArea(current, expanded(display, 8)) > 0
    ),
    currentActions: Boolean(
      current && actions && overlapArea(current, expanded(actions, 6)) > 0
    ),
    displayActions: Boolean(
      display && actions && overlapArea(display, expanded(actions, 6)) > 0
    ),
    currentFooter: Boolean(
      current && footer && overlapArea(current, expanded(footer, 6)) > 0
    ),
    displayFooter: Boolean(
      display && footer && overlapArea(display, expanded(footer, 6)) > 0
    )
  };

  state.any = Object.values(state).some(Boolean);
  return state;
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

export function constrainPositioning(refs) {
  if (!window.matchMedia(DESKTOP_QUERY).matches) {
    for (const element of [refs.currentBlock, refs.display]) {
      applyCorrection(element, 0, 0);
    }
    refs.app.dataset.layoutCollision = "none";
    refs.app.dataset.clockAnchorPreserved = "true";
    return;
  }

  const bounds = safeBounds(refs);
  const bases = baseSizes(refs);
  let clockScale = 1;
  let displayScale = 1;
  let resolved = false;

  // The current-time position is authoritative. It is only clamped back into
  // the safe viewport; collision handling moves or shrinks the countdown
  // block instead of relocating the current-time block to another anchor.
  for (let pass = 0; pass < 12; pass += 1) {
    applySafetyScale(refs, bases, clockScale, displayScale);
    constrainElement(refs.currentBlock, bounds);
    constrainElement(refs.display, bounds);
    resolveDisplayCollision(refs, bounds);

    const state = collisionState(refs);
    if (!state.any) {
      resolved = true;
      break;
    }

    const currentOnly =
      (state.currentActions || state.currentFooter) &&
      !state.currentDisplay &&
      !state.displayActions &&
      !state.displayFooter;

    if (currentOnly) {
      clockScale *= 0.84;
    } else if (pass < 8) {
      displayScale *= 0.84;
    } else {
      displayScale *= 0.9;
      clockScale *= 0.92;
    }
  }

  refs.app.dataset.layoutCollision = resolved ? "resolved" : "unresolved";
  refs.app.dataset.clockAnchorPreserved = "true";
}
