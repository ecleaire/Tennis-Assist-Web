import { APP_VERSION } from "./v2/version.js?v=20261001a";

const RELEASE = APP_VERSION;
const RELOAD_KEY = `wro-countdown-sw-${RELEASE}`;

async function ensureFreshWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const previousController = navigator.serviceWorker.controller;
    const registration = await navigator.serviceWorker.register(
      `./sw.js?v=${encodeURIComponent(RELEASE)}`,
      { scope: "./", updateViaCache: "none" }
    );
    await registration.update().catch(() => {});

    // ready may resolve to an old active worker while the update is installing.
    // Wait for this registration's new worker before loading child modules.
    const worker = registration.installing || registration.waiting || registration.active;
    if (worker && worker.state !== "activated") {
      await new Promise((resolve, reject) => {
        const changed = () => {
          if (worker.state !== "activated" && worker.state !== "redundant") return;
          worker.removeEventListener("statechange", changed);
          if (worker.state === "activated") resolve();
          else reject(new Error("Fresh-load worker was superseded."));
        };
        worker.addEventListener("statechange", changed);
        changed();
      });
    }

    if (navigator.serviceWorker.controller !== registration.active) {
      await new Promise(resolve => {
        const changed = () => {
          if (navigator.serviceWorker.controller !== registration.active) return;
          navigator.serviceWorker.removeEventListener("controllerchange", changed);
          resolve();
        };
        navigator.serviceWorker.addEventListener("controllerchange", changed);
        changed();
      });
    }

    if (previousController !== navigator.serviceWorker.controller &&
        sessionStorage.getItem(RELOAD_KEY) !== "1") {
      sessionStorage.setItem(RELOAD_KEY, "1");
      location.reload();
      await new Promise(() => {});
    }
  } catch (error) {
    console.warn("Fresh-load worker unavailable; continuing normally.", error);
  }
}

async function start() {
  await ensureFreshWorker();
  await import(`./v2/entry.js?release=${encodeURIComponent(RELEASE)}&t=${Date.now()}`);
}

start().catch(error => {
  console.error(error);
  document.body.textContent = "読み込み中にエラーが発生しました。ページを再読み込みしてください。";
});
