import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?completion-messages-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const COMPLETION_NOW = new Date("2026-08-20T11:30:02.000Z");
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function importSource(path) {
  const source = await readFile(path, "utf8");
  const encoded = Buffer.from(source).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const {
  MAX_COMPLETION_MESSAGES,
  normalizeCompletionMessages,
  completionMessageAt
} = await importSource("docs/wro-countdown/v2/completion-messages.js");

expect(
  JSON.stringify(normalizeCompletionMessages(null, "旧設定")) ===
    JSON.stringify(["旧設定"]),
  "legacy completionText was not migrated"
);
expect(
  JSON.stringify(normalizeCompletionMessages(
    ["保存済み1", "保存済み2"],
    "お疲れ様でした",
    ["お疲れ様でした"]
  )) === JSON.stringify(["保存済み1", "保存済み2"]),
  "default legacy alias overwrote a saved sequence"
);
expect(
  JSON.stringify(normalizeCompletionMessages(
    ["以前の1", "以前の2"],
    "新しい先頭",
    ["お疲れ様でした"]
  )) === JSON.stringify(["新しい先頭", "以前の2"]),
  "explicit legacy first-message edit was not preserved"
);
expect(
  normalizeCompletionMessages(
    Array.from({ length: 20 }, (_, index) => `M${index + 1}`),
    ""
  ).length === MAX_COMPLETION_MESSAGES,
  "completion message maximum was not enforced"
);

const sequence = ["A", "B", "C"];
expect(completionMessageAt(sequence, 0, 5).text === "A", "0s is not A");
expect(completionMessageAt(sequence, 4999, 5).text === "A", "4.999s is not A");
expect(completionMessageAt(sequence, 5000, 5).text === "B", "5s is not B");
expect(completionMessageAt(sequence, 10000, 5).text === "C", "10s is not C");
expect(completionMessageAt(sequence, 15000, 5).text === "A", "15s did not loop to A");

const browser = await chromium.launch({ headless: true });

async function inspect(page) {
  return page.evaluate(key => {
    const app = document.getElementById("app");
    const stored = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      phase: app?.dataset.timerPhase,
      index: Number(app?.dataset.completionMessageIndex),
      count: Number(app?.dataset.completionMessageCount),
      text: document.getElementById("mainValue")?.textContent || "",
      interval: Number(
        document.getElementById("completionMessageIntervalSec")?.value
      ),
      cardValues: [...document.querySelectorAll(".completionMessageInput")]
        .map(input => input.value),
      cardCount: document.querySelectorAll(".completionMessageCard").length,
      countText: document.getElementById("completionMessageCount")?.textContent || "",
      stored
    };
  }, SETTINGS_KEY);
}

async function waitStored(page, expectedMessages, expectedInterval) {
  try {
    await page.waitForFunction(({ key, messages, interval }) => {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      return JSON.stringify(stored.completionMessages) === JSON.stringify(messages) &&
        stored.completionMessageIntervalSec === interval &&
        stored.completionText === messages[0];
    }, {
      key: SETTINGS_KEY,
      messages: expectedMessages,
      interval: expectedInterval
    }, { timeout: 15_000 });
  } catch (error) {
    const actual = await inspect(page);
    throw new Error(
      `Timed out waiting for ${JSON.stringify(expectedMessages)} / ` +
      `${expectedInterval}. Actual state: ${JSON.stringify(actual)}`,
      { cause: error }
    );
  }
}

const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  colorScheme: "dark",
  reducedMotion: "reduce"
});
const page = await context.newPage();
const runtimeErrors = [];

page.on("pageerror", error => runtimeErrors.push(error.message));
page.on("console", message => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

await page.clock.install({ time: COMPLETION_NOW });
await page.addInitScript(({ key, value }) => {
  localStorage.setItem(key, JSON.stringify(value));
}, {
  key: SETTINGS_KEY,
  value: {
    mode: "timer",
    targetTime: "20:30",
    completionMessages: [
      "お疲れ様でした",
      "ありがとうございました",
      "お気をつけてお帰りください"
    ],
    completionText: "お疲れ様でした",
    completionMessageIntervalSec: 5,
    completionDurationMin: 30,
    completionTextSize: 96,
    autoSize: true,
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

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(() =>
    document.getElementById("app")?.dataset.timerPhase === "completion",
    { timeout: 15_000 }
  );
  await page.waitForTimeout(300);

  let state = await inspect(page);
  expect(state.text === "お疲れ様でした" && state.index === 0 && state.count === 3,
    `initial sequence state is ${JSON.stringify(state)}`);

  await page.clock.runFor(3100);
  state = await inspect(page);
  expect(state.text === "ありがとうございました" && state.index === 1,
    `second message state is ${JSON.stringify(state)}`);

  await page.clock.runFor(5000);
  state = await inspect(page);
  expect(state.text === "お気をつけてお帰りください" && state.index === 2,
    `third message state is ${JSON.stringify(state)}`);

  await page.clock.runFor(5000);
  state = await inspect(page);
  expect(state.text === "お疲れ様でした" && state.index === 0,
    `looped message state is ${JSON.stringify(state)}`);

  await page.click("#gear");
  const advanced = page.locator("#advancedSettingsAccordion");
  if (!(await advanced.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open
  );

  state = await inspect(page);
  expect(state.cardCount === 3,
    `initial editor card count is ${state.cardCount}`);
  expect(state.interval === 5,
    `initial interval control is ${state.interval}`);
  expect(state.countText.includes("3 / 12"),
    `initial count text is ${state.countText}`);

  await page.fill("#completionTextInput", "本日の進行は終了しました");
  await waitStored(page, [
    "本日の進行は終了しました",
    "ありがとうございました",
    "お気をつけてお帰りください"
  ], 5);

  await page.click("#addCompletionMessage");
  await page.fill("#completionTextInput4", "また次回お会いしましょう");
  await waitStored(page, [
    "本日の進行は終了しました",
    "ありがとうございました",
    "お気をつけてお帰りください",
    "また次回お会いしましょう"
  ], 5);

  await page.click(
    '.completionMessageCard[data-message-index="3"] [data-action="up"]'
  );
  await waitStored(page, [
    "本日の進行は終了しました",
    "ありがとうございました",
    "また次回お会いしましょう",
    "お気をつけてお帰りください"
  ], 5);

  await page.click(
    '.completionMessageCard[data-message-index="1"] [data-action="remove"]'
  );
  await waitStored(page, [
    "本日の進行は終了しました",
    "また次回お会いしましょう",
    "お気をつけてお帰りください"
  ], 5);

  await page.fill("#completionMessageIntervalSec", "7");
  await page.dispatchEvent("#completionMessageIntervalSec", "change");
  await waitStored(page, [
    "本日の進行は終了しました",
    "また次回お会いしましょう",
    "お気をつけてお帰りください"
  ], 7);

  state = await inspect(page);
  expect(JSON.stringify(state.cardValues) === JSON.stringify([
    "本日の進行は終了しました",
    "また次回お会いしましょう",
    "お気をつけてお帰りください"
  ]), `final editor order is ${JSON.stringify(state.cardValues)}`);

  await page.evaluate(() => document.getElementById("done").click());
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.getElementById("app")?.dataset.timerPhase === "completion",
    { timeout: 15_000 }
  );
  await page.click("#gear");
  const advancedAfterReload = page.locator("#advancedSettingsAccordion");
  if (!(await advancedAfterReload.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open
  );
  state = await inspect(page);
  expect(JSON.stringify(state.cardValues) === JSON.stringify([
    "本日の進行は終了しました",
    "また次回お会いしましょう",
    "お気をつけてお帰りください"
  ]), `reloaded editor order is ${JSON.stringify(state.cardValues)}`);
  expect(state.interval === 7,
    `reloaded interval is ${state.interval}`);

  failures.push(...runtimeErrors.map(error => `sequence UI: ${error}`));
} catch (error) {
  failures.push(`sequence UI: ${error.stack || error.message}`);
}

await context.close();

const legacyContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  reducedMotion: "reduce"
});
const legacyPage = await legacyContext.newPage();
await legacyPage.clock.install({ time: COMPLETION_NOW });
await legacyPage.addInitScript(({ key }) => {
  localStorage.setItem(key, JSON.stringify({
    mode: "timer",
    targetTime: "20:30",
    completionText: "旧設定から移行したメッセージ",
    completionDurationMin: 30,
    autoWroEnabled: false,
    noiseStrength: 0,
    alarmEnabled: false
  }));
}, { key: SETTINGS_KEY });

try {
  await legacyPage.goto(`${BASE_URL}&legacy=1`, {
    waitUntil: "networkidle",
    timeout: 45_000
  });
  await legacyPage.waitForFunction(() =>
    document.getElementById("app")?.dataset.timerPhase === "completion",
    { timeout: 15_000 }
  );
  const legacyDisplay = await legacyPage.evaluate(() => ({
    text: document.getElementById("mainValue")?.textContent,
    count: Number(document.getElementById("app")?.dataset.completionMessageCount)
  }));
  expect(
    legacyDisplay.text === "旧設定から移行したメッセージ" &&
    legacyDisplay.count === 1,
    `legacy migration display is ${JSON.stringify(legacyDisplay)}`
  );
} catch (error) {
  failures.push(`legacy migration: ${error.stack || error.message}`);
}

await legacyContext.close();
await browser.close();

if (failures.length) {
  console.error("WRO completion message sequence check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO completion message sequence, looping, editor, order, interval, persistence, and legacy migration check passed."
);
