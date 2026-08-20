import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?settings-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const COMPLETION_NOW = new Date("2026-08-20T11:30:10.000Z");

const PAIRS = [
  ["clockSize", "clockSizeRange", "clockSize", 82],
  ["dateSize", "dateSizeRange", "dateSize", 21],
  ["timerSize", "timerSizeRange", "timerSize", 164],
  ["completionTextSize", "completionTextSizeRange", "completionTextSize", 142],
  ["targetSize", "targetSizeRange", "targetSize", 44],
  ["subSize", "subSizeRange", "subSize", 31],
  ["timerTextSize", "timerTextSizeRange", "timerTextSize", 38],
  ["wroTitleSize", "wroTitleSizeRange", "wroTitleSize", 51],
  ["wroDateSuffixSize", "wroDateSuffixSizeRange", "wroDateSuffixSize", 29],
  ["noiseStrength", "noiseRange", "noiseStrength", 57],
  ["volume", "volumeRange", "volume", 63],
  ["backgroundStrength", "backgroundStrengthRange", "backgroundStrength", 41]
];

const NUMBERS = [
  ["completionMessageIntervalSec", "completionMessageIntervalSec", 13],
  ["completionDurationMin", "completionDurationMin", 42],
  ["autoWroIntervalMin", "autoWroInterval", 7],
  ["autoWroDurationMin", "autoWroDuration", 1.7],
  ["clockOffsetX", "clockOffsetX", 24],
  ["clockOffsetY", "clockOffsetY", -18],
  ["timerOffsetX", "timerOffsetX", 31],
  ["timerOffsetY", "timerOffsetY", 12],
  ["wroOffsetX", "wroOffsetX", -27],
  ["wroOffsetY", "wroOffsetY", 16],
  ["noiseIntervalMin", "noiseInterval", 4.5],
  ["lineGap", "lineGap", 170]
];

const TEXTS = [
  ["currentTimeLabel", "currentTimeLabelInput", "会場現在時刻"],
  ["timerText", "timerTextInput", "競技終了まで {残り時間}"],
  ["wroDateSuffix", "wroDateSuffixInput", "開幕まであと少し"]
];

const browser = await chromium.launch({ headless: true });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function stored(page) {
  return page.evaluate(key =>
    JSON.parse(localStorage.getItem(key) || "{}"), SETTINGS_KEY);
}

async function waitStored(page, key, expected) {
  await page.waitForFunction(({ storageKey, settingKey, expectedValue }) => {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return saved[settingKey] === expectedValue;
  }, {
    storageKey: SETTINGS_KEY,
    settingKey: key,
    expectedValue: expected
  }, { timeout: 15_000 });
}

async function setRange(page, key, rangeId, numberId, value) {
  await page.evaluate(({ id, next }) => {
    const input = document.getElementById(id);
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, { id: rangeId, next: value });
  await waitStored(page, key, value);

  const values = await page.evaluate(({ rangeId: range, numberId: number }) => ({
    range: Number(document.getElementById(range).value),
    number: Number(document.getElementById(number).value)
  }), { rangeId, numberId });
  expect(values.range === value && values.number === value,
    `${key}: range/number are ${values.range}/${values.number}, expected ${value}`);
}

async function setNumber(page, key, id, value, expected = value) {
  await page.evaluate(({ inputId, next }) => {
    const input = document.getElementById(inputId);
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { inputId: id, next: value });
  await waitStored(page, key, expected);

  const rendered = await page.evaluate(inputId =>
    Number(document.getElementById(inputId).value), id);
  expect(rendered === expected,
    `${key}: rendered value is ${rendered}, expected ${expected}`);
}

async function setText(page, key, id, value) {
  await page.evaluate(({ inputId, next }) => {
    const input = document.getElementById(inputId);
    input.value = next;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, { inputId: id, next: value });
  await waitStored(page, key, value);
}

async function setCheckbox(page, id, checked) {
  await page.evaluate(({ inputId, next }) => {
    const input = document.getElementById(inputId);
    input.checked = next;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { inputId: id, next: checked });
}

async function openAdvanced(page) {
  await page.click("#gear");
  await page.waitForFunction(() =>
    document.getElementById("overlay")?.classList.contains("open"));
  const advanced = page.locator("#advancedSettingsAccordion");
  if (!(await advanced.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open);
}

const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  colorScheme: "dark",
  reducedMotion: "reduce"
});
const page = await context.newPage();

page.on("pageerror", error => failures.push(`pageerror: ${error.message}`));
page.on("console", message => {
  if (message.type() === "error") failures.push(`console: ${message.text()}`);
});

await page.clock.install({ time: COMPLETION_NOW });
await page.addInitScript(key => localStorage.removeItem(key), SETTINGS_KEY);

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(() => {
    const app = document.getElementById("app");
    return app?.dataset.timerPhase === "completion" &&
      app.dataset.completionFit === "fitted";
  }, { timeout: 15_000 });

  await openAdvanced(page);

  const initialUi = await page.evaluate(() => ({
    saveStatus: document.getElementById("settingsSaveStatus")?.textContent || "",
    metricCount: document.querySelectorAll("[data-size-metric]").length,
    invalidCount: document.querySelectorAll('[aria-invalid="true"]').length,
    intervalKey: document.getElementById("completionMessageIntervalSec")
      ?.dataset.settingKey || "",
    firstMessageKey: document.getElementById("completionTextInput")
      ?.dataset.settingKey || "",
    autoSizeDescription: document.getElementById("autoSize")
      ?.closest(".switch")
      ?.querySelector(".switchCopy small")?.textContent || ""
  }));
  expect(initialUi.saveStatus.includes("保存済み"),
    `initial save status is ${initialUi.saveStatus}`);
  expect(initialUi.metricCount === 9,
    `size metric count is ${initialUi.metricCount}`);
  expect(initialUi.invalidCount === 0,
    `initial invalid control count is ${initialUi.invalidCount}`);
  expect(initialUi.intervalKey === "completionMessageIntervalSec",
    `completion interval setting key is ${initialUi.intervalKey}`);
  expect(initialUi.firstMessageKey === "",
    `sequence textarea has duplicate generic setting handler ${initialUi.firstMessageKey}`);
  expect(initialUi.autoSizeDescription.includes("はみ出す場合だけ"),
    "auto-size behavior is not explained clearly");

  for (const [key, rangeId, numberId, value] of PAIRS) {
    await setRange(page, key, rangeId, numberId, value);
  }
  for (const [key, id, value] of NUMBERS) {
    await setNumber(page, key, id, value);
  }
  for (const [key, id, value] of TEXTS) {
    await setText(page, key, id, value);
  }

  await setNumber(
    page,
    "completionTextSize",
    "completionTextSize",
    999,
    320
  );
  await setNumber(
    page,
    "completionMessageIntervalSec",
    "completionMessageIntervalSec",
    9999,
    600
  );
  await setNumber(page, "noiseIntervalMin", "noiseInterval", -5, 0);
  await setNumber(page, "autoWroDurationMin", "autoWroDuration", 99, 60);

  const beforeEmpty = (await stored(page)).completionDurationMin;
  await page.evaluate(() => {
    const input = document.getElementById("completionDurationMin");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const recovered = await page.evaluate(() => ({
    value: Number(document.getElementById("completionDurationMin").value),
    invalid: document.getElementById("completionDurationMin")
      .getAttribute("aria-invalid")
  }));
  expect(recovered.value === beforeEmpty,
    `empty number recovered as ${recovered.value}, expected ${beforeEmpty}`);
  expect(recovered.invalid === "false",
    `recovered number remains invalid: ${recovered.invalid}`);

  await setCheckbox(page, "autoWroEnabled", false);
  await page.waitForFunction(() =>
    document.getElementById("autoWroInterval")?.disabled === true);
  const disabled = await page.evaluate(() => ({
    during: document.getElementById("autoWroDuringCompletion").disabled,
    interval: document.getElementById("autoWroInterval").disabled,
    duration: document.getElementById("autoWroDuration").disabled
  }));
  expect(disabled.during && disabled.interval && disabled.duration,
    `automatic WRO dependencies are ${JSON.stringify(disabled)}`);
  await setCheckbox(page, "autoWroEnabled", true);

  await page.waitForTimeout(300);
  const metrics = await page.evaluate(() => ({
    clock: document.querySelector('[data-size-metric="clockSize"]')?.textContent || "",
    completion: document.querySelector('[data-size-metric="completionTextSize"]')?.textContent || "",
    timer: document.querySelector('[data-size-metric="timerSize"]')?.textContent || ""
  }));
  expect(metrics.clock.includes("実表示"), `clock metric is ${metrics.clock}`);
  expect(metrics.completion.includes("実表示"),
    `completion metric is ${metrics.completion}`);
  expect(metrics.timer.includes("現在は非表示"),
    `hidden timer metric is ${metrics.timer}`);

  await setRange(
    page,
    "completionTextSize",
    "completionTextSizeRange",
    "completionTextSize",
    36
  );
  const smallFont = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.getElementById("mainValue")).fontSize));
  await setRange(
    page,
    "completionTextSize",
    "completionTextSizeRange",
    "completionTextSize",
    180
  );
  await page.waitForTimeout(220);
  const largeFont = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.getElementById("mainValue")).fontSize));
  expect(largeFont > smallFont + 8,
    `completion text did not grow: ${smallFont} -> ${largeFont}`);

  await page.evaluate(() => {
    const target = document.getElementById("targetTime");
    target.value = "18:45";
    target.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await waitStored(page, "targetTime", "18:45");
  await page.evaluate(() => document.getElementById("reset").click());
  const afterFirstResetClick = await stored(page);
  const resetState = await page.evaluate(() => ({
    text: document.getElementById("reset").textContent,
    confirming: document.getElementById("reset").classList.contains("confirming")
  }));
  expect(afterFirstResetClick.targetTime === "18:45",
    "first reset click changed settings");
  expect(resetState.confirming && resetState.text.includes("もう一度"),
    `reset confirmation state is ${JSON.stringify(resetState)}`);

  await page.evaluate(() => document.getElementById("reset").click());
  await waitStored(page, "targetTime", "20:30");
  const resetSaved = await stored(page);
  expect(
    resetSaved.clockSize === 64 &&
    resetSaved.completionTextSize === 96 &&
    resetSaved.completionMessageIntervalSec === 10,
    `reset did not restore defaults: ` +
    `${resetSaved.clockSize}/${resetSaved.completionTextSize}/` +
    `${resetSaved.completionMessageIntervalSec}`
  );

  const finalStatus = await page.evaluate(() =>
    document.getElementById("settingsSaveStatus")?.textContent || "");
  expect(finalStatus.includes("初期設定に戻しました"),
    `final save status is ${finalStatus}`);
} catch (error) {
  failures.push(error.stack || error.message);
}

await context.close();

const phoneContext = await browser.newContext({
  viewport: { width: 320, height: 568 },
  colorScheme: "dark",
  reducedMotion: "reduce"
});
const phonePage = await phoneContext.newPage();
try {
  await phonePage.goto(`${BASE_URL}&phone=1`, {
    waitUntil: "networkidle",
    timeout: 45_000
  });
  await phonePage.waitForFunction(() => {
    const value = document.getElementById("mainValue")?.textContent || "";
    return value && !value.includes("--");
  }, { timeout: 15_000 });
  await phonePage.click("#gear");
  const panel = await phonePage.evaluate(() => {
    const element = document.querySelector(".panel");
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      width: rect.width,
      scrollable: element.scrollHeight > element.clientHeight
    };
  });
  expect(panel.left >= -2 && panel.right <= 322,
    `phone settings panel is outside viewport: ${JSON.stringify(panel)}`);
} catch (error) {
  failures.push(`phone: ${error.stack || error.message}`);
}
await phoneContext.close();
await browser.close();

if (failures.length) {
  console.error("WRO comprehensive settings audit failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `WRO comprehensive settings audit passed ${PAIRS.length} paired controls, ` +
  `${NUMBERS.length} numeric controls, ${TEXTS.length} text controls, ` +
  "validation, dependencies, live metrics, safe reset, and phone layout."
);
