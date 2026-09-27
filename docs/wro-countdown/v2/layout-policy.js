import { isTextAutoSizeEnabled } from "./text-auto-size-values.js?v=20260927a";

const GAP = 14;
const DESKTOP_QUERY = "(min-width: 800px) and (orientation: landscape)";

const DISPLAY_KINDS = [
  "timer",
  "completionText",
  "target",
  "sub",
  "timerText",
  "wroTitle",
  "wroSuffix"
];

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
  const rects = (children.length ? children : [element])
    .map(node => node.getBoundingClientRect());
  return {
    left: Math.min(...rects.map(rect => rect.left)),
    top: Math.min(...rects.map(rect => rect.top)),
    right: Math.max(...rects.map(rect => rect.right)),
    bottom: Math.max(...rects.map(rect => rect.bottom))
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
    bottom: rect.bottom + y
  };
}

function resetCorrection(element) {
  element.style.setProperty("--collision-x", "0px");
  element.style.setProperty("--collision-y", "0px");
}

function applyCorrection(element, x, y) {
  element.style.setProperty("--collision-x", `${Math.round(x)}px`);
  element.style.setProperty("--collision-y", `${Math.round(y)}px`);
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
      case "timer": return phase !== "completion" && visible(refs.mainValue);
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
    bottom: top + height - 8
  };
}

function within(rect, bounds) {
  return rect.left >= bounds.left && rect.right <= bounds.right &&
    rect.top >= bounds.top && rect.bottom <= bounds.bottom;
}

function movementCandidates(mover, fixed) {
  return [
    { x: 0, y: fixed.bottom + GAP - mover.top },
    { x: 0, y: fixed.top - GAP - mover.bottom },
    { x: fixed.right + GAP - mover.left, y: 0 },
    { x: fixed.left - GAP - mover.right, y: 0 }
  ];
}

function chooseMovement(mover, fixed, bounds) {
  const candidates = movementCandidates(mover, fixed)
    .map(candidate => {
      const rect = translateRect(mover, candidate.x, candidate.y);
      const overlap = overlaps(rect, fixed, GAP);
      const inside = within(rect, bounds);
      const distance = Math.hypot(candidate.x, candidate.y);
      return { ...candidate, rect, overlap, inside, distance };
    })
    .sort((a, b) => {
      const scoreA = (a.overlap ? 1_000_000 : 0) + (a.inside ? 0 : 100_000) + a.distance;
      const scoreB = (b.overlap ? 1_000_000 : 0) + (b.inside ? 0 : 100_000) + b.distance;
      return scoreA - scoreB;
    });
  return candidates[0] || null;
}

export function applyLayoutPolicy(refs, settings) {
  resetCorrection(refs.currentBlock);
  resetCorrection(refs.display);

  const currentAuto = currentIsFullyAutomatic(refs, settings);
  const displayAuto = displayIsFullyAutomatic(refs, settings);
  refs.app.dataset.currentBlockAutoLayout = String(currentAuto);
  refs.app.dataset.displayBlockAutoLayout = String(displayAuto);

  // Small-screen flow/grid layouts already keep automatic content separated.
  // Manual content is deliberately allowed to overflow those cells via CSS.
  if (!window.matchMedia(DESKTOP_QUERY).matches) {
    refs.app.dataset.layoutCollision = "flow";
    return;
  }

  const current = visualRect(refs.currentBlock);
  const display = visualRect(refs.display);
  if (!overlaps(current, display, GAP)) {
    refs.app.dataset.layoutCollision = "none";
    return;
  }

  // If both blocks contain manual text, neither block has priority and overlap
  // is intentional. Manual content never forces another manual value to shrink.
  if (!currentAuto && !displayAuto) {
    refs.app.dataset.layoutCollision = "allowed-manual";
    return;
  }

  let moverElement;
  let moverRect;
  let fixedRect;

  if (currentAuto && displayAuto) {
    const currentPriority = blockFontPriority(refs.currentBlock);
    const displayPriority = blockFontPriority(refs.display);
    const moveCurrent = currentPriority < displayPriority;
    moverElement = moveCurrent ? refs.currentBlock : refs.display;
    moverRect = moveCurrent ? current : display;
    fixedRect = moveCurrent ? display : current;
    refs.app.dataset.layoutPriority = moveCurrent ? "display" : "current";
  } else if (currentAuto) {
    moverElement = refs.currentBlock;
    moverRect = current;
    fixedRect = display;
    refs.app.dataset.layoutPriority = "manual-display";
  } else {
    moverElement = refs.display;
    moverRect = display;
    fixedRect = current;
    refs.app.dataset.layoutPriority = "manual-current";
  }

  const movement = chooseMovement(moverRect, fixedRect, viewportBounds());
  if (!movement || movement.overlap) {
    refs.app.dataset.layoutCollision = "unresolved";
    return;
  }

  applyCorrection(moverElement, movement.x, movement.y);
  refs.app.dataset.layoutCollision = movement.inside ? "resolved" : "resolved-overflow";
}
