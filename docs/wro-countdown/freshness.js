const RELEASE = "1.1.0";
const UPDATED_AT = "2026年9月27日";
const RELOAD_KEY = `wro-countdown-sw-${RELEASE}`;

function setText(element, text) {
  if (element && element.textContent !== text) element.textContent = text;
}

function updateReleaseUi() {
  const root = document.querySelector(".settingsVersion");
  if (root) {
    setText(root.querySelector("strong"), `v${RELEASE}`);
    setText(root.querySelector("small"), `更新日：${UPDATED_AT}`);
  }

  document.querySelectorAll(".perTextAutoSizeCopy small").forEach(element => {
    setText(
      element,
      "オン：重なりを避けて自動調整／オフ：入力したpxを固定し、重なりを許可"
    );
  });

  const master = document.getElementById("autoSizeMasterDescription");
  if (master) {
    const next = master.textContent
      .replace(
        /入力したpxを優先し、はみ出す場合だけ安全に縮小します。/g,
        "入力したpxを固定し、他の表示との重なりを許可します。"
      )
      .replace(
        /オフの項目は入力したpxを優先し、はみ出す場合だけ安全に縮小します。/g,
        "オフの項目は入力したpxを固定し、他の表示との重なりを許可します。"
      );
    setText(master, next);
  }

  document.querySelectorAll(".settingSizeMetric").forEach(element => {
    const next = element.textContent.replace(
      "・画面内に収めるため安全縮小",
      "・重なり許可"
    );
    setText(element, next);
  });
}

function watchReleaseUi() {
  let settingsObserver = null;

  const attach = () => {
    const settingsRoot = document.getElementById("settingsRoot");
    if (!settingsRoot || settingsObserver) return false;

    updateReleaseUi();
    settingsObserver = new MutationObserver(updateReleaseUi);
    settingsObserver.observe(settingsRoot, {
      childList: true,
      subtree: true,
      characterData: true
    });
    return true;
  };

  if (attach()) return;

  const bootstrapObserver = new MutationObserver(() => {
    if (attach()) bootstrapObserver.disconnect();
  });
  bootstrapObserver.observe(document.body, { childList: true, subtree: true });
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
  watchReleaseUi();
  await import(`./v2/entry.js?release=${encodeURIComponent(RELEASE)}&t=${Date.now()}`);
}

start().catch(error => {
  console.error(error);
  document.body.textContent = "読み込み中にエラーが発生しました。ページを再読み込みしてください。";
});
