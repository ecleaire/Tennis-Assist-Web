import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?clickable-size-controls-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const AUTO_IDS = [
  "autoSizeClock",
  "autoSizeDate",
  "autoSizeTimer",
  "autoSizeCompletionText",
  "autoSizeTarget",
  "autoSizeSub",
  "autoSizeTimerText",
  "autoSizeWroTitle",
  "autoSizeWroDateSuffix"
];

const browser = await chromium.launch({ headless: true });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function openAdvanced(page) {
  await page.click("#gear");
  await page.waitForFunction(() =>
    document.getElementById("overlay")?.classList.contains("open"));
  const details = page.locator("#advancedSettingsAccordion");
  if (!(await details.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open);
}

async function waitSaved(page, key, value) {
  await page.waitForFunction(({ storageKey, settingKey, expected }) => {
    const settings = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return settings[settingKey] === expected;
  }, {
    storageKey: SETTINGS_KEY,
    settingKey: key,
    expected: value
  }, { timeout: 15_000 });
}

async function timerFont(page) {
  return page.evaluate(() =>
    Number.parseFloat(
      getComputedStyle(document.getElementById("mainValue")).fontSize
    ));
}

const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  colorScheme: "dark",
  reducedMotion: "reduce"
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => {
  if (message.type() === "error") errors.push(message.text());
});

await page.clock.install({ time: new Date("2026-08-20T10:00:00.000Z") });
await page.addInitScript(key => {
  localStorage.setItem(key, JSON.stringify({
    mode: "timer",
    targetTime: "20:30",
    showTarget: true,
    showHourMinute: true,
    showCurrentTime: true,
    autoSize: true,
    clockSize: 64,
    dateSize: 16,
    timerSize: 116,
    completionTextSize: 96,
    targetSize: 32,
    subSize: 23,
    timerTextSize: 26,
    clockPosition: "top-right",
    timerPosition: "center",
    autoWroEnabled: false,
    noiseStrength: 0,
    noiseIntervalMin: 0,
    alarmEnabled: false,
    backgroundStyle: "solid",
    backgroundStrength: 0,
    backgroundGuides: false,
    backgroundScanlines: false
  }));
}, SETTINGS_KEY);

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(() =>
    document.getElementById("app")?.dataset.timerPhase === "countdown",
    { timeout: 15_000 });
  await openAdvanced(page);

  const structure = await page.evaluate(ids => ({
    cards: [...document.querySelectorAll(".sizeControl")]
      .map(card => card.tagName),
    toggles: ids.filter(id => document.getElementById(id)).length,
    nestedLabels: document.querySelectorAll("label.sizeControl label").length,
    cardLabels: document.querySelectorAll("label.sizeControl").length
  }), AUTO_IDS);

  expect(structure.toggles === AUTO_IDS.length,
    `toggle count is ${structure.toggles}`);
  expect(structure.cardLabels === 0,
    `size cards still use label: ${JSON.stringify(structure.cards)}`);
  expect(structure.nestedLabels === 0,
    `nested form labels remain: ${structure.nestedLabels}`);
  expect(structure.cards.every(tag => tag === "DIV"),
    `size card tags are ${JSON.stringify(structure.cards)}`);

  // Use a genuine pointer click on the visible track. This is the interaction
  // that failed when the switch lived inside the old all-card label.
  await page.click('label[for="autoSizeTimer"]');
  await waitSaved(page, "autoSizeTimer", false);

  const afterOff = await page.evaluate(() => ({
    checked: document.getElementById("autoSizeTimer").checked,
    masterChecked: document.getElementById("autoSize").checked,
    masterMixed: document.getElementById("autoSize").indeterminate,
    cardManual: document.getElementById("timerSize")
      .closest(".sizeControl").classList.contains("manualTextSize")
  }));
  expect(!afterOff.checked && !afterOff.masterChecked && afterOff.masterMixed,
    `pointer-off state is ${JSON.stringify(afterOff)}`);
  expect(afterOff.cardManual, "timer card is not marked as manual");

  await page.fill("#timerSize", "120");
  await page.press("#timerSize", "Enter");
  await waitSaved(page, "timerSize", 120);
  await page.waitForTimeout(220);
  const size120 = await timerFont(page);

  await page.fill("#timerSize", "220");
  await page.press("#timerSize", "Enter");
  await waitSaved(page, "timerSize", 220);
  await page.waitForTimeout(220);
  const size220 = await timerFont(page);

  expect(Math.abs(size120 - 120) <= 1.5,
    `120px input rendered as ${size120}px`);
  expect(size220 > size120 + 35,
    `220px input did not visibly grow: ${size120} -> ${size220}`);

  // One real click must turn it back on exactly once, not toggle twice.
  await page.click('label[for="autoSizeTimer"]');
  await waitSaved(page, "autoSizeTimer", true);
  expect(await page.isChecked("#autoSizeTimer"),
    "second pointer click did not enable timer auto-size");

  // Check the remaining real switch tracks once each. Every click must be
  // persisted and reflected in the actual checkbox state.
  for (const id of AUTO_IDS.filter(id => id !== "autoSizeTimer")) {
    await page.click(`label[for="${id}"]`);
    const key = id;
    await waitSaved(page, key, false);
    expect(!(await page.isChecked(`#${id}`)),
      `${id} did not turn off after pointer click`);
  }

  failures.push(...errors.map(error => `runtime: ${error}`));
} catch (error) {
  failures.push(error.stack || error.message);
}

await context.close();
await browser.close();

if (failures.length) {
  console.error("WRO clickable text-size controls check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO text-size controls passed real pointer clicks, independent toggles, direct timer growth, and valid non-nested form structure."
);
