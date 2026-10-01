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
    name: "WRO mode keeps selected positions",
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
    expected: { clock: "top-right", display: "top-left" }
  },
  {
    name: "timer with extra labels keeps selected positions",
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
    expected: { clock: "bottom-left", display: "top-right" }
  },
  {
    name: "same timer anchor prioritizes larger display",
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
      sameAnchor: true,
      priority: "display"
    }
  },
  {
    name: "same WRO anchor prioritizes larger block",
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
      sameAnchor: true
    }
  },
  {
    name: "live label edits keep selected position metadata",
    viewport: { width: 1440, height: 900 },
    settings: {
      ...defaults,
      clockPosition: "bottom-left",
      timerPosition: "top-right"
    },
    mutate: async page => {
      await page.click("#gear");
      const advanced = page.locator("#advancedSettingsAccordion");
      if (!(await advanced.evaluate(element => element.open))) {
        await page.click("#advancedSettingsAccordion > summary");
      }
      await page.fill(
        "#timerTextInput",
        "競技終了予定の20:30まで残り {残り時間}\n追加したラベルでも右上を維持"
      );
      await page.dispatchEvent("#timerTextInput", "change");
      await page.fill("#currentTimeLabelInput", "ただいまの会場現在時刻");
      await page.dispatchEvent("#currentTimeLabelInput", "input");
      await page.waitForTimeout(300);
      await page.evaluate(() => document.getElementById("done").click());
      await page.waitForTimeout(300);
    },
    expected: { clock: "bottom-left", display: "top-right" }
  }
];

function overlap(first, second) {
  return {
    width: Math.max(
      0,
      Math.min(first.right, second.right) - Math.max(first.left, second.left)
    ),
    height: Math.max(
      0,
      Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top)
    )
  };
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
      static now() { return fixedMilliseconds; }
      static parse(value) { return RealDate.parse(value); }
      static UTC(...args) { return RealDate.UTC(...args); }
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

    const result = await page.evaluate(() => {
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
      const app = document.getElementById("app");
      return {
        current: rect("#currentBlock"),
        display: rect("#display"),
        currentPosition: document.getElementById("currentBlock").dataset.position,
        displayPosition: document.getElementById("display").dataset.position,
        collision: app.dataset.layoutCollision,
        priority: app.dataset.layoutPriority || "",
        currentAuto: app.dataset.currentBlockAutoLayout,
        displayAuto: app.dataset.displayBlockAutoLayout,
        clockSize: Number.parseFloat(
          getComputedStyle(document.getElementById("clock")).fontSize
        ),
        mainSize: Number.parseFloat(
          getComputedStyle(document.getElementById("mainValue")).fontSize
        )
      };
    });

    if (result.currentPosition !== testCase.expected.clock) {
      failures.push(
        `${testCase.name}: current-time data-position changed to ${result.currentPosition}`
      );
    }
    if (result.displayPosition !== testCase.expected.display) {
      failures.push(
        `${testCase.name}: display data-position changed to ${result.displayPosition}`
      );
    }

    const collision = overlap(result.current, result.display);
    if (collision.width > 8 && collision.height > 8) {
      failures.push(
        `${testCase.name}: automatic blocks overlap by ` +
        `${Math.round(collision.width)}x${Math.round(collision.height)}px`
      );
    }

    if (result.collision === "unresolved") {
      failures.push(`${testCase.name}: collision resolver reported unresolved`);
    }

    if (testCase.expected.sameAnchor) {
      if (result.currentAuto !== "true" || result.displayAuto !== "true") {
        failures.push(
          `${testCase.name}: same-anchor blocks are not both automatic ` +
          `${result.currentAuto}/${result.displayAuto}`
        );
      }
      if (!result.priority) {
        failures.push(`${testCase.name}: same-anchor priority was not recorded`);
      }
      if (testCase.expected.priority && result.priority !== testCase.expected.priority) {
        failures.push(
          `${testCase.name}: expected ${testCase.expected.priority} priority, got ${result.priority}`
        );
      }
      if (result.mainSize > result.clockSize && result.priority !== "display") {
        failures.push(
          `${testCase.name}: larger display (${result.mainSize}px) was not prioritized over clock (${result.clockSize}px)`
        );
      }
      if (result.clockSize > result.mainSize && result.priority !== "current") {
        failures.push(
          `${testCase.name}: larger clock (${result.clockSize}px) was not prioritized over display (${result.mainSize}px)`
        );
      }
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

console.log(
  `WRO anchor-position check passed ${cases.length} cases with selected-position metadata, automatic separation and larger-display priority.`
);
