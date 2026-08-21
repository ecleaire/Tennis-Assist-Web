import {
  TEXT_AUTO_SIZE_ITEMS,
  textAutoSizeMasterPatch,
  textAutoSizeMasterState
} from "./text-auto-size-values.js?v=20260821e";

const $ = id => document.getElementById(id);

function toggleMarkup(item) {
  return `
<div class="perTextAutoSize" data-auto-size-setting="${item.key}">
  <div class="perTextAutoSizeCopy">
    <b>自動調整</b>
    <small>オン：画面に合わせて拡大・縮小／オフ：入力したpxを優先</small>
  </div>
  <label class="toggle perTextAutoSizeToggle">
    <input id="${item.inputId}" type="checkbox" aria-label="${item.label}の自動サイズ調整">
    <span></span>
  </label>
</div>`;
}

function updateMetric(item, settings, enabled) {
  const metric = document.querySelector(
    `[data-size-metric="${item.sizeKey}"]`
  );
  if (!metric) return;

  let text = metric.textContent
    .replace(/^(基準|設定)/, enabled ? "基準" : "設定")
    .replace(/・画面内に収めるため安全縮小$/, "");

  if (!enabled) {
    const actualMatch = text.match(/実表示\s*([0-9.]+)px/);
    const configured = Number(settings[item.sizeKey]);
    const actual = Number(actualMatch?.[1]);
    if (
      Number.isFinite(configured) &&
      Number.isFinite(actual) &&
      actual < configured - 0.75
    ) {
      text += "・画面内に収めるため安全縮小";
    }
  }

  metric.textContent = text;
}

export function installTextAutoSizeSettings() {
  for (const item of TEXT_AUTO_SIZE_ITEMS) {
    if ($(item.inputId)) continue;
    const sizeInput = $(item.sizeKey);
    const card = sizeInput?.closest(".sizeControl");
    if (!card) continue;
    card.insertAdjacentHTML("beforeend", toggleMarkup(item));
  }

  const master = $("autoSize");
  const copy = master?.closest(".switch")?.querySelector(".switchCopy");
  if (copy) {
    const title = copy.querySelector("b");
    const description = copy.querySelector("small");
    if (title) title.textContent = "文字サイズの自動調整（全項目）";
    if (description) {
      description.id = "autoSizeMasterDescription";
      description.textContent =
        "全項目を一括で切り替えます。オフの項目は入力したpxを優先し、はみ出す場合だけ安全に縮小します。";
    }
  }
}

export function createTextAutoSizeController({
  getSettings,
  setSettings
}) {
  const master = $("autoSize");
  const inputs = TEXT_AUTO_SIZE_ITEMS
    .map(item => ({ ...item, input: $(item.inputId) }))
    .filter(item => item.input);
  const description = $("autoSizeMasterDescription");
  let renderFrame = 0;

  master.onchange = () => {
    setSettings(textAutoSizeMasterPatch(master.checked), { quiet: true });
  };

  for (const item of inputs) {
    item.input.onchange = () => {
      setSettings({ [item.key]: item.input.checked }, { quiet: true });
    };
  }

  function render() {
    renderFrame = 0;
    const settings = getSettings();
    for (const item of inputs) {
      const enabled = Boolean(settings[item.key]);
      item.input.checked = enabled;
      item.input.closest(".sizeControl")
        ?.classList.toggle("manualTextSize", !enabled);
      updateMetric(item, settings, enabled);
    }

    const state = textAutoSizeMasterState(settings);
    master.checked = state.all;
    master.indeterminate = state.partial;
    master.setAttribute(
      "aria-checked",
      state.partial ? "mixed" : String(state.all)
    );

    if (description) {
      description.textContent = state.all
        ? `全${state.total}項目で自動調整がオンです。個別にオフにした項目は、入力したpxを優先し、はみ出す場合だけ安全に縮小します。`
        : state.none
          ? `全${state.total}項目で自動調整がオフです。入力したpxを優先し、はみ出す場合だけ安全に縮小します。`
          : `${state.enabled}/${state.total}項目で自動調整がオンです。オフの項目は入力したpxを優先し、はみ出す場合だけ安全に縮小します。`;
    }
  }

  function requestRender() {
    if (renderFrame) return;
    renderFrame = requestAnimationFrame(render);
  }

  // The generic settings audit refreshes actual-size metrics after layout
  // fitting. Queue this controller afterward so each metric keeps the correct
  // per-item auto/manual label instead of falling back to the old global flag.
  $("app")?.addEventListener("wro:layout-updated", requestRender);
  $("overlay")?.addEventListener("transitionend", requestRender);

  return { render, requestRender };
}
