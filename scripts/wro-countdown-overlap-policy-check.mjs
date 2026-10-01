import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?overlap-policy-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";

const browser = await chromium.launch({ headless: true });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function settings(overrides = {}) {
  return {
    mode: "timer",
    targetTime: "20:30",
    showTarget: false,
    showHourMinute: false,
    timerText: "",
    completionMessages: ["お疲れ様でした"],
    completionText: "お疲れ様でした",
    completionMessageIntervalSec: 10,
    completionDurationMin: 30,
    showCurrentTime: true,
    currentTimeLabel: "",
    theme: "dark",
    backgroundStyle: "solid",
    backgroundStrength: 0,
    backgroundGuides: false,
    backgroundScanlines: false,
    autoWroEnabled: false,
    noiseStrength: 0,
    noiseIntervalMin: 0,
    alarmEnabled: false,
    clockSize: 180,
    dateSize: 36,
    timerSize: 260,
    completionTextSize: 96,
    targetSize: 32,
    subSize: 23,
    timerTextSize: 26,
    wroTitleSize: 30,
    wroDateSuffixSize: 22,
    clockPosition: "center",
    timerPosition: "center",
    wroPosition: "center",
    clockOffsetX: 0,
    clockOffsetY: 0,
    timerOffsetX: 0,
    timerOffsetY: 0,
    wroOffsetX: 0,
    wroOffsetY: 0,
    ...overrides
  };
}

function autoPatch(enabled, overrides = {}) {
  return {
    autoSize: enabled,
    autoSizeClock: enabled,
    autoSizeDate: enabled,
    autoSizeTimer: enabled,
    autoSizeCompletionText: enabled,
    autoSizeTarget: enabled,
    autoSizeSub: enabled,
    autoSizeTimerText: enabled,
    autoSizeWroTitle: enabled,
    autoSizeWroDateSuffix: enabled,
    ...overrides
  };
}

async function loadScenario(value, suffix) {
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
  await page.addInitScript(({ key, data }) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, { key: SETTINGS_KEY, data: value });

  await page.goto(`${BASE_URL}&scenario=${suffix}`, {
    waitUntil: "networkidle",
    timeout: 45_000
  });
  await page.waitForFunction(() => {
    const app = document.getElementById("app");
    const value = document.getElementById("mainValue")?.textContent || "";
    return app?.dataset.timerPhase === "countdown" &&
      value && !value.includes("--");
  }, { timeout: 15_000 });
  await page.waitForTimeout(350);
  return { context, page, runtimeErrors };
}

async function snapshot(page) {
  return page.evaluate(() => {
    const current = document.getElementById("currentBlock").getBoundingClientRect();
    const display = document.getElementById("display").getBoundingClientRect();
    const overlapWidth = Math.max(
      0,
      Math.min(current.right, display.right) - Math.max(current.left, display.left)
    );
    const overlapHeight = Math.max(
      0,
      Math.min(current.bottom, display.bottom) - Math.max(current.top, display.top)
    );
    const app = document.getElementById("app");
    return {
      overlapArea: overlapWidth * overlapHeight,
      timerSize: Number.parseFloat(
        getComputedStyle(document.getElementById("mainValue")).fontSize
      ),
      clockSize: Number.parseFloat(
        getComputedStyle(document.getElementById("clock")).fontSize
      ),
      layoutCollision: app.dataset.layoutCollision,
      layoutPriority: app.dataset.layoutPriority || "",
      currentAuto: app.dataset.currentBlockAutoLayout,
      displayAuto: app.dataset.displayBlockAutoLayout,
      currentCorrection: ["--collision-x", "--collision-y"].map(name =>
        document.getElementById("currentBlock").style.getPropertyValue(name)),
      displayCorrection: ["--collision-x", "--collision-y"].map(name =>
        document.getElementById("display").style.getPropertyValue(name))
    };
  });
}

// All manual: exact sizes remain authoritative and intentional overlap remains.
{
  const scenario = await loadScenario(
    settings({ ...autoPatch(false) }),
    "manual"
  );
  try {
    const value = await snapshot(scenario.page);
    expect(Math.abs(value.timerSize - 260) <= 1.5,
      `manual timer changed from 260px: ${JSON.stringify(value)}`);
    expect(Math.abs(value.clockSize - 180) <= 1.5,
      `manual clock changed from 180px: ${JSON.stringify(value)}`);
    expect(value.overlapArea > 0,
      `manual blocks did not overlap: ${JSON.stringify(value)}`);
    expect(value.layoutCollision === "allowed-manual",
      `manual collision policy is ${JSON.stringify(value)}`);
    expect(value.currentAuto === "false" && value.displayAuto === "false",
      `manual auto-layout flags are ${JSON.stringify(value)}`);
    failures.push(...scenario.runtimeErrors.map(error => `manual runtime: ${error}`));
  } catch (error) {
    failures.push(`manual: ${error.stack || error.message}`);
  }
  await scenario.context.close();
}

// All automatic: same-anchor blocks must be separated and the larger display
// gets priority over the smaller current-time block.
{
  const scenario = await loadScenario(
    settings({ ...autoPatch(true), clockSize: 64, timerSize: 160 }),
    "automatic"
  );
  try {
    const value = await snapshot(scenario.page);
    expect(value.timerSize > value.clockSize,
      `automatic priority setup is invalid: ${JSON.stringify(value)}`);
    expect(value.overlapArea === 0,
      `automatic blocks still overlap: ${JSON.stringify(value)}`);
    expect(value.layoutPriority === "display",
      `larger automatic display was not prioritized: ${JSON.stringify(value)}`);
    expect(
      value.layoutCollision === "resolved" ||
      value.layoutCollision === "resolved-overflow",
      `automatic collision was not resolved: ${JSON.stringify(value)}`
    );
    expect(value.currentAuto === "true" && value.displayAuto === "true",
      `automatic flags are ${JSON.stringify(value)}`);
    failures.push(...scenario.runtimeErrors.map(error => `automatic runtime: ${error}`));
  } catch (error) {
    failures.push(`automatic: ${error.stack || error.message}`);
  }
  await scenario.context.close();
}

// Mixed: manual display stays exact; automatic current-time block yields.
{
  const scenario = await loadScenario(
    settings({
      ...autoPatch(true, {
        autoSizeTimer: false,
        autoSizeTarget: false,
        autoSizeSub: false,
        autoSizeTimerText: false,
        autoSizeCompletionText: false,
        autoSizeWroTitle: false,
        autoSizeWroDateSuffix: false
      }),
      clockSize: 64,
      timerSize: 260
    }),
    "mixed"
  );
  try {
    const value = await snapshot(scenario.page);
    expect(Math.abs(value.timerSize - 260) <= 1.5,
      `mixed manual timer changed from 260px: ${JSON.stringify(value)}`);
    expect(value.overlapArea === 0,
      `mixed automatic block did not yield: ${JSON.stringify(value)}`);
    expect(value.layoutPriority === "manual-display",
      `mixed manual display did not have priority: ${JSON.stringify(value)}`);
    expect(value.currentAuto === "true" && value.displayAuto === "false",
      `mixed auto-layout flags are ${JSON.stringify(value)}`);
    expect(value.displayCorrection.every(value => value === "0px"),
      `mixed manual display was moved: ${JSON.stringify(value)}`);
    failures.push(...scenario.runtimeErrors.map(error => `mixed runtime: ${error}`));
  } catch (error) {
    failures.push(`mixed: ${error.stack || error.message}`);
  }
  await scenario.context.close();
}

// Exercise the opposite direction too: current time may be the larger
// automatic display or the fixed manual block.
for (const manualClock of [false, true]) {
  const label = manualClock ? "manual-current" : "larger-current";
  const scenario = await loadScenario(settings({
    ...autoPatch(true, {
      autoSizeClock: !manualClock,
      autoSizeDate: !manualClock
    }),
    clockSize: 180,
    timerSize: 36
  }), label);
  try {
    const value = await snapshot(scenario.page);
    expect(value.overlapArea === 0,
      `${label}: automatic display did not separate: ${JSON.stringify(value)}`);
    expect(value.layoutPriority === (manualClock ? "manual-current" : "current"),
      `${label}: wrong priority: ${JSON.stringify(value)}`);
    if (manualClock) {
      expect(Math.abs(value.clockSize - 180) <= 1.5,
        `${label}: manual clock shrank: ${JSON.stringify(value)}`);
      expect(value.currentCorrection.every(value => value === "0px"),
        `${label}: manual clock moved: ${JSON.stringify(value)}`);
    } else {
      expect(value.clockSize > value.timerSize,
        `${label}: larger clock did not keep priority: ${JSON.stringify(value)}`);
    }
    failures.push(...scenario.runtimeErrors.map(error => `${label} runtime: ${error}`));
  } catch (error) {
    failures.push(`${label}: ${error.stack || error.message}`);
  }
  await scenario.context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO overlap policy check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO overlap policy passed manual overlap, automatic separation/large-display priority, and mixed manual priority."
);
