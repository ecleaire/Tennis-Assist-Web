import { DEFAULTS } from "./config.js?v=20260821a";

const $ = id => document.getElementById(id);

const PAIRS = [
  { key: "clockSize", rangeId: "clockSizeRange", numberId: "clockSize", metric: "clock" },
  { key: "dateSize", rangeId: "dateSizeRange", numberId: "dateSize", metric: "date" },
  { key: "timerSize", rangeId: "timerSizeRange", numberId: "timerSize", metric: "timer" },
  {
    key: "completionTextSize",
    rangeId: "completionTextSizeRange",
    numberId: "completionTextSize",
    metric: "completion"
  },
  { key: "targetSize", rangeId: "targetSizeRange", numberId: "targetSize", metric: "target" },
  { key: "subSize", rangeId: "subSizeRange", numberId: "subSize", metric: "sub" },
  {
    key: "timerTextSize",
    rangeId: "timerTextSizeRange",
    numberId: "timerTextSize",
    metric: "timerText"
  },
  {
    key: "wroTitleSize",
    rangeId: "wroTitleSizeRange",
    numberId: "wroTitleSize",
    metric: "wroTitle"
  },
  {
    key: "wroDateSuffixSize",
    rangeId: "wroDateSuffixSizeRange",
    numberId: "wroDateSuffixSize",
    metric: "wroSuffix"
  },
  {
    key: "noiseStrength",
    rangeId: "noiseRange",
    numberId: "noiseStrength",
    preview: "noise"
  },
  {
    key: "volume",
    rangeId: "volumeRange",
    numberId: "volume",
    preview: "volume"
  },
  {
    key: "backgroundStrength",
    rangeId: "backgroundStrengthRange",
    numberId: "backgroundStrength"
  }
];

const NUMBERS = [
  { key: "completionDurationMin", id: "completionDurationMin" },
  { key: "autoWroIntervalMin", id: "autoWroInterval" },
  { key: "autoWroDurationMin", id: "autoWroDuration" },
  { key: "clockOffsetX", id: "clockOffsetX" },
  { key: "clockOffsetY", id: "clockOffsetY" },
  { key: "timerOffsetX", id: "timerOffsetX" },
  { key: "timerOffsetY", id: "timerOffsetY" },
  { key: "wroOffsetX", id: "wroOffsetX" },
  { key: "wroOffsetY", id: "wroOffsetY" },
  { key: "noiseIntervalMin", id: "noiseInterval" },
  { key: "lineGap", id: "lineGap", preview: "noise" }
];

const TEXTS = [
  { key: "timerText", id: "timerTextInput", delay: 140 },
  { key: "currentTimeLabel", id: "currentTimeLabelInput", delay: 140 },
  { key: "completionText", id: "completionTextInput", delay: 140 },
  { key: "wroDateSuffix", id: "wroDateSuffixInput", delay: 140 }
];

const SIZE_METRIC_LABELS = {
  clockSize: "現在時刻",
  dateSize: "日付",
  timerSize: "タイマー",
  completionTextSize: "終了後テキスト",
  targetSize: "目標時刻",
  subSize: "補足表示",
  timerTextSize: "追加文字",
  wroTitleSize: "全国大会タイトル",
  wroDateSuffixSize: "全国大会追加文字"
};

function decimalPlaces(value) {
  const text = String(value);
  return text.includes(".") ? text.split(".")[1].length : 0;
}

function inputRules(input) {
  const minimum = Number(input.min);
  const maximum = Number(input.max);
  const step = Number(input.step || 1);
  return {
    minimum: Number.isFinite(minimum) ? minimum : -Infinity,
    maximum: Number.isFinite(maximum) ? maximum : Infinity,
    step: Number.isFinite(step) && step > 0 ? step : 1
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizeNumber(input, raw) {
  const { minimum, maximum, step } = inputRules(input);
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;

  const bounded = clamp(numeric, minimum, maximum);
  const base = Number.isFinite(minimum) ? minimum : 0;
  const stepped = base + Math.round((bounded - base) / step) * step;
  const precision = Math.max(
    decimalPlaces(step),
    decimalPlaces(minimum),
    decimalPlaces(maximum)
  );
  return Number(clamp(stepped, minimum, maximum).toFixed(precision));
}

function validNumber(input) {
  if (input.value === "") return null;
  const value = Number(input.value);
  if (!Number.isFinite(value)) return null;
  const { minimum, maximum } = inputRules(input);
  return value >= minimum && value <= maximum ? value : null;
}

function displayNumber(input, value) {
  const { step } = inputRules(input);
  const precision = decimalPlaces(step);
  return precision ? Number(value).toFixed(precision) : String(Math.round(value));
}

function setInvalid(input, invalid, message = "") {
  const field = input.closest(".field, .sizeControl");
  input.setAttribute("aria-invalid", invalid ? "true" : "false");
  field?.classList.toggle("settingsInvalid", invalid);

  let error = field?.querySelector(":scope > .settingsInputError");
  if (invalid && field) {
    if (!error) {
      error = document.createElement("small");
      error.className = "settingsInputError";
      field.append(error);
    }
    error.textContent = message;
  } else {
    error?.remove();
  }
}

function validationMessage(input) {
  const { minimum, maximum, step } = inputRules(input);
  const range = Number.isFinite(minimum) && Number.isFinite(maximum)
    ? `${minimum}～${maximum}`
    : "有効な数値";
  return `${range}の範囲で入力してください（刻み ${step}）。`;
}

function visible(element) {
  if (!element || element.hidden) return false;
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.display !== "none" &&
    style.visibility !== "hidden" &&
    Number(style.opacity || 1) > 0 &&
    rect.width > 0 && rect.height > 0;
}

function roundedFontSize(element) {
  if (!visible(element)) return null;
  const value = Number.parseFloat(getComputedStyle(element).fontSize);
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : null;
}

function actualSize(refs, metric) {
  const timerDisplay = refs.app.dataset.activeDisplay === "timer";
  const wroDisplay = refs.app.dataset.activeDisplay === "wro";
  const phase = refs.app.dataset.timerPhase;

  switch (metric) {
    case "clock": return roundedFontSize(refs.clock);
    case "date": return roundedFontSize(refs.date);
    case "timer":
      return timerDisplay && phase === "countdown"
        ? roundedFontSize(refs.mainValue)
        : null;
    case "completion":
      return timerDisplay && phase === "completion"
        ? roundedFontSize(refs.mainValue)
        : null;
    case "target": return roundedFontSize(refs.targetLabel);
    case "sub": return roundedFontSize(refs.subValue);
    case "timerText": return roundedFontSize(refs.timerText);
    case "wroTitle":
      return wroDisplay ? roundedFontSize(refs.modeLabel) : null;
    case "wroSuffix":
      return wroDisplay ? roundedFontSize(refs.wroSuffix) : null;
    default: return null;
  }
}

function timeLabel() {
  return new Intl.DateTimeFormat("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(new Date());
}

export function createSettingsControlAudit({
  refs,
  getSettings,
  setSettings,
  audio,
  noise,
  reset
}) {
  const pairControls = PAIRS.map(definition => ({
    ...definition,
    range: $(definition.rangeId),
    number: $(definition.numberId)
  })).filter(control => control.range && control.number);

  const numberControls = NUMBERS.map(definition => ({
    ...definition,
    input: $(definition.id)
  })).filter(control => control.input);

  const textControls = TEXTS.map(definition => ({
    ...definition,
    input: $(definition.id)
  })).filter(control => control.input);

  const saveStatus = document.querySelector(".settingsAutoSave");
  if (saveStatus) saveStatus.id = "settingsSaveStatus";

  let pendingPatch = {};
  let pendingFrame = 0;
  let metricFrame = 0;
  const textTimers = new Map();
  let resetTimer = 0;
  const resetButton = $("reset");
  const resetDefaultText = resetButton?.textContent || "初期設定に戻す";

  function setSaveState(state, text) {
    if (!saveStatus) return;
    saveStatus.dataset.state = state;
    saveStatus.textContent = text;
  }

  function markSaving() {
    setSaveState("saving", "反映中…");
  }

  function markSaved(message = "保存済み") {
    setSaveState("saved", `${message} ${timeLabel()}`);
  }

  function afterPreview(preview, commit = false) {
    if (preview === "volume") {
      const volume = Number(getSettings().volume);
      audio.setVolume(volume);
    }
    if (preview === "noise" && commit) noise.preview();
  }

  function flushPatch() {
    if (pendingFrame) {
      cancelAnimationFrame(pendingFrame);
      pendingFrame = 0;
    }
    const patch = pendingPatch;
    pendingPatch = {};
    if (!Object.keys(patch).length) return;
    setSettings(patch, { quiet: true });
  }

  function schedulePatch(key, value, preview) {
    pendingPatch[key] = value;
    markSaving();
    if (preview === "volume") audio.setVolume(value);
    if (pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = 0;
      const patch = pendingPatch;
      pendingPatch = {};
      if (!Object.keys(patch).length) return;
      setSettings(patch, { quiet: true });
    });
  }

  function commitPair(control, raw, { preview = false } = {}) {
    const next = normalizeNumber(control.number, raw);
    if (next === null) return false;
    const text = displayNumber(control.number, next);
    control.range.value = text;
    control.number.value = text;
    setInvalid(control.number, false);
    pendingPatch[control.key] = next;
    flushPatch();
    afterPreview(control.preview, preview);
    return true;
  }

  function bindPair(control) {
    const { range, number } = control;
    range.dataset.settingKey = control.key;
    number.dataset.settingKey = control.key;
    number.inputMode = number.step && Number(number.step) < 1
      ? "decimal"
      : "numeric";

    range.oninput = () => {
      const next = normalizeNumber(number, range.value);
      if (next === null) return;
      const text = displayNumber(number, next);
      number.value = text;
      setInvalid(number, false);
      schedulePatch(control.key, next, control.preview);
    };

    range.onchange = () => {
      commitPair(control, range.value, { preview: true });
    };

    number.oninput = () => {
      const next = validNumber(number);
      if (next === null) {
        setInvalid(
          number,
          number.value !== "",
          validationMessage(number)
        );
        return;
      }
      setInvalid(number, false);
      range.value = displayNumber(number, next);
      schedulePatch(control.key, next, control.preview);
    };

    number.onchange = () => {
      const fallback = getSettings()[control.key] ?? DEFAULTS[control.key];
      commitPair(
        control,
        number.value === "" ? fallback : number.value,
        { preview: true }
      );
    };

    number.onkeydown = event => {
      if (event.key === "Enter") {
        event.preventDefault();
        number.blur();
      }
    };

    number.addEventListener("wheel", event => {
      if (document.activeElement === number) event.preventDefault();
    }, { passive: false });
  }

  function commitNumber(control, raw, { preview = false } = {}) {
    const next = normalizeNumber(control.input, raw);
    if (next === null) return false;
    control.input.value = displayNumber(control.input, next);
    setInvalid(control.input, false);
    pendingPatch[control.key] = next;
    flushPatch();
    afterPreview(control.preview, preview);
    return true;
  }

  function bindNumber(control) {
    const { input } = control;
    input.dataset.settingKey = control.key;
    input.inputMode = input.step && Number(input.step) < 1
      ? "decimal"
      : "numeric";

    input.oninput = () => {
      const next = validNumber(input);
      if (next === null) {
        setInvalid(
          input,
          input.value !== "",
          validationMessage(input)
        );
        return;
      }
      setInvalid(input, false);
      schedulePatch(control.key, next, control.preview);
    };

    input.onchange = () => {
      const fallback = getSettings()[control.key] ?? DEFAULTS[control.key];
      commitNumber(
        control,
        input.value === "" ? fallback : input.value,
        { preview: true }
      );
    };

    input.onkeydown = event => {
      if (event.key === "Enter") {
        event.preventDefault();
        input.blur();
      }
    };

    input.addEventListener("wheel", event => {
      if (document.activeElement === input) event.preventDefault();
    }, { passive: false });
  }

  function commitText(control) {
    window.clearTimeout(textTimers.get(control.input));
    textTimers.delete(control.input);
    setSettings(
      { [control.key]: control.input.value },
      { quiet: true }
    );
  }

  function bindText(control) {
    control.input.dataset.settingKey = control.key;
    control.input.oninput = () => {
      markSaving();
      window.clearTimeout(textTimers.get(control.input));
      textTimers.set(
        control.input,
        window.setTimeout(() => commitText(control), control.delay)
      );
    };
    control.input.onchange = () => commitText(control);
    control.input.onblur = () => {
      if (textTimers.has(control.input)) commitText(control);
    };
  }

  function installMetrics() {
    for (const control of pairControls.filter(item => item.metric)) {
      const field = control.number.closest(".sizeControl");
      if (!field || field.querySelector(`[data-size-metric="${control.key}"]`)) {
        continue;
      }
      field.dataset.settingKey = control.key;
      const metric = document.createElement("small");
      metric.className = "settingSizeMetric";
      metric.dataset.sizeMetric = control.key;
      metric.setAttribute("aria-live", "polite");
      field.append(metric);
    }

    const autoDescription = $("autoSize")
      ?.closest(".switch")
      ?.querySelector(".switchCopy small");
    if (autoDescription) {
      autoDescription.textContent =
        "オンでは設定値を基準に画面へ合わせて拡大・縮小します。オフでは設定値を優先し、はみ出す場合だけ安全に縮小します。";
    }

    const sizeHelp = $("clockSize")
      ?.closest(".sizeControls")
      ?.nextElementSibling;
    if (sizeHelp?.classList.contains("help")) {
      sizeHelp.textContent =
        "各項目の「実表示」は現在の画面で最終的に使われているサイズです。非表示の項目は、該当モードへ切り替えると確認できます。";
    }
  }

  function updateMetrics() {
    metricFrame = 0;
    const settings = getSettings();
    for (const control of pairControls.filter(item => item.metric)) {
      const metric = document.querySelector(
        `[data-size-metric="${control.key}"]`
      );
      if (!metric) continue;
      const configured = settings[control.key];
      const actual = actualSize(refs, control.metric);
      const prefix = settings.autoSize ? "基準" : "設定";
      const defaultValue = DEFAULTS[control.key];
      metric.textContent = actual === null
        ? `${prefix} ${configured}px・現在は非表示・初期値 ${defaultValue}px`
        : `${prefix} ${configured}px・実表示 ${actual}px・初期値 ${defaultValue}px`;
      metric.title = `${SIZE_METRIC_LABELS[control.key]}の設定値と実表示サイズ`;
    }
  }

  function requestMetricUpdate() {
    if (!refs.overlay.classList.contains("open")) return;
    if (metricFrame) return;
    metricFrame = requestAnimationFrame(updateMetrics);
  }

  function updateDependencies() {
    const settings = getSettings();
    for (const id of [
      "autoWroDuringCompletion",
      "autoWroInterval",
      "autoWroDuration"
    ]) {
      const input = $(id);
      if (input) input.disabled = !settings.autoWroEnabled;
    }

    const autoWro = $("autoWroSettings");
    autoWro?.classList.toggle("disabled", !settings.autoWroEnabled);
  }

  function render() {
    const settings = getSettings();

    for (const control of pairControls) {
      if (document.activeElement !== control.range) {
        control.range.value = displayNumber(
          control.number,
          settings[control.key]
        );
      }
      if (document.activeElement !== control.number) {
        control.number.value = displayNumber(
          control.number,
          settings[control.key]
        );
        setInvalid(control.number, false);
      }
    }

    for (const control of numberControls) {
      if (document.activeElement !== control.input) {
        control.input.value = displayNumber(
          control.input,
          settings[control.key]
        );
        setInvalid(control.input, false);
      }
    }

    for (const control of textControls) {
      if (document.activeElement !== control.input) {
        control.input.value = settings[control.key] ?? "";
      }
    }

    updateDependencies();
    requestMetricUpdate();
  }

  function cancelResetConfirmation() {
    window.clearTimeout(resetTimer);
    resetTimer = 0;
    if (!resetButton) return;
    resetButton.classList.remove("confirming");
    resetButton.textContent = resetDefaultText;
    resetButton.setAttribute("aria-label", resetDefaultText);
  }

  function bindResetConfirmation() {
    if (!resetButton) return;
    resetButton.onclick = () => {
      if (!resetButton.classList.contains("confirming")) {
        resetButton.classList.add("confirming");
        resetButton.textContent = "もう一度押すと初期化";
        resetButton.setAttribute(
          "aria-label",
          "もう一度押すと、すべての設定を初期化します"
        );
        setSaveState("warning", "初期化の確認中");
        resetTimer = window.setTimeout(() => {
          cancelResetConfirmation();
          markSaved();
        }, 4500);
        return;
      }

      cancelResetConfirmation();
      reset();
      markSaved("初期設定に戻しました");
    };
  }

  pairControls.forEach(bindPair);
  numberControls.forEach(bindNumber);
  textControls.forEach(bindText);
  installMetrics();
  bindResetConfirmation();

  refs.app.addEventListener("wro:layout-updated", requestMetricUpdate);
  refs.overlay.addEventListener("transitionend", requestMetricUpdate);

  markSaved();

  return {
    render,
    markSaving,
    markSaved,
    requestMetricUpdate,
    cancelResetConfirmation
  };
}
