import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/app.html?anchor-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const FIXED_NOW = "2026-08-15T13:00:00.000Z";

const defaults = {
  mode: "timer",
  targetTime: "20:30",
  showTarget: true,
  showHourMinute: true,
  timerText: "",
  showCurrentTime: true,
  currentTimeLabel: "現在時刻",
  wroTitleSize: 30,
  wroDateSuffix: "",
  wroDateSuffixSize: 22,
  theme: "dark",
  autoSize: true,
  clockSize: 64,
  timerSize: 116,
  targetSize: 32,
  subSize: 23,
  timerTextSize: 26,
  clockPosition: "bottom-right",
  clockOffsetX: 0,
  clockOffsetY: 0,
  timerPosition: "top-right",
  timerOffsetX: 0,
  timerOffsetY: 0,
  wroPosition: "top-left",
  wroOffsetX: 0,
  wroOffsetY: 0,
  noiseStrength: 0,
  noisePattern: "random",
  noiseIntervalMin: 0,
  lineGap: 110,
  autoWroEnabled: false,
  autoWroIntervalMin: 5,
  autoWroDurationMin: 1,
  alarmEnabled: false,
  atTarget: true,
  leadTimes: [5, 10, 30],
  volume: 70,
  soundType: "bell",
  fileName: ""
};

const cases = [
  {
    name: "WRO mode keeps current time at top-right",
    viewport: { width: 1366, height: 768 },
    settings: {
      ...defaults,
      mode: "wro",
      clockPosition: "top-right",
      wroPosition: "top-left",
      currentTimeLabel: "ただいまの会場現在時刻",
      wroTitleSize: 100,
      wroDateSuffix: "WRO Japan決勝大会 開幕まで",
      wroDateSuffixSize: 72
    },
    expected: {
      clock: "top-right",
      display: "top-left"
    }
  },
  {
    name: "timer with extra labels remains top-right",
    viewport: { width: 1366, height: 768 },
    settings: {
      ...defaults,
      clockPosition: "bottom-left",
      timerPosition: "top-right",
      currentTimeLabel: "ただいまの会場現在時刻",
      timerText: "競技終了予定の20:30まで残り {残り時間}\n安全に競技を進行してください",
      timerSize: 420,
      targetSize: 120,
      timerTextSize: 86,
      subSize: 80
    },
    expected: {
      clock: "bottom-left",
      display: "top-right"
    }
  },
  {
    name: "same top-right anchor stacks without moving current time",
    viewport: { width: 1366, height: 768 },
    settings: {
      ...defaults,
      clockPosition: "top-right",
      timerPosition: "top-right",
      currentTimeLabel: "ただいまの会場現在時刻",
      timerText: "競技終了まで残り {残り時間}",
      clockSize: 150,
      timerSize: 360,
      targetSize: 90,
      timerTextSize: 70,
      subSize: 60
    },
    expected: {
      clock: "top-right",
      display: "top-right",
      stacked: true
    }
  },
  {
    name: "same WRO top-right anchor stacks without moving current time",
    viewport: { width: 1920, height: 1080 },
    settings: {
      ...defaults,
      mode: "wro",
      clockPosition: "top-right",
      wroPosition: "top-right",
      currentTimeLabel: "ただいまの会場現在時刻",
      clockSize: 170,
      wroTitleSize: 130,
      targetSize: 100,
      wroDateSuffix: "WRO Japan決勝大会 開幕まで",
      wroDateSuffixSize: 80,
      timerSize: 440,
      subSize: 70
    },
    expected: {
      clock: "top-right",
      display: "top-right",
      stacked: true
    }
  },
  {
    name: "live label edits do not change top-right placement",
    viewport: { width: 1440, height: 900 },
    settings: {
      ...defaults,
      clockPosition: "bottom-left",
      timerPosition: "top-right"
    },
    mutate: async page => {
      await page.click("#gear");
      await page.fill(
        "#timerTextInput",
        "競技終了予定の20:30まで残り {残り時間}\n追加したラベルでも右上を維持"
      );
      await page.dispatchEvent("#timerTextInput", "change");
      await page.fill("#currentTimeLabelInput", "ただいまの会場現在時刻");
      await page.dispatchEvent("#currentTimeLabelInput", "input");
      await page.waitForTimeout(300);
      await page.click("#done");
      await page.waitForTimeout(300);
    },
    expected: {
      clock: "bottom-left",
      display: "top-right"
    }
  }
];

function overlap(first, second) {
  const width = Math.max(
    0,
    Math.min(first.right, second.right) - Math.max(first.left, second.left)
  );
  const height = Math.max(
    0,
    Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
  );
  return { width, height };
}

const browser = await chromium.launch({ headless: true });
const failures = [];

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: testCase.viewport,
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const runtimeErrors = [];

  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  await page.addInitScript(({ key, storedSettings, fixedNow }) => {
    localStorage.setItem(key, JSON.stringify(storedSettings));

    const RealDate = Date;
    const fixedMilliseconds = RealDate.parse(fixedNow);
    class FixedDate extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedMilliseconds]));
      }
      static now() {
        return fixedMilliseconds;
      }
      static parse(value) {
        return RealDate.parse(value);
      }
      static UTC(...args) {
        return RealDate.UTC(...args);
      }
    }
    Object.setPrototypeOf(FixedDate, RealDate);
    window.Date = FixedDate;
  }, {
    key: SETTINGS_KEY,
    storedSettings: testCase.settings,
    fixedNow: FIXED_NOW
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForFunction(() => {
      const main = document.querySelector("#mainValue")?.textContent || "";
      const clock = document.querySelector("#clock")?.textContent || "";
      return main && !main.includes("--") && clock && !clock.includes("--");
    }, { timeout: 15_000 });
    await page.waitForTimeout(400);

    if (testCase.mutate) await testCase.mutate(page);

    const result = await page.evaluate(expected => {
      const pixel = (style, name, fallback) => {
        const value = Number.parseFloat(style.getPropertyValue(name));
        return Number.isFinite(value) ? value : fallback;
      };
      const rect = selector => {
        const value = document.querySelector(selector).getBoundingClientRect();
        return {
          left: value.left,
          top: value.top,
          right: value.right,
          bottom: value.bottom,
          width: value.width,
          height: value.height
        };
      };
      const shell = document.querySelector("#shell");
      const style = getComputedStyle(shell);
      const bounds = {
        left: pixel(style, "--layout-left", 24),
        right: window.innerWidth - pixel(style, "--layout-right", 24),
        top: pixel(style, "--layout-top", 64),
        bottom: window.innerHeight - pixel(style, "--layout-bottom", 64)
      };

      return {
        expected,
        bounds,
        current: rect("#currentBlock"),
        display: rect("#display"),
        currentPosition: document.querySelector("#currentBlock").dataset.position,
        displayPosition: document.querySelector("#display").dataset.position,
        collision: document.querySelector("#app").dataset.layoutCollision,
        clockAnchorPreserved:
          document.querySelector("#app").dataset.clockAnchorPreserved
      };
    }, testCase.expected);

    const tolerance = 28;
    const checkAnchor = (name, rect, position, allowStack = false) => {
      const column = position.endsWith("-left")
        ? "left"
        : position.endsWith("-right")
          ? "right"
          : "center";
      const row = position.startsWith("top-")
        ? "top"
        : position.startsWith("bottom-")
          ? "bottom"
          : "middle";

      if (column === "left" && Math.abs(rect.left - result.bounds.left) > tolerance) {
        failures.push(`${testCase.name}: ${name} left anchor moved`);
      }
      if (column === "right" && Math.abs(rect.right - result.bounds.right) > tolerance) {
        failures.push(`${testCase.name}: ${name} right anchor moved`);
      }
      if (column === "center") {
        const actual = (rect.left + rect.right) / 2;
        const target = (result.bounds.left + result.bounds.right) / 2;
        if (Math.abs(actual - target) > tolerance) {
          failures.push(`${testCase.name}: ${name} center anchor moved`);
        }
      }

      if (allowStack) return;
      if (row === "top" && Math.abs(rect.top - result.bounds.top) > tolerance) {
        failures.push(`${testCase.name}: ${name} top anchor moved`);
      }
      if (row === "bottom" && Math.abs(rect.bottom - result.bounds.bottom) > tolerance) {
        failures.push(`${testCase.name}: ${name} bottom anchor moved`);
      }
      if (row === "middle") {
        const actual = (rect.top + rect.bottom) / 2;
        const target = (result.bounds.top + result.bounds.bottom) / 2;
        if (Math.abs(actual - target) > tolerance) {
          failures.push(`${testCase.name}: ${name} middle anchor moved`);
        }
      }
    };

    checkAnchor("current time", result.current, testCase.expected.clock);
    checkAnchor(
      "countdown",
      result.display,
      testCase.expected.display,
      Boolean(testCase.expected.stacked)
    );

    if (result.currentPosition !== testCase.expected.clock) {
      failures.push(
        `${testCase.name}: current-time data-position changed to ${result.currentPosition}`
      );
    }
    if (result.displayPosition !== testCase.expected.display) {
      failures.push(
        `${testCase.name}: countdown data-position changed to ${result.displayPosition}`
      );
    }

    const collision = overlap(result.current, result.display);
    if (collision.width > 8 && collision.height > 8) {
      failures.push(
        `${testCase.name}: current time overlaps countdown by ` +
        `${Math.round(collision.width)}x${Math.round(collision.height)}px`
      );
    }

    if (testCase.expected.stacked) {
      const row = testCase.expected.display.startsWith("bottom-")
        ? "bottom"
        : "top";
      if (row === "top" && result.display.top < result.current.bottom + 8) {
        failures.push(`${testCase.name}: top-right items were not vertically stacked`);
      }
      if (row === "bottom" && result.display.bottom > result.current.top - 8) {
        failures.push(`${testCase.name}: bottom-right items were not vertically stacked`);
      }
    }

    if (result.collision === "unresolved") {
      failures.push(`${testCase.name}: collision resolver reported unresolved`);
    }
    if (result.clockAnchorPreserved !== "true") {
      failures.push(`${testCase.name}: current-time anchor preservation flag missing`);
    }
    failures.push(...runtimeErrors.map(error => `${testCase.name}: ${error}`));
  } catch (error) {
    failures.push(`${testCase.name}: ${error.stack || error.message}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO anchor-position check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`WRO anchor-position check passed ${cases.length} cases.`);
