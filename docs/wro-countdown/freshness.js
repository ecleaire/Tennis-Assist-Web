import { APP_VERSION } from "./v2/version.js?v=20261001a";

const RELEASE = APP_VERSION;
const WORKER_TIMEOUT_MS = 5000;
const RELOAD_KEY = `wro-countdown-sw-${RELEASE}`;

function abortable(promise, signal) {
  return new Promise((resolve, reject) => {
    const aborted = () => reject(signal.reason);
    if (signal.aborted) return aborted();
    signal.addEventListener("abort", aborted, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", aborted);
    });
  });
}

function waitForWorkerEvent(target, event, check, signal) {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener(event, changed);
      signal.removeEventListener("abort", aborted);
    };
    const aborted = () => {
      cleanup();
      reject(signal.reason);
    };
    const changed = () => {
      try {
        if (!check()) return;
        cleanup();
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
    if (signal.aborted) return aborted();
    target.addEventListener(event, changed);
    signal.addEventListener("abort", aborted, { once: true });
    changed();
  });
}

async function ensureFreshWorker() {
  if (!("serviceWorker" in navigator)) return;
  const deadline = new AbortController();
  const timeout = setTimeout(() => deadline.abort(
    new Error("Service Worker refresh timed out; starting the timer normally.")
  ), WORKER_TIMEOUT_MS);
  const { signal } = deadline;

  try {
    const previousController = navigator.serviceWorker.controller;
    const registration = await abortable(navigator.serviceWorker.register(
      `./sw.js?v=${encodeURIComponent(RELEASE)}`,
      { scope: "./", updateViaCache: "none" }
    ), signal);
    await abortable(registration.update().catch(() => {}), signal);

    const worker = registration.installing || registration.waiting || registration.active;
    if (worker) {
      await waitForWorkerEvent(worker, "statechange", () => {
        if (worker.state === "redundant") throw new Error("Fresh-load worker was superseded.");
        return worker.state === "activated";
      }, signal);
    }

    await waitForWorkerEvent(navigator.serviceWorker, "controllerchange", () =>
      Boolean(registration.active) && navigator.serviceWorker.controller === registration.active,
    signal);

    if (previousController !== navigator.serviceWorker.controller &&
        sessionStorage.getItem(RELOAD_KEY) !== "1") {
      sessionStorage.setItem(RELOAD_KEY, "1");
      location.reload();
      await abortable(new Promise(() => {}), signal);
    }
  } catch (error) {
    console.warn("Fresh-load worker unavailable; continuing normally.", error);
  } finally {
    clearTimeout(timeout);
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
