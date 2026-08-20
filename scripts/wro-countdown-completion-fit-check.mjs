import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?completion-fit-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const COMPLETION_NOW = new Date("2026-08-20T11:30:10.000Z");

const viewports = [
  ["phone-320x568", 320, 568],
  ["phone-390x844", 390, 844],
  ["phone-landscape-568x320", 568, 320],
  ["phone-landscape-844x390", 844, 390],
  ["compact-1024x600", 1024, 600],
  ["notebook-1366x768", 1366, 768],
  ["desktop-1920x1080", 1920, 1080],
  ["ultrawide-3440x1440", 3440, 1440]
].map(([name, width, height]) => ({ name, width, height }));

const scenarios = [
  {
    name: "default-message",
    text: "お疲れ様でした",
    size: 96,
    autoSize: true
  },
  {
    name: "maximum-manual-size",
    text: "本日の競技運営はすべて終了しました\n選手・スタッフの皆さま、本当にお疲れ様でした",
    size: 320,
    autoSize: false
  },
  {
    name: "long-unbroken-message",
    text: "本日の全競技ならびに会場運営は終了しました選手スタッフ関係者の皆さま長時間にわたり本当にお疲れ様でしたありがとうございました",
    size: 320,
    autoSize: true
  }
];

const baseSettings = {
  mode: "timer",
  targetTime: "20:30",
  completionDurationMin: 30,
  showTarget: true,
  showHourMinute: true,
  showCurrentTime: true,
  currentTimeLabel: "現在時刻",
  clockPosition: "top-right",
  timerPosition: "center",
  autoWroEnabled: false,
  autoWroDuringCompletion: false,
  noiseStrength: 0,
  noiseIntervalMin: 0,
  alarmEnabled: false,
  backgroundStyle: "solid",
  backgroundStrength: 0,
  backgroundGuides: false,
  backgroundScanlines: false
};

const browser = await chromium.launch({ headless: true });
const failures = [];
const defaultFontSizes = new Map();

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function rectInside(rect, width, height, tolerance = 2) {
  return rect.left >= -tolerance &&
    rect.top >= -tolerance &&
    rect.right <= width + tolerance &&
    rect.bottom <= height + tolerance;
}

async function inspect(page) {
  return page.evaluate(() => {
    const elementRect = element => {
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    };

    const visible = element => {
      if (!element || element.hidden) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0 &&
        rect.width > 0 && rect.height > 0;
    };

    const app = document.getElementById("app");
    const display = document.getElementById("display");
    const main = document.getElementById("mainValue");
    const visibleChildren = [...display.children].filter(visible);
    const childRects = visibleChildren.map(elementRect);
    const blockRect = childRects.length
      ? {
          left: Math.min(...childRects.map(rect => rect.left)),
          top: Math.min(...childRects.map(rect => rect.top)),
          right: Math.max(...childRects.map(rect => rect.right)),
          bottom: Math.max(...childRects.map(rect => rect.bottom))
        }
      : elementRect(display);

    return {
      phase: app.dataset.timerPhase,
      fitStatus: app.dataset.completionFit,
      fitSize: Number(app.dataset.completionFitSize),
      text: main.textContent,
      fontSize: Number.parseFloat(getComputedStyle(main).fontSize),
      maxWidthVariable: app.style
        .getPropertyValue("--completionTextMaxWidth").trim(),
      mainRect: elementRect(main),
      displayRect: elementRect(display),
      blockRect,
      mainScrollWidth: main.scrollWidth,
      mainClientWidth: main.clientWidth,
      mainScrollHeight: main.scrollHeight,
      mainClientHeight: main.clientHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      documentScrollHeight: document.documentElement.scrollHeight,
      bodyScrollWidth: document.body.scrollWidth,
      bodyScrollHeight: document.body.scrollHeight
    };
  });
}

for (const viewport of viewports) {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: "dark",
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const label = `${viewport.name}/${scenario.name}`;

    page.on("pageerror", error =>
      failures.push(`${label}: pageerror ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") {
        failures.push(`${label}: console ${message.text()}`);
      }
    });

    await page.clock.install({ time: COMPLETION_NOW });
    await page.addInitScript(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    }, {
      key: SETTINGS_KEY,
      value: {
        ...baseSettings,
        completionText: scenario.text,
        completionTextSize: scenario.size,
        autoSize: scenario.autoSize
      }
    });

    try {
      await page.goto(
        `${BASE_URL}&viewport=${viewport.name}&scenario=${scenario.name}`,
        { waitUntil: "networkidle", timeout: 45_000 }
      );
      await page.waitForFunction(() => {
        const app = document.getElementById("app");
        return app?.dataset.timerPhase === "completion" &&
          app?.dataset.completionFit &&
          app.dataset.completionFit !== "inactive";
      }, { timeout: 15_000 });
      await page.waitForTimeout(300);

      const state = await inspect(page);
      expect(state.phase === "completion",
        `${label}: phase is ${state.phase}`);
      expect(state.text === scenario.text,
        `${label}: text was changed or clipped in the DOM`);
      expect(state.fitStatus === "fitted",
        `${label}: fit status is ${state.fitStatus}`);
      expect(Number.isFinite(state.fontSize) && state.fontSize >= 7.5,
        `${label}: invalid font size ${state.fontSize}`);
      expect(state.maxWidthVariable.endsWith("px"),
        `${label}: completion max width was not set`);
      expect(rectInside(
        state.mainRect,
        viewport.width,
        viewport.height
      ), `${label}: completion text is outside viewport ` +
        `${JSON.stringify(state.mainRect)}`);
      expect(rectInside(
        state.blockRect,
        viewport.width,
        viewport.height
      ), `${label}: completion block is outside viewport ` +
        `${JSON.stringify(state.blockRect)}`);
      expect(
        state.mainScrollWidth <= state.mainClientWidth + 1,
        `${label}: horizontal text overflow ` +
        `${state.mainScrollWidth}/${state.mainClientWidth}`
      );
      expect(
        state.mainScrollHeight <= state.mainClientHeight + 1,
        `${label}: vertical text overflow ` +
        `${state.mainScrollHeight}/${state.mainClientHeight}`
      );
      expect(
        state.documentScrollWidth <= viewport.width + 2 &&
        state.bodyScrollWidth <= viewport.width + 2,
        `${label}: document has horizontal overflow`
      );
      expect(
        state.documentScrollHeight <= viewport.height + 2 &&
        state.bodyScrollHeight <= viewport.height + 2,
        `${label}: document has vertical overflow`
      );

      if (scenario.name === "default-message") {
        defaultFontSizes.set(viewport.name, state.fontSize);
      }
      if (
        scenario.name === "maximum-manual-size" &&
        viewport.width <= 568
      ) {
        expect(state.fontSize < scenario.size,
          `${label}: unsafe 320px setting was not reduced`);
      }
    } catch (error) {
      failures.push(`${label}: ${error.stack || error.message}`);
    }

    await context.close();
  }
}

expect(
  (defaultFontSizes.get("desktop-1920x1080") || 0) >
    (defaultFontSizes.get("phone-390x844") || Infinity),
  "default completion text does not grow on a larger screen"
);
expect(
  (defaultFontSizes.get("phone-390x844") || 0) >
    (defaultFontSizes.get("phone-landscape-568x320") || Infinity),
  "short landscape height did not reduce the completion text"
);

await browser.close();

if (failures.length) {
  console.error("WRO completion text fit check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `WRO completion text fit check passed ` +
  `${viewports.length * scenarios.length} viewport/scenario combinations.`
);
