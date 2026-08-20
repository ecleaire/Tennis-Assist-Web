import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?full-function-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const failures = [];
const browser = await chromium.launch({ headless: true });

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function baseSettings(overrides = {}) {
  return {
    mode: "timer",
    targetTime: "20:30",
    showTarget: true,
    showHourMinute: true,
    showCurrentTime: true,
    currentTimeLabel: "現在時刻",
    completionMessages: ["お疲れ様でした"],
    completionText: "お疲れ様でした",
    completionMessageIntervalSec: 10,
    completionDurationMin: 30,
    autoWroEnabled: false,
    autoWroDuringCompletion: false,
    noiseStrength: 0,
    noiseIntervalMin: 0,
    alarmEnabled: false,
    backgroundStyle: "solid",
    backgroundStrength: 0,
    backgroundGuides: false,
    backgroundScanlines: false,
    ...overrides
  };
}

async function installSettings(page, settings) {
  await page.addInitScript(({ key, value }) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, { key: SETTINGS_KEY, value: settings });
}

function captureRuntimeErrors(page, label) {
  const errors = [];
  page.on("pageerror", error => errors.push(`pageerror ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") errors.push(`console ${message.text()}`);
  });
  return () => failures.push(...errors.map(error => `${label}: ${error}`));
}

async function waitForDisplay(page) {
  await page.waitForFunction(() => {
    const value = document.getElementById("mainValue")?.textContent || "";
    return value && !value.includes("--");
  }, { timeout: 15_000 });
  await page.waitForTimeout(220);
}

async function inspectLayout(page) {
  return page.evaluate(() => {
    const app = document.getElementById("app");
    const rect = selector => {
      const value = document.querySelector(selector)?.getBoundingClientRect();
      return value
        ? {
            left: value.left,
            top: value.top,
            right: value.right,
            bottom: value.bottom,
            width: value.width,
            height: value.height
          }
        : null;
    };

    return {
      phase: app?.dataset.timerPhase || "",
      activeDisplay: app?.dataset.activeDisplay || "",
      theme: app?.dataset.theme || "",
      mainValue: document.getElementById("mainValue")?.textContent || "",
      modeLabel: document.getElementById("modeLabel")?.textContent || "",
      targetLabel: document.getElementById("targetLabel")?.textContent || "",
      clockPosition: document.getElementById("currentBlock")?.dataset.position || "",
      displayPosition: document.getElementById("display")?.dataset.position || "",
      currentHidden: document.getElementById("currentBlock")?.hidden || false,
      documentWidth: document.documentElement.scrollWidth,
      documentHeight: document.documentElement.scrollHeight,
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      mainRect: rect("#mainValue"),
      displayRect: rect("#display")
    };
  });
}

function assertInViewport(state, label) {
  expect(
    state.documentWidth <= state.viewportWidth + 2 &&
    state.bodyWidth <= state.viewportWidth + 2,
    `${label}: horizontal document overflow ` +
      `${state.documentWidth}/${state.bodyWidth}/${state.viewportWidth}`
  );
  expect(
    state.documentHeight <= state.viewportHeight + 2 &&
    state.bodyHeight <= state.viewportHeight + 2,
    `${label}: vertical document overflow ` +
      `${state.documentHeight}/${state.bodyHeight}/${state.viewportHeight}`
  );

  for (const [name, rect] of [
    ["main", state.mainRect],
    ["display", state.displayRect]
  ]) {
    if (!rect) continue;
    expect(
      rect.left >= -3 && rect.top >= -3 &&
      rect.right <= state.viewportWidth + 3 &&
      rect.bottom <= state.viewportHeight + 3,
      `${label}: ${name} outside viewport ${JSON.stringify(rect)}`
    );
  }
}

async function setCheckbox(page, id, checked) {
  await page.evaluate(({ inputId, next }) => {
    const input = document.getElementById(inputId);
    input.checked = next;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, { inputId: id, next: checked });
}

async function setInput(page, id, value, eventType = "change") {
  await page.evaluate(({ inputId, next, type }) => {
    const input = document.getElementById(inputId);
    input.value = String(next);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    if (type === "change") {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, { inputId: id, next: value, type: eventType });
}

async function openAdvanced(page) {
  await page.click("#gear");
  await page.waitForFunction(() =>
    document.getElementById("overlay")?.classList.contains("open"));
  const details = page.locator("#advancedSettingsAccordion");
  if (!(await details.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open);
}

async function waitStored(page, predicate, description) {
  try {
    await page.waitForFunction(({ key, source }) => {
      const settings = JSON.parse(localStorage.getItem(key) || "{}");
      return Function("settings", `return (${source});`)(settings);
    }, { key: SETTINGS_KEY, source: predicate }, { timeout: 15_000 });
  } catch (error) {
    const actual = await page.evaluate(key =>
      JSON.parse(localStorage.getItem(key) || "{}"), SETTINGS_KEY);
    failures.push(
      `${description}: timed out with ${JSON.stringify(actual)} ` +
      `(${error.message})`
    );
  }
}

// 1. Default timer layout on representative devices.
for (const [name, width, height] of [
  ["phone-portrait", 320, 568],
  ["phone-landscape", 568, 320],
  ["notebook", 1366, 768],
  ["desktop", 1920, 1080]
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const flushErrors = captureRuntimeErrors(page, name);
  await page.clock.install({ time: new Date("2026-08-20T10:00:00.000Z") });
  await installSettings(page, baseSettings());

  try {
    await page.goto(`${BASE_URL}&layout=${name}`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await waitForDisplay(page);
    const state = await inspectLayout(page);
    expect(state.phase === "countdown", `${name}: phase is ${state.phase}`);
    expect(state.activeDisplay === "timer",
      `${name}: active display is ${state.activeDisplay}`);
    expect(/^\d{2}:\d{2}:\d{2}$/.test(state.mainValue),
      `${name}: timer value is ${state.mainValue}`);
    expect(state.targetLabel.includes("20:30"),
      `${name}: target label is ${state.targetLabel}`);
    if (width >= 1000) {
      expect(state.clockPosition === "top-right",
        `${name}: clock position is ${state.clockPosition}`);
      expect(state.displayPosition === "center",
        `${name}: timer position is ${state.displayPosition}`);
    }
    assertInViewport(state, name);
  } catch (error) {
    failures.push(`${name}: ${error.stack || error.message}`);
  }

  flushErrors();
  await context.close();
}

// 2. Exercise representative settings, save them and reload them.
{
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const flushErrors = captureRuntimeErrors(page, "settings-flow");
  await page.clock.install({ time: new Date("2026-08-20T10:00:00.000Z") });
  await installSettings(page, baseSettings());

  try {
    await page.goto(`${BASE_URL}&settings-flow=1`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await waitForDisplay(page);
    await openAdvanced(page);

    await setCheckbox(page, "themeLight", true);
    await page.selectOption("#backgroundStyle", "spotlight");
    await setCheckbox(page, "backgroundUseThemeColors", false);
    await setInput(page, "backgroundBaseHex", "#112233");
    await setInput(page, "backgroundAccentHex", "#44aacc");
    await setInput(page, "backgroundStrengthRange", 35, "input");

    await setInput(page, "targetTime", "21:15");
    await setInput(page, "currentTimeLabelInput", "会場現在時刻", "input");
    await setInput(
      page,
      "timerTextInput",
      "競技終了まで {残り時間}",
      "input"
    );
    await setInput(page, "clockSizeRange", 82, "input");
    await setInput(page, "timerSizeRange", 164, "input");
    await setInput(page, "completionTextSizeRange", 138, "input");
    await setInput(page, "noiseRange", 42, "input");
    await page.selectOption("#noisePattern", "grid");
    await setInput(page, "noiseInterval", 2.5);
    await setInput(page, "volumeRange", 58, "input");

    const alternateSound = await page.evaluate(() => {
      const select = document.getElementById("soundType");
      return [...select.options]
        .map(option => option.value)
        .find(value => value && value !== "bell" && value !== "custom");
    });
    if (alternateSound) await page.selectOption("#soundType", alternateSound);

    await page.evaluate(() => {
      const choose = (name, value) => {
        const input = document.querySelector(
          `input[name="${name}"][value="${value}"]`
        );
        input.checked = true;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      choose("clockPosition", "bottom-left");
      choose("timerPosition", "middle-right");
    });
    await setInput(page, "clockOffsetX", 12);
    await setInput(page, "clockOffsetY", -8);
    await setInput(page, "timerOffsetX", -16);
    await setInput(page, "timerOffsetY", 9);

    await page.fill("#completionTextInput", "本日の進行は終了しました");
    await page.click("#addCompletionMessage");
    await page.fill("#completionTextInput2", "ありがとうございました");
    await page.click("#addCompletionMessage");
    await page.fill("#completionTextInput3", "お気をつけてお帰りください");
    await setInput(page, "completionMessageIntervalSec", 9);

    await setCheckbox(page, "alarmEnabled", true);
    await setCheckbox(page, "atTarget", true);
    await setCheckbox(page, "autoWroEnabled", false);

    await waitStored(
      page,
      `settings.targetTime === "21:15" &&
       settings.theme === "light" &&
       settings.backgroundStyle === "spotlight" &&
       settings.backgroundBaseColor === "#112233" &&
       settings.backgroundAccentColor === "#44aacc" &&
       settings.clockSize === 82 &&
       settings.timerSize === 164 &&
       settings.completionTextSize === 138 &&
       settings.noiseStrength === 42 &&
       settings.noisePattern === "grid" &&
       settings.noiseIntervalMin === 2.5 &&
       settings.volume === 58 &&
       settings.clockPosition === "bottom-left" &&
       settings.timerPosition === "middle-right" &&
       settings.completionMessageIntervalSec === 9 &&
       JSON.stringify(settings.completionMessages) ===
         JSON.stringify(["本日の進行は終了しました", "ありがとうございました", "お気をつけてお帰りください"])`,
      "settings-flow persistence"
    );

    await page.evaluate(() => document.getElementById("done").click());
    await page.reload({ waitUntil: "networkidle" });
    await waitForDisplay(page);

    const reloaded = await page.evaluate(key => ({
      settings: JSON.parse(localStorage.getItem(key) || "{}"),
      theme: document.getElementById("app")?.dataset.theme,
      backgroundStyle: document.getElementById("app")
        ?.dataset.backgroundStyle,
      clockPosition: document.getElementById("currentBlock")
        ?.dataset.position,
      displayPosition: document.getElementById("display")?.dataset.position
    }), SETTINGS_KEY);

    expect(reloaded.theme === "light",
      `settings-flow: reloaded theme is ${reloaded.theme}`);
    expect(reloaded.backgroundStyle === "spotlight",
      `settings-flow: background is ${reloaded.backgroundStyle}`);
    expect(reloaded.clockPosition === "bottom-left",
      `settings-flow: clock position is ${reloaded.clockPosition}`);
    expect(reloaded.displayPosition === "middle-right",
      `settings-flow: display position is ${reloaded.displayPosition}`);
    expect(reloaded.settings.completionMessages?.length === 3,
      `settings-flow: message count is ` +
      `${reloaded.settings.completionMessages?.length}`);

    await page.click("#gear");
    await setCheckbox(page, "modeWro", true);
    await page.waitForFunction(() =>
      document.getElementById("app")?.dataset.activeDisplay === "wro");
    const wro = await inspectLayout(page);
    expect(wro.modeLabel.includes("WRO JAPAN FINAL"),
      `settings-flow: WRO label is ${wro.modeLabel}`);
    await setCheckbox(page, "modeTimer", true);
    await page.waitForFunction(() =>
      document.getElementById("app")?.dataset.activeDisplay === "timer");
  } catch (error) {
    failures.push(`settings-flow: ${error.stack || error.message}`);
  }

  flushErrors();
  await context.close();
}

// 3. Completion messages loop and then hand over to the next daily timer.
{
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const flushErrors = captureRuntimeErrors(page, "completion-flow");
  await page.clock.install({ time: new Date("2026-08-20T11:30:00.500Z") });
  await installSettings(page, baseSettings({
    completionMessages: ["A", "B", "C"],
    completionText: "A",
    completionMessageIntervalSec: 2,
    completionDurationMin: 1
  }));

  try {
    await page.goto(`${BASE_URL}&completion-flow=1`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await page.waitForFunction(() =>
      document.getElementById("app")?.dataset.timerPhase === "completion");

    const expected = [
      ["A", 0],
      ["B", 1],
      ["C", 2],
      ["A", 0]
    ];
    for (let index = 0; index < expected.length; index += 1) {
      if (index) await page.clock.runFor(2_000);
      const state = await page.evaluate(() => ({
        text: document.getElementById("mainValue")?.textContent,
        index: Number(document.getElementById("app")
          ?.dataset.completionMessageIndex)
      }));
      expect(
        state.text === expected[index][0] &&
        state.index === expected[index][1],
        `completion-flow: step ${index} is ${JSON.stringify(state)}`
      );
    }

    await page.clock.runFor(55_000);
    await page.waitForFunction(() =>
      document.getElementById("app")?.dataset.timerPhase === "countdown");
    const after = await inspectLayout(page);
    expect(/^\d{2}:\d{2}:\d{2}$/.test(after.mainValue),
      `completion-flow: next timer is ${after.mainValue}`);
    assertInViewport(after, "completion-flow");
  } catch (error) {
    failures.push(`completion-flow: ${error.stack || error.message}`);
  }

  flushErrors();
  await context.close();
}

// 4. Automatic WRO display returns to both countdown and completion modes.
for (const testCase of [
  {
    name: "auto-wro-countdown",
    time: "2026-08-20T10:00:00.000Z",
    settings: baseSettings({
      autoWroEnabled: true,
      autoWroIntervalMin: 1,
      autoWroDurationMin: 0.1
    }),
    returnPhase: "countdown"
  },
  {
    name: "auto-wro-completion",
    time: "2026-08-20T11:30:00.500Z",
    settings: baseSettings({
      completionMessages: ["A", "B", "C"],
      completionText: "A",
      completionMessageIntervalSec: 5,
      completionDurationMin: 2,
      autoWroEnabled: true,
      autoWroDuringCompletion: true,
      autoWroIntervalMin: 1,
      autoWroDurationMin: 0.1
    }),
    returnPhase: "completion"
  }
]) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const flushErrors = captureRuntimeErrors(page, testCase.name);
  await page.clock.install({ time: new Date(testCase.time) });
  await installSettings(page, testCase.settings);

  try {
    await page.goto(`${BASE_URL}&case=${testCase.name}`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await waitForDisplay(page);
    await page.clock.runFor(60_100);
    await page.waitForFunction(() =>
      document.getElementById("app")?.dataset.activeDisplay === "wro");
    const during = await inspectLayout(page);
    expect(during.modeLabel.includes("WRO JAPAN FINAL"),
      `${testCase.name}: label is ${during.modeLabel}`);
    const footerStatus = await page.evaluate(() =>
      document.getElementById("status")?.textContent || "");
    expect(footerStatus === "",
      `${testCase.name}: automatic WRO footer is ${footerStatus}`);

    await page.clock.runFor(6_100);
    await page.waitForFunction(expected => {
      const app = document.getElementById("app");
      return app?.dataset.activeDisplay === "timer" &&
        app.dataset.timerPhase === expected;
    }, testCase.returnPhase, { timeout: 15_000 });
    const returned = await inspectLayout(page);
    expect(returned.phase === testCase.returnPhase,
      `${testCase.name}: returned phase is ${returned.phase}`);
    assertInViewport(returned, testCase.name);
  } catch (error) {
    failures.push(`${testCase.name}: ${error.stack || error.message}`);
  }

  flushErrors();
  await context.close();
}

// 5. Direct WRO mode remains usable independently of timer mode.
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const flushErrors = captureRuntimeErrors(page, "direct-wro");
  await page.clock.install({ time: new Date("2026-08-21T00:00:00.000Z") });
  await installSettings(page, baseSettings({ mode: "wro" }));

  try {
    await page.goto(`${BASE_URL}&direct-wro=1`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await waitForDisplay(page);
    const state = await inspectLayout(page);
    expect(state.activeDisplay === "wro",
      `direct-wro: active display is ${state.activeDisplay}`);
    expect(state.modeLabel.includes("WRO JAPAN FINAL"),
      `direct-wro: mode label is ${state.modeLabel}`);
    expect(/DAYS|DAY|START/.test(state.mainValue),
      `direct-wro: main value is ${state.mainValue}`);
    assertInViewport(state, "direct-wro");
  } catch (error) {
    failures.push(`direct-wro: ${error.stack || error.message}`);
  }

  flushErrors();
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO full function audit failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO full function audit passed layouts, settings, persistence, mode switching, completion sequencing, next-day handoff, automatic WRO returns, and direct WRO mode."
);
