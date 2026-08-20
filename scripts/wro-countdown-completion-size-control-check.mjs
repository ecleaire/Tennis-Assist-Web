import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?completion-size-control-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const COMPLETION_NOW = new Date("2026-08-20T11:30:10.000Z");

const cases = [
  {
    name: "phone-390x844-auto",
    viewport: { width: 390, height: 844 },
    autoSize: true,
    text: "お疲れ様でした"
  },
  {
    name: "notebook-1366x768-auto",
    viewport: { width: 1366, height: 768 },
    autoSize: true,
    text: "お疲れ様でした"
  },
  {
    name: "desktop-1920x1080-auto",
    viewport: { width: 1920, height: 1080 },
    autoSize: true,
    text: "お疲れ様でした"
  },
  {
    name: "notebook-1366x768-manual",
    viewport: { width: 1366, height: 768 },
    autoSize: false,
    text: "お疲れ様でした"
  },
  {
    name: "notebook-1366x768-long-auto",
    viewport: { width: 1366, height: 768 },
    autoSize: true,
    text: "本日の競技運営はすべて終了しました\n選手・スタッフの皆さま、本当にお疲れ様でした"
  }
];

const browser = await chromium.launch({ headless: true });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function rectInside(rect, viewport, tolerance = 2) {
  return rect.left >= -tolerance &&
    rect.top >= -tolerance &&
    rect.right <= viewport.width + tolerance &&
    rect.bottom <= viewport.height + tolerance;
}

async function runCase(testCase) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const label = testCase.name;

  page.on("pageerror", error => failures.push(`${label}: pageerror ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") failures.push(`${label}: console ${message.text()}`);
  });

  await page.clock.install({ time: COMPLETION_NOW });
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: SETTINGS_KEY,
    value: {
      mode: "timer",
      targetTime: "20:30",
      completionText: testCase.text,
      completionDurationMin: 30,
      completionTextSize: 36,
      autoSize: testCase.autoSize,
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
        fitStatus: app.dataset.completionFit,
        computed: Number.parseFloat(getComputedStyle(main).fontSize),
        rangeValue: Number(document.getElementById("completionTextSizeRange")?.value),
        numberValue: Number(document.getElementById("completionTextSize")?.value),
        storedSize: Number(stored.completionTextSize),
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
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
    await page.waitForTimeout(220);
  }

  try {
    await page.goto(
      `${BASE_URL}&case=${encodeURIComponent(label)}`,
      { waitUntil: "networkidle", timeout: 45_000 }
    );
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

    const sizes = [];
    for (const value of [36, 96, 180, 260, 320, 24]) {
      if (value !== 36) await setSize(value);
      sizes.push({ value, state: await state() });
    }

    const byValue = Object.fromEntries(sizes.map(item => [item.value, item.state]));
    console.log(label, JSON.stringify(
      sizes.map(item => ({
        requested: item.value,
        preferred: item.state.preferred,
        fitted: item.state.fitted,
        computed: item.state.computed,
        width: item.state.rect.width,
        height: item.state.rect.height
      }))
    ));

    for (const { value, state: current } of sizes) {
      expect(current.phase === "completion", `${label}/${value}: phase is ${current.phase}`);
      expect(current.requested === value,
        `${label}/${value}: requested size is ${current.requested}`);
      expect(current.rangeValue === value && current.numberValue === value,
        `${label}/${value}: controls are ${current.rangeValue}/${current.numberValue}`);
      expect(current.storedSize === value,
        `${label}/${value}: stored size is ${current.storedSize}`);
      expect(current.fitStatus === "fitted",
        `${label}/${value}: fit status is ${current.fitStatus}`);
      expect(Math.abs(current.computed - current.fitted) < 0.6,
        `${label}/${value}: computed/fitted differ ${current.computed}/${current.fitted}`);
      expect(rectInside(current.rect, testCase.viewport),
        `${label}/${value}: text outside viewport ${JSON.stringify(current.rect)}`);
    }

    expect(byValue[96].computed > byValue[36].computed + 4,
      `${label}: 36→96 did not grow (${byValue[36].computed}→${byValue[96].computed})`);
    expect(byValue[180].computed > byValue[96].computed + 4,
      `${label}: 96→180 did not grow (${byValue[96].computed}→${byValue[180].computed})`);
    expect(byValue[24].computed < byValue[96].computed - 4,
      `${label}: 96→24 did not shrink (${byValue[96].computed}→${byValue[24].computed})`);

    if (testCase.text === "お疲れ様でした") {
      expect(byValue[260].computed >= byValue[180].computed,
        `${label}: 180→260 unexpectedly shrank`);
      expect(byValue[320].computed >= byValue[260].computed,
        `${label}: 260→320 unexpectedly shrank`);
    }
  } catch (error) {
    failures.push(`${label}: ${error.stack || error.message}`);
  }

  await context.close();
}

for (const testCase of cases) await runCase(testCase);
await browser.close();

if (failures.length) {
  console.error("WRO completion size control check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`WRO completion size controls passed ${cases.length} phone and PC cases.`);
