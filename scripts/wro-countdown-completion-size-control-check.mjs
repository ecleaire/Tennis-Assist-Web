import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?completion-size-control-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const COMPLETION_NOW = new Date("2026-08-20T11:30:10.000Z");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  reducedMotion: "reduce"
});
const page = await context.newPage();
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function state() {
  return page.evaluate(key => {
    const app = document.getElementById("app");
    const main = document.getElementById("mainValue");
    const rect = main.getBoundingClientRect();
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      phase: app.dataset.timerPhase,
      requested: Number(app.dataset.completionRequestedSize),
      preferred: Number(app.dataset.completionPreferredSize),
      fitted: Number(app.dataset.completionFitSize),
      computed: Number.parseFloat(getComputedStyle(main).fontSize),
      rangeValue: Number(document.getElementById("completionTextSizeRange")?.value),
      numberValue: Number(document.getElementById("completionTextSize")?.value),
      storedSize: Number(stored.completionTextSize),
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }, SETTINGS_KEY);
}

async function setSize(value) {
  await page.evaluate(next => {
    const input = document.getElementById("completionTextSizeRange");
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await page.waitForFunction(expected => {
    const app = document.getElementById("app");
    const number = document.getElementById("completionTextSize");
    return Number(app?.dataset.completionRequestedSize) === expected &&
      Number(number?.value) === expected;
  }, value, { timeout: 15_000 });
  await page.waitForTimeout(180);
}

page.on("pageerror", error => failures.push(`pageerror: ${error.message}`));
page.on("console", message => {
  if (message.type() === "error") failures.push(`console: ${message.text()}`);
});

await page.clock.install({ time: COMPLETION_NOW });
await page.addInitScript(({ key, value }) => {
  localStorage.setItem(key, JSON.stringify(value));
}, {
  key: SETTINGS_KEY,
  value: {
    mode: "timer",
    targetTime: "20:30",
    completionText: "お疲れ様でした",
    completionDurationMin: 30,
    completionTextSize: 36,
    autoSize: true,
    showTarget: true,
    showHourMinute: true,
    showCurrentTime: true,
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
  }
});

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(() => {
    const app = document.getElementById("app");
    return app?.dataset.timerPhase === "completion" &&
      app.dataset.completionFit === "fitted";
  }, { timeout: 15_000 });

  await page.click("#gear");
  const advanced = page.locator("#advancedSettingsAccordion");
  if (!(await advanced.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open
  );

  const small = await state();
  expect(small.phase === "completion", `initial phase is ${small.phase}`);
  expect(small.requested === 36, `initial requested size is ${small.requested}`);
  expect(small.rangeValue === 36 && small.numberValue === 36,
    `initial controls are ${small.rangeValue}/${small.numberValue}`);

  await setSize(180);
  const large = await state();
  expect(large.requested === 180, `large requested size is ${large.requested}`);
  expect(large.rangeValue === 180 && large.numberValue === 180,
    `large controls are ${large.rangeValue}/${large.numberValue}`);
  expect(large.storedSize === 180, `large stored size is ${large.storedSize}`);
  expect(large.computed > small.computed + 8,
    `font did not grow: ${small.computed} -> ${large.computed}`);
  expect(Math.abs(large.computed - large.fitted) < 0.6,
    `computed and fitted sizes differ: ${large.computed}/${large.fitted}`);

  await setSize(24);
  const reduced = await state();
  expect(reduced.requested === 24, `reduced requested size is ${reduced.requested}`);
  expect(reduced.storedSize === 24, `reduced stored size is ${reduced.storedSize}`);
  expect(reduced.computed < large.computed - 8,
    `font did not shrink: ${large.computed} -> ${reduced.computed}`);

  for (const [label, current] of [
    ["small", small],
    ["large", large],
    ["reduced", reduced]
  ]) {
    expect(current.rect.left >= -2 && current.rect.top >= -2 &&
      current.rect.right <= current.viewport.width + 2 &&
      current.rect.bottom <= current.viewport.height + 2,
      `${label} text is outside viewport: ${JSON.stringify(current.rect)}`);
  }
} catch (error) {
  failures.push(error.stack || error.message);
}

await context.close();
await browser.close();

if (failures.length) {
  console.error("WRO completion size control check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("WRO completion size slider grows, shrinks, saves, and stays in bounds.");
