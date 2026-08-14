import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/app.html?layout-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const ARTIFACT_DIR = "artifacts/wro-countdown-layout";

const viewports = [
  ["phone-320x568", 320, 568],
  ["phone-360x640", 360, 640],
  ["phone-390x844", 390, 844],
  ["phone-430x932", 430, 932],
  ["phone-landscape-568x320", 568, 320],
  ["phone-landscape-667x375", 667, 375],
  ["phone-landscape-844x390", 844, 390],
  ["phone-landscape-932x430", 932, 430],
  ["compact-landscape-1024x600", 1024, 600],
  ["projector-1024x768", 1024, 768],
  ["laptop-1280x720", 1280, 720],
  ["laptop-1366x768", 1366, 768],
  ["laptop-1440x900", 1440, 900],
  ["laptop-1536x864", 1536, 864],
  ["desktop-1920x1080", 1920, 1080],
  ["desktop-1920x1200", 1920, 1200],
  ["qhd-2560x1440", 2560, 1440],
  ["ultrawide-3440x1440", 3440, 1440],
  ["uhd-3840x2160", 3840, 2160]
].map(([name, width, height]) => ({ name, width, height }));

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

const scenarios = [
  {
    name: "timer-default",
    settings: { ...defaults }
  },
  {
    name: "wro-default",
    settings: {
      ...defaults,
      mode: "wro",
      wroDateSuffix: "Japan決勝大会"
    }
  },
  {
    name: "timer-max-content-same-anchor",
    settings: {
      ...defaults,
      currentTimeLabel: "ただいまの会場現在時刻",
      timerText: "競技終了予定の20:30まで残り {残り時間}\n安全に競技を進行してください",
      clockSize: 280,
      timerSize: 520,
      targetSize: 180,
      subSize: 140,
      timerTextSize: 180,
      clockPosition: "top-right",
      timerPosition: "top-right",
      clockOffsetX: 0,
      clockOffsetY: 0,
      timerOffsetX: 0,
      timerOffsetY: 0
    }
  },
  {
    name: "wro-max-content-same-anchor",
    settings: {
      ...defaults,
      mode: "wro",
      currentTimeLabel: "ただいまの会場現在時刻",
      wroTitleSize: 180,
      targetSize: 180,
      wroDateSuffixSize: 140,
      wroDateSuffix: "WRO Japan決勝大会 開幕まで\n選手・スタッフ集合時刻にご注意ください",
      timerSize: 520,
      subSize: 140,
      clockSize: 280,
      clockPosition: "bottom-right",
      wroPosition: "bottom-right",
      clockOffsetX: 0,
      clockOffsetY: 0,
      wroOffsetX: 0,
      wroOffsetY: 0
    }
  },
  {
    name: "extreme-offsets",
    settings: {
      ...defaults,
      clockPosition: "top-left",
      timerPosition: "bottom-right",
      clockOffsetX: -1000,
      clockOffsetY: -1000,
      timerOffsetX: 1000,
      timerOffsetY: 1000,
      timerSize: 420,
      clockSize: 220
    }
  },
  {
    name: "current-time-hidden",
    settings: {
      ...defaults,
      showCurrentTime: false,
      timerPosition: "center",
      timerSize: 520,
      targetSize: 120,
      subSize: 90
    }
  }
];

function overlapArea(a, b) {
  const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return width * height;
}

function slug(value) {
  return value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
}

async function inspectLayout(page, viewport, scenario) {
  return page.evaluate(({ width, height, scenarioName }) => {
    const tolerance = 2;
    const visible = element => {
      if (!element || element.hidden) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" &&
        Number(style.opacity || 1) > 0 && rect.width > 0 && rect.height > 0;
    };
    const record = (name, selector) => {
      const element = document.querySelector(selector);
      if (!visible(element)) return null;
      const rect = element.getBoundingClientRect();
      return {
        name,
        selector,
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    };

    const rects = [
      record("current time", "#currentBlock"),
      record("countdown", "#display"),
      record("top actions", ".topActions"),
      record("footer", "#foot")
    ].filter(Boolean);

    const textRects = [
      record("current-time label", "#currentTimeLabel"),
      record("clock", "#clock"),
      record("date", "#date"),
      record("mode label", "#modeLabel"),
      record("target label", "#targetLabel"),
      record("WRO suffix", "#wroSuffix"),
      record("timer text", "#timerText"),
      record("main value", "#mainValue"),
      record("sub value", "#subValue")
    ].filter(Boolean);

    const failures = [];
    for (const rect of [...rects, ...textRects]) {
      if (rect.left < -tolerance || rect.top < -tolerance ||
          rect.right > width + tolerance || rect.bottom > height + tolerance) {
        failures.push(
          `${rect.name} is outside the viewport: ` +
          `${Math.round(rect.left)},${Math.round(rect.top)}-` +
          `${Math.round(rect.right)},${Math.round(rect.bottom)}`
        );
      }
    }

    const byName = Object.fromEntries(rects.map(rect => [rect.name, rect]));
    const allowedOverlap = 8;
    const pairs = [
      ["current time", "countdown"],
      ["current time", "top actions"],
      ["countdown", "top actions"],
      ["current time", "footer"],
      ["countdown", "footer"]
    ];
    for (const [first, second] of pairs) {
      const a = byName[first];
      const b = byName[second];
      if (!a || !b) continue;
      const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
      const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      if (overlapWidth > allowedOverlap && overlapHeight > allowedOverlap) {
        failures.push(
          `${first} overlaps ${second} by ` +
          `${Math.round(overlapWidth)}x${Math.round(overlapHeight)}px`
        );
      }
    }

    const main = document.querySelector("#mainValue");
    if (visible(main)) {
      const style = getComputedStyle(main);
      if (style.whiteSpace !== "nowrap") {
        failures.push("main countdown is allowed to wrap");
      }
    }

    const rootOverflow = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth
    ) - width;
    if (rootOverflow > tolerance) {
      failures.push(`document has ${Math.round(rootOverflow)}px horizontal overflow`);
    }

    return {
      scenarioName,
      failures,
      rects,
      textRects,
      viewport: { width, height },
      activeDisplay: document.querySelector("#app")?.dataset.activeDisplay || "",
      profile: document.querySelector("#app")?.dataset.viewportProfile || ""
    };
  }, { width: viewport.width, height: viewport.height, scenarioName: scenario.name });
}

async function inspectSettingsDialog(page, viewport) {
  await page.click("#gear");
  await page.waitForFunction(() => document.querySelector("#overlay")?.classList.contains("open"));
  const result = await page.evaluate(({ width, height }) => {
    const panel = document.querySelector(".panel");
    const rect = panel.getBoundingClientRect();
    const requiredIds = [
      "modeTimer", "modeWro", "targetTime", "showTarget",
      "showHourMinute", "timerTextInput", "showCurrentTime",
      "currentTimeLabelInput", "wroDateSuffixInput", "autoSize",
      "clockSizeRange", "clockSize", "timerSizeRange", "timerSize",
      "wroTitleSizeRange", "wroTitleSize", "wroDateSuffixSizeRange",
      "wroDateSuffixSize", "noisePreview", "testSound", "done"
    ];
    const missing = requiredIds.filter(id => !document.getElementById(id));
    const failures = [];
    if (missing.length) failures.push(`missing settings controls: ${missing.join(", ")}`);
    if (rect.left < -2 || rect.right > width + 2 || rect.top < -2 || rect.bottom > height + 2) {
      failures.push(
        `settings panel is outside viewport: ` +
        `${Math.round(rect.left)},${Math.round(rect.top)}-` +
        `${Math.round(rect.right)},${Math.round(rect.bottom)}`
      );
    }
    if (panel.scrollHeight > panel.clientHeight && getComputedStyle(panel).overflowY === "visible") {
      failures.push("settings panel content cannot scroll");
    }
    return { failures, rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom } };
  }, { width: viewport.width, height: viewport.height });
  await page.click("#done");
  return result;
}

await mkdir(ARTIFACT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];
const results = [];

for (const viewport of viewports) {
  for (const scenario of scenarios) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      colorScheme: "dark",
      reducedMotion: "reduce"
    });
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on("pageerror", error => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", message => {
      if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on("requestfailed", request => {
      runtimeErrors.push(`request failed: ${request.url()} (${request.failure()?.errorText || "unknown"})`);
    });
    page.on("response", response => {
      if (response.status() >= 400) {
        runtimeErrors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    await page.addInitScript(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    }, { key: SETTINGS_KEY, value: scenario.settings });

    let result;
    try {
      await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
      await page.waitForFunction(() => {
        const main = document.querySelector("#mainValue")?.textContent || "";
        const clock = document.querySelector("#clock")?.textContent || "";
        return main && !main.includes("--") &&
          (document.querySelector("#currentBlock")?.hidden || (clock && !clock.includes("--")));
      }, { timeout: 15_000 });
      await page.waitForTimeout(300);

      result = await inspectLayout(page, viewport, scenario);
      result.failures.push(...runtimeErrors);

      if (scenario.name === "timer-default") {
        const dialog = await inspectSettingsDialog(page, viewport);
        result.dialog = dialog;
        result.failures.push(...dialog.failures);
      }
    } catch (error) {
      result = {
        scenarioName: scenario.name,
        viewport,
        failures: [`audit execution failed: ${error.stack || error.message}`, ...runtimeErrors]
      };
    }

    results.push({ viewport: viewport.name, ...result });
    if (result.failures.length) {
      const imagePath = `${ARTIFACT_DIR}/${slug(viewport.name)}--${slug(scenario.name)}.png`;
      await page.screenshot({ path: imagePath, fullPage: false }).catch(() => {});
      failures.push({ viewport: viewport.name, scenario: scenario.name, failures: result.failures, imagePath });
    }

    await context.close();
  }
}

await browser.close();
await writeFile(
  `${ARTIFACT_DIR}/report.json`,
  JSON.stringify({ generatedAt: new Date().toISOString(), failures, results }, null, 2)
);

if (failures.length) {
  console.error(`WRO countdown layout audit found ${failures.length} failing scenarios.`);
  for (const failure of failures) {
    console.error(`\n[${failure.viewport} / ${failure.scenario}]`);
    for (const message of failure.failures) console.error(`- ${message}`);
    console.error(`- screenshot: ${failure.imagePath}`);
  }
  process.exit(1);
}

console.log(`WRO countdown layout audit passed ${viewports.length * scenarios.length} scenarios.`);
