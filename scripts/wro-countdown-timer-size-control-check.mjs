import { chromium } from "playwright";

const URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?timer-size-check=1";
const KEY = "wro-countdown-settings-v4";
const NOW = new Date("2026-08-20T10:00:00.000Z");
const CASES = [
  {
    name: "phone-landscape",
    viewport: { width: 568, height: 320 },
    autoSize: false,
    showCurrentTime: false,
    sizes: [36, 60, 3000],
    strictUntil: 60
  },
  {
    name: "notebook-auto",
    viewport: { width: 1366, height: 768 },
    autoSize: true,
    showCurrentTime: true,
    sizes: [36, 116, 300, 3000],
    strictUntil: 300
  },
  {
    name: "four-k-manual",
    viewport: { width: 3840, height: 2160 },
    autoSize: false,
    showCurrentTime: false,
    sizes: [116, 300, 600, 3000],
    strictUntil: 600
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
    showCurrentTime: testCase.showCurrentTime,
    currentTimeLabel: "現在時刻",
    timerSize: testCase.sizes[0],
    autoSize: testCase.autoSize,
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

async function chooseSize(page, size) {
  await page.evaluate(value => {
    const range = document.getElementById("timerSizeRange");
    range.value = String(value);
    range.dispatchEvent(new Event("input", { bubbles: true }));
  }, size);

  await page.waitForFunction(({ key, value }) => {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    const app = document.getElementById("app");
    return saved.timerSize === value &&
      Number(document.getElementById("timerSize")?.value) === value &&
      Number(app?.dataset.timerRequestedSize) === value &&
      app?.dataset.timerSizeApplied === "true";
  }, { key: KEY, value: size }, { timeout: 15_000 });
  await page.waitForTimeout(180);
}

async function state(page) {
  return page.evaluate(key => {
    const app = document.getElementById("app");
    const timer = document.getElementById("mainValue");
    const rect = timer.getBoundingClientRect();
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      saved: Number(saved.timerSize),
      range: Number(document.getElementById("timerSizeRange")?.value),
      number: Number(document.getElementById("timerSize")?.value),
      maxRange: Number(document.getElementById("timerSizeRange")?.max),
      maxNumber: Number(document.getElementById("timerSize")?.max),
      requested: Number(app?.dataset.timerRequestedSize),
      variable: Number(app?.dataset.timerFitVariable),
      computed: Number.parseFloat(getComputedStyle(timer).fontSize),
      applied: app?.dataset.timerSizeApplied,
      collision: app?.dataset.layoutCollision,
      priority: timer.style.getPropertyPriority("font-size"),
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

    const results = [];
    for (const size of testCase.sizes) {
      await chooseSize(page, size);
      const current = await state(page);
      results.push({ size, current });

      expect(current.saved === size,
        `${label}/${size}: saved ${current.saved}`);
      expect(current.range === size && current.number === size,
        `${label}/${size}: controls ${current.range}/${current.number}`);
      expect(current.maxRange === 3000 && current.maxNumber === 3000,
        `${label}/${size}: maximums ${current.maxRange}/${current.maxNumber}`);
      expect(current.requested === size,
        `${label}/${size}: requested ${current.requested}`);
      expect(current.applied === "true",
        `${label}/${size}: guard ${current.applied}`);
      expect(Math.abs(current.computed - current.variable) <= 0.8,
        `${label}/${size}: computed/variable ` +
        `${current.computed}/${current.variable}`);
      expect(current.priority === "important",
        `${label}/${size}: priority ${current.priority}`);
      expect(current.collision !== "unresolved",
        `${label}/${size}: unresolved collision`);
      expect(insideViewport(current),
        `${label}/${size}: outside viewport ${JSON.stringify(current.rect)}`);
    }

    for (let index = 1; index < results.length; index += 1) {
      const previous = results[index - 1];
      const current = results[index];
      expect(current.current.computed + 0.8 >= previous.current.computed,
        `${label}: ${previous.size}→${current.size} shrank ` +
        `${previous.current.computed}→${current.current.computed}`);
      if (current.size <= testCase.strictUntil) {
        expect(current.current.computed > previous.current.computed + 1,
          `${label}: ${previous.size}→${current.size} did not grow ` +
          `${previous.current.computed}→${current.current.computed}`);
      }
    }

    await page.evaluate(() => document.getElementById("done").click());
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() =>
      Number(document.getElementById("app")?.dataset.timerRequestedSize) === 3000,
      { timeout: 15_000 }
    );
    const reloaded = await state(page);
    expect(reloaded.saved === 3000 && reloaded.requested === 3000,
      `${label}: 3000px did not survive reload`);

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
  "WRO timer size control passed 36–3000px persistence, visible growth, " +
  "CSS authority and viewport safety on phone, notebook and 4K displays."
);
