import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?per-text-auto-size-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const AUTO_KEYS = [
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

function baseSettings(overrides = {}) {
  return {
    mode: "timer",
    targetTime: "20:30",
    showTarget: true,
    showHourMinute: true,
    timerText: "",
    completionMessages: ["お疲れ様でした"],
    completionText: "お疲れ様でした",
    completionMessageIntervalSec: 10,
    completionDurationMin: 30,
    showCurrentTime: true,
    currentTimeLabel: "現在時刻",
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
    wroPosition: "center",
    autoWroEnabled: false,
    noiseStrength: 0,
    noiseIntervalMin: 0,
    alarmEnabled: false,
    backgroundStyle: "solid",
    backgroundStrength: 0,
    backgroundGuides: false,
    backgroundScanlines: false,
    ...overrides
  };
}

async function installSettings(page, value) {
  await page.addInitScript(({ key, settings }) => {
    if (!sessionStorage.getItem("per-text-auto-size-installed")) {
      localStorage.setItem(key, JSON.stringify(settings));
      sessionStorage.setItem("per-text-auto-size-installed", "1");
    }
  }, { key: SETTINGS_KEY, settings: value });
}

async function waitForDisplay(page, phase = "countdown") {
  await page.waitForFunction(expected => {
    const app = document.getElementById("app");
    const value = document.getElementById("mainValue")?.textContent || "";
    return app?.dataset.timerPhase === expected &&
      value && !value.includes("--");
  }, phase, { timeout: 15_000 });
  await page.waitForTimeout(250);
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

async function stored(page) {
  return page.evaluate(key =>
    JSON.parse(localStorage.getItem(key) || "{}"), SETTINGS_KEY);
}

async function waitStored(page, predicate, description) {
  try {
    await page.waitForFunction(({ key, source }) => {
      const settings = JSON.parse(localStorage.getItem(key) || "{}");
      return Function("settings", `return (${source});`)(settings);
    }, { key: SETTINGS_KEY, source: predicate }, { timeout: 15_000 });
  } catch (error) {
    failures.push(
      `${description}: ${JSON.stringify(await stored(page))} (${error.message})`
    );
  }
}

async function setCheckbox(page, id, checked) {
  await page.evaluate(({ inputId, next }) => {
    const input = document.getElementById(inputId);
    input.checked = next;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { inputId: id, next: checked });
}

async function setRange(page, id, value) {
  await page.evaluate(({ inputId, next }) => {
    const input = document.getElementById(inputId);
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { inputId: id, next: value });
}

async function fontSize(page, selector) {
  return page.evaluate(value =>
    Number.parseFloat(getComputedStyle(document.querySelector(value)).fontSize),
  selector);
}

// PC: verify all controls, partial master state, direct timer sizing and reload.
{
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.clock.install({ time: new Date("2026-08-20T10:00:00.000Z") });
  await installSettings(page, baseSettings());

  try {
    await page.goto(`${BASE_URL}&pc=1`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await waitForDisplay(page);
    await openAdvanced(page);

    const initial = await page.evaluate(keys => ({
      toggleCount: keys.filter(key => document.getElementById(key)).length,
      checkedCount: keys.filter(key => document.getElementById(key)?.checked).length,
      masterChecked: document.getElementById("autoSize").checked,
      masterIndeterminate: document.getElementById("autoSize").indeterminate,
      timerRangeMax: Number(document.getElementById("timerSizeRange").max),
      timerNumberMax: Number(document.getElementById("timerSize").max)
    }), AUTO_KEYS);
    expect(initial.toggleCount === AUTO_KEYS.length,
      `PC toggle count is ${initial.toggleCount}`);
    expect(initial.checkedCount === AUTO_KEYS.length,
      `PC checked count is ${initial.checkedCount}`);
    expect(initial.masterChecked && !initial.masterIndeterminate,
      `PC master initial state is ${JSON.stringify(initial)}`);
    expect(initial.timerRangeMax === 3000 && initial.timerNumberMax === 3000,
      `PC timer maximum is ${initial.timerRangeMax}/${initial.timerNumberMax}`);

    await setCheckbox(page, "autoSizeTimer", false);
    await waitStored(
      page,
      `settings.autoSizeTimer === false &&
       settings.autoSizeClock === true &&
       settings.autoSize === false`,
      "timer individual auto-size off"
    );

    const partial = await page.evaluate(() => ({
      checked: document.getElementById("autoSize").checked,
      indeterminate: document.getElementById("autoSize").indeterminate,
      timerCardManual: document.getElementById("timerSize")
        .closest(".sizeControl").classList.contains("manualTextSize")
    }));
    expect(!partial.checked && partial.indeterminate,
      `PC partial master state is ${JSON.stringify(partial)}`);
    expect(partial.timerCardManual,
      "PC timer size card is not marked manual");

    await setRange(page, "timerSizeRange", 120);
    await waitStored(page, "settings.timerSize === 120", "timer size 120");
    await page.waitForTimeout(250);
    const timer120 = await fontSize(page, "#mainValue");

    await setRange(page, "timerSizeRange", 220);
    await waitStored(page, "settings.timerSize === 220", "timer size 220");
    await page.waitForTimeout(250);
    const timer220 = await fontSize(page, "#mainValue");

    expect(Math.abs(timer120 - 120) <= 1.5,
      `manual timer 120px rendered as ${timer120}px`);
    expect(Math.abs(timer220 - 220) <= 1.5,
      `manual timer 220px rendered as ${timer220}px`);
    expect(timer220 > timer120 + 80,
      `manual timer did not visibly grow ${timer120} -> ${timer220}`);

    const timerMetric = await page.evaluate(() =>
      document.querySelector('[data-size-metric="timerSize"]')?.textContent || "");
    expect(timerMetric.startsWith("設定 220px"),
      `manual timer metric is ${timerMetric}`);

    await setCheckbox(page, "autoSizeTarget", false);
    await waitStored(
      page,
      "settings.autoSizeTarget === false",
      "target individual auto-size off"
    );

    await page.evaluate(() => document.getElementById("done").click());
    await page.reload({ waitUntil: "networkidle" });
    await waitForDisplay(page);
    await openAdvanced(page);

    const reloaded = await page.evaluate(() => ({
      timer: document.getElementById("autoSizeTimer").checked,
      target: document.getElementById("autoSizeTarget").checked,
      clock: document.getElementById("autoSizeClock").checked,
      masterIndeterminate: document.getElementById("autoSize").indeterminate,
      timerSize: Number(document.getElementById("timerSize").value),
      computedTimer: Number.parseFloat(
        getComputedStyle(document.getElementById("mainValue")).fontSize
      )
    }));
    expect(
      !reloaded.timer && !reloaded.target && reloaded.clock &&
      reloaded.masterIndeterminate,
      `PC reloaded per-item states are ${JSON.stringify(reloaded)}`
    );
    expect(reloaded.timerSize === 220 && Math.abs(reloaded.computedTimer - 220) <= 1.5,
      `PC reloaded timer is ${JSON.stringify(reloaded)}`);

    await setCheckbox(page, "autoSize", false);
    await waitStored(
      page,
      AUTO_KEYS.map(key => `settings.${key} === false`).join(" && "),
      "master auto-size off"
    );
    const allOff = await page.evaluate(keys => ({
      checked: keys.filter(key => document.getElementById(key)?.checked).length,
      master: document.getElementById("autoSize").checked,
      mixed: document.getElementById("autoSize").indeterminate
    }), AUTO_KEYS);
    expect(allOff.checked === 0 && !allOff.master && !allOff.mixed,
      `PC all-off state is ${JSON.stringify(allOff)}`);

    await setCheckbox(page, "autoSize", true);
    await waitStored(
      page,
      AUTO_KEYS.map(key => `settings.${key} === true`).join(" && "),
      "master auto-size on"
    );

    failures.push(...runtimeErrors.map(error => `PC runtime: ${error}`));
  } catch (error) {
    failures.push(`PC: ${error.stack || error.message}`);
  }

  await context.close();
}

// Landscape phone: item-level manual settings must bypass old vw/vh caps.
{
  const context = await browser.newContext({
    viewport: { width: 568, height: 320 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-08-20T10:00:00.000Z") });
  await installSettings(page, baseSettings({
    autoSize: false,
    autoSizeClock: false,
    autoSizeDate: false,
    autoSizeTimer: false,
    autoSizeCompletionText: true,
    autoSizeTarget: false,
    autoSizeSub: true,
    autoSizeTimerText: true,
    autoSizeWroTitle: true,
    autoSizeWroDateSuffix: true,
    timerSize: 72,
    targetSize: 36,
    dateSize: 20
  }));

  try {
    await page.goto(`${BASE_URL}&phone-landscape=1`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await waitForDisplay(page);

    const values = await page.evaluate(() => ({
      timer: Number.parseFloat(
        getComputedStyle(document.getElementById("mainValue")).fontSize
      ),
      target: Number.parseFloat(
        getComputedStyle(document.getElementById("targetLabel")).fontSize
      ),
      date: Number.parseFloat(
        getComputedStyle(document.getElementById("date")).fontSize
      ),
      timerDataset: document.getElementById("app").dataset.autoSizeTimer,
      targetDataset: document.getElementById("app").dataset.autoSizeTarget,
      dateDataset: document.getElementById("app").dataset.autoSizeDate
    }));

    expect(Math.abs(values.timer - 72) <= 1.5,
      `landscape manual timer is ${values.timer}px`);
    expect(values.target >= 30,
      `landscape manual target was capped at ${values.target}px`);
    expect(values.date >= 17,
      `landscape manual date was capped at ${values.date}px`);
    expect(
      values.timerDataset === "false" &&
      values.targetDataset === "false" &&
      values.dateDataset === "false",
      `landscape datasets are ${JSON.stringify(values)}`
    );
  } catch (error) {
    failures.push(`phone landscape: ${error.stack || error.message}`);
  }

  await context.close();
}

// Completion text has an independent automatic sizing switch.
{
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-08-20T11:30:10.000Z") });
  await installSettings(page, baseSettings({
    autoSize: false,
    autoSizeClock: true,
    autoSizeDate: true,
    autoSizeTimer: true,
    autoSizeCompletionText: false,
    autoSizeTarget: true,
    autoSizeSub: true,
    autoSizeTimerText: true,
    autoSizeWroTitle: true,
    autoSizeWroDateSuffix: true,
    completionTextSize: 120
  }));

  try {
    await page.goto(`${BASE_URL}&completion=1`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await waitForDisplay(page, "completion");
    const completion = await fontSize(page, "#mainValue");
    expect(Math.abs(completion - 120) <= 1.5,
      `manual completion text rendered as ${completion}px`);
  } catch (error) {
    failures.push(`completion: ${error.stack || error.message}`);
  }

  await context.close();
}

// Legacy global autoSize values migrate to all per-text settings.
for (const legacy of [true, false]) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  await page.clock.install({ time: new Date("2026-08-20T10:00:00.000Z") });
  await installSettings(page, baseSettings({ autoSize: legacy }));

  try {
    await page.goto(`${BASE_URL}&legacy=${legacy}`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await waitForDisplay(page);
    const saved = await stored(page);
    expect(
      AUTO_KEYS.every(key => saved[key] === legacy),
      `legacy ${legacy} migration is ${JSON.stringify(saved)}`
    );
  } catch (error) {
    failures.push(`legacy ${legacy}: ${error.stack || error.message}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO per-text automatic sizing check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO per-text automatic sizing passed master/partial states, direct timer sizing, responsive-cap bypass, completion sizing, persistence, and legacy migration."
);
