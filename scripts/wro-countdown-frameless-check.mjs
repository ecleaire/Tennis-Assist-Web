import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/app.html?frameless-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";

const baseSettings = {
  mode: "timer",
  targetTime: "20:30",
  showTarget: true,
  showHourMinute: true,
  timerText: "競技終了まで残り {残り時間}",
  showCurrentTime: true,
  currentTimeLabel: "現在時刻",
  wroTitleSize: 30,
  wroDateSuffix: "Japan決勝大会",
  wroDateSuffixSize: 22,
  theme: "dark",
  autoSize: true,
  clockSize: 64,
  dateSize: 16,
  timerSize: 116,
  targetSize: 32,
  subSize: 23,
  timerTextSize: 26,
  clockPosition: "top-right",
  clockOffsetX: 0,
  clockOffsetY: 0,
  timerPosition: "center",
  timerOffsetX: 0,
  timerOffsetY: 0,
  wroPosition: "center",
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
  leadTimes: [5, 10, 30, 60],
  volume: 70,
  soundType: "bell",
  fileName: ""
};

const cases = [
  { name: "phone timer", width: 390, height: 844, settings: baseSettings },
  { name: "notebook timer", width: 1366, height: 768, settings: baseSettings },
  {
    name: "notebook WRO",
    width: 1366,
    height: 768,
    settings: { ...baseSettings, mode: "wro" }
  }
];

const selectors = [
  "#currentBlock",
  "#display",
  "#modeLabel",
  "#subValue",
  "#timerText",
  "#wroSuffix",
  "#soundBadge",
  "#foot"
];

const browser = await chromium.launch({ headless: true });
const failures = [];

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();

  await page.addInitScript(({ key, settings }) => {
    localStorage.setItem(key, JSON.stringify(settings));
  }, { key: SETTINGS_KEY, settings: testCase.settings });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForFunction(() => {
      const value = document.querySelector("#mainValue")?.textContent || "";
      return value && !value.includes("--");
    }, { timeout: 15_000 });
    await page.waitForTimeout(250);

    const results = await page.evaluate(selectorsToCheck =>
      selectorsToCheck.map(selector => {
        const element = document.querySelector(selector);
        if (!element || element.hidden || getComputedStyle(element).display === "none") {
          return { selector, skipped: true };
        }
        const style = getComputedStyle(element);
        return {
          selector,
          skipped: false,
          borderTop: style.borderTopWidth,
          borderRight: style.borderRightWidth,
          borderBottom: style.borderBottomWidth,
          borderLeft: style.borderLeftWidth,
          backgroundColor: style.backgroundColor,
          backgroundImage: style.backgroundImage,
          boxShadow: style.boxShadow
        };
      }), selectors);

    for (const result of results) {
      if (result.skipped) continue;
      const borders = [
        result.borderTop,
        result.borderRight,
        result.borderBottom,
        result.borderLeft
      ];
      if (borders.some(value => Number.parseFloat(value) > 0)) {
        failures.push(`${testCase.name}: ${result.selector} still has a border`);
      }
      if (result.backgroundColor !== "rgba(0, 0, 0, 0)") {
        failures.push(
          `${testCase.name}: ${result.selector} background is ${result.backgroundColor}`
        );
      }
      if (result.backgroundImage !== "none") {
        failures.push(
          `${testCase.name}: ${result.selector} still has a background image`
        );
      }
      if (result.boxShadow !== "none") {
        failures.push(`${testCase.name}: ${result.selector} still has a shadow`);
      }
    }
  } catch (error) {
    failures.push(`${testCase.name}: ${error.stack || error.message}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO frameless display check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`WRO frameless display check passed ${cases.length} cases.`);
