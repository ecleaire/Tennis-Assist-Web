import { chromium } from "playwright";

const URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?timer-size-check=1";
const KEY = "wro-countdown-settings-v4";
const NOW = new Date("2026-08-20T10:00:00.000Z");

const CASES = [
  {
    name: "phone-landscape-manual",
    viewport: { width: 568, height: 320 },
    autoSize: false,
    sizes: [36, 60, 3000, 12000]
  },
  {
    name: "notebook-auto",
    viewport: { width: 1366, height: 768 },
    autoSize: true,
    sizes: [36, 116, 300, 3000]
  },
  {
    name: "four-k-manual",
    viewport: { width: 3840, height: 2160 },
    autoSize: false,
    sizes: [116, 300, 600, 3000]
  }
];

const browser = await chromium.launch({ headless: true });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function initialSettings(testCase) {
  return {
    mode: "timer",
    targetTime: "20:30",
    showTarget: true,
    showHourMinute: true,
    timerText: "",
    showCurrentTime: false,
    currentTimeLabel: "現在時刻",
    timerSize: testCase.sizes[0],
    autoSize: testCase.autoSize,
    autoSizeTimer: testCase.autoSize,
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
  };
}

async function openAdvanced(page) {
  await page.click("#gear");
  const details = page.locator("#advancedSettingsAccordion");
  if (!(await details.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
}

async function chooseNumberSize(page, size) {
  const input = page.locator("#timerSize");
  await input.fill(String(size));
  await input.dispatchEvent("input");
  await input.dispatchEvent("change");

  await page.waitForFunction(({ key, value }) => {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const app = document.getElementById("app");
    return saved.timerSize === value &&
      Number(document.getElementById("timerSize")?.value) === value &&
      Number(app?.dataset.timerRequestedSize) === value &&
      app?.dataset.timerSizeApplied === "true";
  }, { key: KEY, value: size }, { timeout: 15_000 });
  await page.waitForTimeout(120);
}

async function state(page) {
  return page.evaluate(key => {
    const app = document.getElementById("app");
    const timer = document.getElementById("mainValue");
    const rect = timer.getBoundingClientRect();
    const number = document.getElementById("timerSize");
    const range = document.getElementById("timerSizeRange");
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      saved: Number(saved.timerSize),
      range: Number(range?.value),
      number: Number(number?.value),
      numberMaxAttribute: number?.getAttribute("max"),
      rangeMax: Number(range?.max),
      requested: Number(app?.dataset.timerRequestedSize),
      auto: app?.dataset.timerAutoSize,
      variable: Number(app?.dataset.timerFitVariable),
      computed: Number.parseFloat(getComputedStyle(timer).fontSize),
      applied: app?.dataset.timerSizeApplied,
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom
      },
      viewport: { width: innerWidth, height: innerHeight },
      document: {
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight
      }
    };
  }, KEY);
}

function insideViewport(value) {
  return value.rect.left >= -3 && value.rect.top >= -3 &&
    value.rect.right <= value.viewport.width + 3 &&
    value.rect.bottom <= value.viewport.height + 3 &&
    value.document.width <= value.viewport.width + 3 &&
    value.document.height <= value.viewport.height + 3;
}

for (const testCase of CASES) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const label = testCase.name;
  const runtimeErrors = [];

  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.clock.install({ time: NOW });
  await page.addInitScript(({ key, settings }) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(settings));
    }
  }, { key: KEY, settings: initialSettings(testCase) });

  try {
    await page.goto(`${URL}&case=${label}`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await page.waitForFunction(() =>
      document.getElementById("app")?.dataset.timerSizeApplied === "true",
      { timeout: 15_000 }
    );
    await openAdvanced(page);

    const validity = await page.evaluate(() => {
      const input = document.getElementById("timerSize");
      const previous = input.value;
      input.value = "1000001";
      const result = {
        maxAttribute: input.getAttribute("max"),
        rangeOverflow: input.validity.rangeOverflow,
        valid: input.checkValidity()
      };
      input.value = previous;
      return result;
    });
    expect(validity.maxAttribute === null,
      `${label}: timer number input unexpectedly has max=${validity.maxAttribute}`);
    expect(!validity.rangeOverflow && validity.valid,
      `${label}: unlimited numeric input rejects values above the slider max`);

    for (const size of testCase.sizes) {
      await chooseNumberSize(page, size);
      const current = await state(page);

      expect(current.saved === size,
        `${label}/${size}: saved ${current.saved}`);
      expect(current.number === size,
        `${label}/${size}: number control ${current.number}`);
      expect(current.numberMaxAttribute === null,
        `${label}/${size}: numeric max reappeared as ${current.numberMaxAttribute}`);
      expect(current.rangeMax >= 1_000_000,
        `${label}/${size}: slider max regressed to ${current.rangeMax}`);
      expect(current.requested === size,
        `${label}/${size}: requested ${current.requested}`);
      expect(current.applied === "true",
        `${label}/${size}: apply guard ${current.applied}`);

      if (testCase.autoSize) {
        expect(current.auto === "true", `${label}/${size}: auto flag ${current.auto}`);
        expect(current.computed <= size * 4 + 1,
          `${label}/${size}: auto fit unexpectedly expanded to ${current.computed}`);
        expect(insideViewport(current),
          `${label}/${size}: auto-sized timer escaped viewport ${JSON.stringify(current.rect)}`);
      } else {
        expect(current.auto === "false", `${label}/${size}: manual flag ${current.auto}`);
        expect(Math.abs(current.computed - size) <= 0.8,
          `${label}/${size}: manual size ${current.computed} did not match ${size}`);
      }
    }

    const finalSize = testCase.sizes.at(-1);
    await page.evaluate(() => document.getElementById("done").click());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(value =>
      Number(document.getElementById("app")?.dataset.timerRequestedSize) === value,
      finalSize,
      { timeout: 15_000 }
    );
    const reloaded = await state(page);
    expect(reloaded.saved === finalSize && reloaded.requested === finalSize,
      `${label}: ${finalSize}px did not survive reload`);

    failures.push(...runtimeErrors.map(error => `${label}: ${error}`));
  } catch (error) {
    failures.push(`${label}: ${error.stack || error.message}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO timer size control check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO timer size control passed unlimited numeric validation, 1,000,000px slider ceiling, " +
  "manual exact sizing, auto-fit safety and persistence checks."
);
