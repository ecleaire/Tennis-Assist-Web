export const TEXT_AUTO_SIZE_ITEMS = [
  {
    kind: "clock",
    key: "autoSizeClock",
    sizeKey: "clockSize",
    inputId: "autoSizeClock",
    datasetKey: "autoSizeClock",
    label: "現在時刻"
  },
  {
    kind: "date",
    key: "autoSizeDate",
    sizeKey: "dateSize",
    inputId: "autoSizeDate",
    datasetKey: "autoSizeDate",
    label: "日付"
  },
  {
    kind: "timer",
    key: "autoSizeTimer",
    sizeKey: "timerSize",
    inputId: "autoSizeTimer",
    datasetKey: "autoSizeTimer",
    label: "タイマー"
  },
  {
    kind: "completionText",
    key: "autoSizeCompletionText",
    sizeKey: "completionTextSize",
    inputId: "autoSizeCompletionText",
    datasetKey: "autoSizeCompletion",
    label: "終了後テキスト"
  },
  {
    kind: "target",
    key: "autoSizeTarget",
    sizeKey: "targetSize",
    inputId: "autoSizeTarget",
    datasetKey: "autoSizeTarget",
    label: "目標時刻"
  },
  {
    kind: "sub",
    key: "autoSizeSub",
    sizeKey: "subSize",
    inputId: "autoSizeSub",
    datasetKey: "autoSizeSub",
    label: "補足表示"
  },
  {
    kind: "timerText",
    key: "autoSizeTimerText",
    sizeKey: "timerTextSize",
    inputId: "autoSizeTimerText",
    datasetKey: "autoSizeTimerText",
    label: "タイマー追加文字"
  },
  {
    kind: "wroTitle",
    key: "autoSizeWroTitle",
    sizeKey: "wroTitleSize",
    inputId: "autoSizeWroTitle",
    datasetKey: "autoSizeWroTitle",
    label: "全国大会タイトル"
  },
  {
    kind: "wroSuffix",
    key: "autoSizeWroDateSuffix",
    sizeKey: "wroDateSuffixSize",
    inputId: "autoSizeWroDateSuffix",
    datasetKey: "autoSizeWroSuffix",
    label: "全国大会追加文字"
  }
];

export const TEXT_AUTO_SIZE_KEYS = TEXT_AUTO_SIZE_ITEMS.map(item => item.key);

export const DEFAULT_TEXT_AUTO_SIZE = Object.fromEntries(
  TEXT_AUTO_SIZE_KEYS.map(key => [key, true])
);

const BY_KIND = new Map(
  TEXT_AUTO_SIZE_ITEMS.map(item => [item.kind, item])
);
const BY_SIZE_KEY = new Map(
  TEXT_AUTO_SIZE_ITEMS.map(item => [item.sizeKey, item])
);

export function textAutoSizeItem(kindOrSizeKey) {
  return BY_KIND.get(kindOrSizeKey) || BY_SIZE_KEY.get(kindOrSizeKey) || null;
}

export function isTextAutoSizeEnabled(settings, kindOrSizeKey) {
  const item = textAutoSizeItem(kindOrSizeKey);
  if (!item) return settings.autoSize !== false;
  if (typeof settings[item.key] === "boolean") return settings[item.key];
  return settings.autoSize !== false;
}

export function textAutoSizeMasterState(settings) {
  const values = TEXT_AUTO_SIZE_ITEMS.map(item =>
    isTextAutoSizeEnabled(settings, item.kind)
  );
  const enabled = values.filter(Boolean).length;
  return {
    enabled,
    total: values.length,
    all: enabled === values.length,
    none: enabled === 0,
    partial: enabled > 0 && enabled < values.length
  };
}

export function textAutoSizeMasterPatch(enabled) {
  return {
    autoSize: Boolean(enabled),
    ...Object.fromEntries(
      TEXT_AUTO_SIZE_KEYS.map(key => [key, Boolean(enabled)])
    )
  };
}

export function applyTextAutoSizeData(app, settings) {
  for (const item of TEXT_AUTO_SIZE_ITEMS) {
    app.dataset[item.datasetKey] = String(
      isTextAutoSizeEnabled(settings, item.kind)
    );
  }
}
