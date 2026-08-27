import { $ } from "./ui.js";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

function visible(element) {
  if (!(element instanceof HTMLElement)) return false;
  if (element.hidden) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" &&
    style.visibility !== "hidden" &&
    rect.width > 0 && rect.height > 0;
}

export function bindDialog(refs, audio) {
  const panel = refs.overlay.querySelector(".panel");
  const closeButton = $("close");
  const doneButton = $("done");

  let previousFocus = null;
  let previousOverflow = "";
  let focusFrame = 0;

  function isOpen() {
    return refs.overlay.classList.contains("open");
  }

  function focusableElements() {
    return [...panel.querySelectorAll(FOCUSABLE_SELECTOR)].filter(visible);
  }

  function open() {
    if (isOpen()) return;

    previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : refs.gear;
    previousOverflow = document.body.style.overflow;

    refs.overlay.classList.add("open");
    refs.overlay.setAttribute("aria-hidden", "false");
    refs.gear.setAttribute("aria-expanded", "true");
    refs.shell.inert = true;
    refs.shell.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "hidden";

    cancelAnimationFrame(focusFrame);
    focusFrame = requestAnimationFrame(() => {
      focusFrame = 0;
      if (isOpen()) closeButton.focus({ preventScroll: true });
    });

    audio.unlock().catch(() => {});
  }

  function close() {
    cancelAnimationFrame(focusFrame);
    focusFrame = 0;

    refs.overlay.classList.remove("open");
    refs.overlay.setAttribute("aria-hidden", "true");
    refs.gear.setAttribute("aria-expanded", "false");
    refs.shell.inert = false;
    refs.shell.removeAttribute("aria-hidden");
    document.body.style.overflow = previousOverflow;

    const target = previousFocus?.isConnected
      ? previousFocus
      : refs.gear;
    requestAnimationFrame(() => {
      if (!isOpen()) target.focus({ preventScroll: true });
    });
  }

  function trapTab(event) {
    const focusable = focusableElements();
    if (!focusable.length) {
      event.preventDefault();
      panel.focus?.();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const outside = !panel.contains(active);

    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  }

  refs.gear.onclick = open;
  closeButton.onclick = close;
  doneButton.onclick = close;
  refs.overlay.onclick = event => {
    if (event.target === refs.overlay) close();
  };

  document.addEventListener("keydown", event => {
    if (!isOpen()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      trapTab(event);
    }
  });

  document.addEventListener(
    "pointerdown",
    () => audio.unlock().catch(() => {}),
    { capture: true }
  );
}
