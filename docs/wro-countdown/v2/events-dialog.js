import { $ } from "./ui.js";

export function bindDialog(refs, audio) {
  function open() {
    refs.overlay.classList.add("open");
    refs.overlay.setAttribute("aria-hidden", "false");
    refs.gear.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => $("close").focus(), 150);
    audio.unlock().catch(() => {});
  }

  function close() {
    refs.overlay.classList.remove("open");
    refs.overlay.setAttribute("aria-hidden", "true");
    refs.gear.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    refs.gear.focus();
  }

  refs.gear.onclick = open;
  $("close").onclick = close;
  $("done").onclick = close;
  refs.overlay.onclick = event => {
    if (event.target === refs.overlay) close();
  };
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && refs.overlay.classList.contains("open")) {
      close();
    }
  });
  document.addEventListener(
    "pointerdown",
    () => audio.unlock().catch(() => {}),
    { capture: true }
  );
}
