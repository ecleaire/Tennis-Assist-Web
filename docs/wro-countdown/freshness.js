const RELEASE = "1.1.0";
const UPDATED_AT = "2026年9月27日";
const RELOAD_KEY = `wro-countdown-sw-${RELEASE}`;

function updateVisibleVersion() {
  const root = document.querySelector(".settingsVersion");
  if (!root) return false;
  const version = root.querySelector("strong");
  const date = root.querySelector("small");
  if (version) version.textContent = `v${RELEASE}`;
  if (date) date.textContent = `更新日：${UPDATED_AT}`;
  return true;
}

function watchVersion() {
  if (updateVisibleVersion()) return;
  const observer = new MutationObserver(() => {
    if (updateVisibleVersion()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

async function ensureFreshWorker() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register(
      `./sw.js?v=${encodeURIComponent(RELEASE)}`,
      { scope: "./", updateViaCache: "none" }
    );
    await registration.update().catch(() => {});

    const controller = navigator.serviceWorker.controller;
    const ours = controller?.scriptURL?.includes("/wro-countdown/sw.js");
    if (!ours && sessionStorage.getItem(RELOAD_KEY) !== "1") {
      sessionStorage.setItem(RELOAD_KEY, "1");
      await navigator.serviceWorker.ready;
      location.reload();
      await new Promise(() => {});
    }
  } catch (error) {
    console.warn("Fresh-load worker unavailable; continuing normally.", error);
  }
}

async function start() {
  await ensureFreshWorker();
  watchVersion();
  await import(`./v2/entry.js?release=${encodeURIComponent(RELEASE)}&t=${Date.now()}`);
}

start().catch(error => {
  console.error(error);
  document.body.textContent = "読み込み中にエラーが発生しました。ページを再読み込みしてください。";
});
