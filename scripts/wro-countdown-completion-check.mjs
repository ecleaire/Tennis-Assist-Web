import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?completion-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const NOW_KEY = "wro-countdown-completion-test-now";

const settings = {
  mode: "timer",
  targetTime: "20:30",
  showTarget: true,
  showHourMinute: true,
  timerText: "",
  completionText: "お疲れ様でした",
  completionMessages: ["お疲れ様でした"],
  completionMessageIntervalSec: 10,
  completionDurationMin: 30,
  showCurrentTime: true,
  currentTimeLabel: "現在時刻",
  wroTitleSize: 30,
  wroDateSuffix: "",
  wroDateSuffixSize: 22,
  theme: "dark",
  backgroundStyle: "solid",
  backgroundUseThemeColors: true,
  backgroundBaseColor: "#020405",
  backgroundAccentColor: "#56d1e7",
  backgroundStrength: 0,
  backgroundGuides: false,
  backgroundScanlines: false,
  autoSize: false,
  clockSize: 64,
  dateSize: 16,
  timerSize: 116,
  completionTextSize: 96,
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
  autoWroEnabled: true,
  autoWroIntervalMin: 1,
  autoWroDurationMin: 1,
  alarmEnabled: false,
  atTarget: true,
  leadTimes: [5, 10, 30, 60],
  volume: 70,
  soundType: "bell",
  fileName: ""
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  colorScheme: "dark",
  reducedMotion: "reduce"
});
const page = await context.newPage();
const failures = [];

page.on("pageerror", error => failures.push(`pageerror: ${error.message}`));
page.on("console", message => {
  if (message.type() === "error") failures.push(`console: ${message.text()}`);
});

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function setNow(iso) {
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, String(Date.parse(value)));
  }, { key: NOW_KEY, value: iso });
  await page.waitForTimeout(500);
}

async function displayState() {
  return page.evaluate(key => ({
    phase: document.getElementById("app")?.dataset.timerPhase,
    activeDisplay: document.getElementById("app")?.dataset.activeDisplay,
    modeLabel: document.getElementById("modeLabel")?.textContent,
    targetLabel: document.getElementById("targetLabel")?.textContent,
    mainValue: document.getElementById("mainValue")?.textContent,
    subValue: document.getElementById("subValue")?.textContent,
    status: document.getElementById("status")?.textContent,
    completionTextVariable: document.getElementById("app")?.style
      .getPropertyValue("--completionText").trim(),
    completionTextFit: document.getElementById("app")?.style
      .getPropertyValue("--completionTextFit").trim(),
    stored: JSON.parse(localStorage.getItem(key) || "{}")
  }), SETTINGS_KEY);
}

try {
  await page.addInitScript(({ settingsKey, nowKey, storedSettings, initialNow }) => {
    if (!localStorage.getItem(settingsKey)) {
      localStorage.setItem(settingsKey, JSON.stringify(storedSettings));
    }
    if (!localStorage.getItem(nowKey)) {
      localStorage.setItem(nowKey, String(Date.parse(initialNow)));
    }

    const RealDate = Date;
    const currentNow = () => {
      const value = Number(localStorage.getItem(nowKey));
      return Number.isFinite(value) ? value : RealDate.parse(initialNow);
    };

    class FixedDate extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : [currentNow()]));
      }
      static now() {
        return currentNow();
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
    settingsKey: SETTINGS_KEY,
    nowKey: NOW_KEY,
    storedSettings: settings,
    initialNow: "2026-08-20T11:29:50.000Z"
  });

  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(() => {
    const value = document.getElementById("mainValue")?.textContent || "";
    return value && !value.includes("--");
  }, { timeout: 15_000 });
  await page.waitForTimeout(300);

  let state = await displayState();
  expect(state.phase === "countdown", `before target phase is ${state.phase}`);
  expect(state.mainValue === "00:00:10",
    `before target countdown is ${state.mainValue}`);
  expect(state.modeLabel === "COUNTDOWN TIMER",
    `before target label is ${state.modeLabel}`);

  await setNow("2026-08-20T11:30:10.000Z");
  state = await displayState();
  expect(state.phase === "completion", `completion phase is ${state.phase}`);
  expect(state.activeDisplay === "timer",
    `completion active display is ${state.activeDisplay}`);
  expect(state.mainValue === "お疲れ様でした",
    `default completion text is ${state.mainValue}`);
  expect(state.modeLabel === "TIMER COMPLETE",
    `completion mode label is ${state.modeLabel}`);
  expect(state.targetLabel === "20:30 終了",
    `completion target label is ${state.targetLabel}`);
  expect(state.subValue.includes("00:29:50"),
    `completion switch countdown is ${state.subValue}`);
  expect(state.status.includes("次の20:30までのタイマーを開始"),
    `completion status is ${state.status}`);

  await setNow("2026-08-20T11:59:59.000Z");
  state = await displayState();
  expect(state.phase === "completion",
    `one second before transition phase is ${state.phase}`);
  expect(state.subValue.includes("00:00:01"),
    `one second before transition text is ${state.subValue}`);

  await setNow("2026-08-20T12:00:00.000Z");
  state = await displayState();
  expect(state.phase === "countdown",
    `after 30 minutes phase is ${state.phase}`);
  expect(state.mainValue === "23:30:00",
    `next-day countdown is ${state.mainValue}`);
  expect(state.modeLabel === "COUNTDOWN TIMER",
    `next-day mode label is ${state.modeLabel}`);

  // Opening the page during the completion window must restore the message
  // rather than immediately showing a nearly 24-hour countdown.
  await setNow("2026-08-20T11:45:00.000Z");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.getElementById("app")?.dataset.timerPhase === "completion",
    { timeout: 15_000 }
  );
  state = await displayState();
  expect(state.mainValue === "お疲れ様でした",
    `reload during completion shows ${state.mainValue}`);

  // Check the detailed settings and live customization while still inside a
  // custom five-minute completion window.
  await setNow("2026-08-20T11:34:00.000Z");
  await page.click("#gear");
  const advanced = page.locator("#advancedSettingsAccordion");
  if (!(await advanced.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open
  );

  const missing = await page.evaluate(() => [
    "completionTextInput",
    "completionDurationMin",
    "completionTextSizeRange",
    "completionTextSize"
  ].filter(id => !document.getElementById(id)));
  expect(missing.length === 0,
    `missing completion controls: ${missing.join(", ")}`);

  await page.fill("#completionTextInput", "本日の進行は終了しました");
  await page.waitForTimeout(180);
  await page.fill("#completionDurationMin", "5");
  await page.dispatchEvent("#completionDurationMin", "change");
  await page.fill("#completionTextSize", "150");
  await page.dispatchEvent("#completionTextSize", "change");
  await page.waitForTimeout(350);

  state = await displayState();
  expect(state.phase === "completion",
    `custom completion phase is ${state.phase}`);
  expect(state.mainValue === "本日の進行は終了しました",
    `custom completion text is ${state.mainValue}`);
  expect(state.completionTextVariable === "150px",
    `completion text size variable is ${state.completionTextVariable}`);
  expect(state.stored.completionText === "本日の進行は終了しました",
    "custom completion text alias was not saved");
  expect(
    JSON.stringify(state.stored.completionMessages) ===
      JSON.stringify(["本日の進行は終了しました"]),
    `custom completion message array is ` +
      `${JSON.stringify(state.stored.completionMessages)}`
  );
  expect(state.stored.completionDurationMin === 5,
    `completion duration saved as ${state.stored.completionDurationMin}`);
  expect(state.stored.completionTextSize === 150,
    `completion text size saved as ${state.stored.completionTextSize}`);

  await page.evaluate(() => document.getElementById("done").click());
  await setNow("2026-08-20T11:35:00.000Z");
  state = await displayState();
  expect(state.phase === "countdown",
    `custom 5-minute transition phase is ${state.phase}`);
  expect(state.mainValue === "23:55:00",
    `custom 5-minute next countdown is ${state.mainValue}`);

  // A target near midnight must retain its completion message after the JST
  // date changes, then begin the same day's next-target countdown.
  await page.evaluate(({ settingsKey, nowKey }) => {
    const stored = JSON.parse(localStorage.getItem(settingsKey) || "{}");
    const message = "夜間作業お疲れ様でした";
    localStorage.setItem(settingsKey, JSON.stringify({
      ...stored,
      targetTime: "23:50",
      completionText: message,
      completionMessages: [message],
      completionDurationMin: 30
    }));
    localStorage.setItem(
      nowKey,
      String(Date.parse("2026-08-20T15:05:00.000Z"))
    );
  }, { settingsKey: SETTINGS_KEY, nowKey: NOW_KEY });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.getElementById("app")?.dataset.timerPhase === "completion",
    { timeout: 15_000 }
  );
  state = await displayState();
  expect(state.mainValue === "夜間作業お疲れ様でした",
    `cross-midnight completion text is ${state.mainValue}`);
  expect(state.subValue.includes("00:15:00"),
    `cross-midnight completion remaining is ${state.subValue}`);

  await setNow("2026-08-20T15:20:00.000Z");
  state = await displayState();
  expect(state.phase === "countdown",
    `cross-midnight transition phase is ${state.phase}`);
  expect(state.mainValue === "23:30:00",
    `cross-midnight next countdown is ${state.mainValue}`);
} catch (error) {
  failures.push(error.stack || error.message);
}

await context.close();
await browser.close();

if (failures.length) {
  console.error("WRO timer completion check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("WRO timer completion message and next-day transition check passed.");
