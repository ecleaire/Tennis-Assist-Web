const DESKTOP_QUERY =
  "(min-width: 1000px) and (orientation: landscape)";

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

function constrainElement(element, bounds) {
  element.style.setProperty("--safe-correction-x", "0px");
  element.style.setProperty("--safe-correction-y", "0px");
  void element.offsetWidth;

  const rect = element.getBoundingClientRect();
  const safeWidth = Math.max(1, bounds.right - bounds.left);
  const safeHeight = Math.max(1, bounds.bottom - bounds.top);
  let correctionX = 0;
  let correctionY = 0;

  if (rect.width <= safeWidth) {
    if (rect.left < bounds.left) correctionX += bounds.left - rect.left;
    if (rect.right > bounds.right) correctionX -= rect.right - bounds.right;
  } else {
    correctionX = bounds.left + (safeWidth - rect.width) / 2 - rect.left;
  }

  if (rect.height <= safeHeight) {
    if (rect.top < bounds.top) correctionY += bounds.top - rect.top;
    if (rect.bottom > bounds.bottom) correctionY -= rect.bottom - bounds.bottom;
  } else {
    correctionY = bounds.top + (safeHeight - rect.height) / 2 - rect.top;
  }

  element.style.setProperty(
    "--safe-correction-x",
    `${Math.round(correctionX)}px`
  );
  element.style.setProperty(
    "--safe-correction-y",
    `${Math.round(correctionY)}px`
  );
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
      element.style.setProperty("--safe-correction-x", "0px");
      element.style.setProperty("--safe-correction-y", "0px");
    }
    return;
  }

  const bounds = safeBounds(refs);
  constrainElement(refs.currentBlock, bounds);
  constrainElement(refs.display, bounds);
}
