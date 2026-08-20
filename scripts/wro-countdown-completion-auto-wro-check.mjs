import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?completion-auto-wro-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const INIT_MARKER = "wro-completion-auto-wro-test-initialized";
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
  shouldDisplayAutomaticWro,
  shouldPauseAutomaticWro
} = await importSource(
  "docs/wro-countdown/v2/completion-auto-wro.js"
);

const defaultRule = {
  mode: "timer",
  autoWroDuringCompletion: false
};
expect(
  shouldPauseAutomaticWro(defaultRule, true),
  "completion should pause automatic WRO by default"
);
expect(
  !shouldDisplayAutomaticWro(defaultRule, true, true),
  "automatic WRO should stay hidden during completion by default"
);
expect(
  !shouldPauseAutomaticWro(
    { ...defaultRule, autoWroDuringCompletion: true },
    true
  ),
  "enabled completion switching should not pause automatic WRO"
);
expect(
  shouldDisplayAutomaticWro(
    { ...defaultRule, autoWroDuringCompletion: true },
    true,
    true
  ),
  "enabled completion switching should show active automatic WRO"
);
expect(
  shouldDisplayAutomaticWro(defaultRule, false, true),
  "normal countdown automatic WRO behavior changed unexpectedly"
);

const baseSettings = {
  mode: "timer",
  targetTime: "20:30",
  completionText: "お疲れ様でした",
  completionDurationMin: 30,
  autoWroEnabled: true,
  autoWroIntervalMin: 1,
  autoWroDurationMin: 0.1,
  noiseStrength: 0,
  noiseIntervalMin: 0,
  alarmEnabled: false
};

const browser = await chromium.launch({ headless: true });

async function inspect(page) {
  return page.evaluate(key => ({
    timerPhase: document.getElementById("app")?.dataset.timerPhase,
    activeDisplay: document.getElementById("app")?.dataset.activeDisplay,
    modeLabel: document.getElementById("modeLabel")?.textContent || "",
    mainValue: document.getElementById("mainValue")?.textContent || "",
    status: document.getElementById("status")?.textContent || "",
    stored: JSON.parse(localStorage.getItem(key) || "{}")
  }), SETTINGS_KEY);
}

async function checkTimedFlow(enabled) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const label = enabled ? "enabled" : "default-off";

  page.on("pageerror", error =>
    failures.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") {
      failures.push(`${label} console: ${message.text()}`);
    }
  });

  await page.clock.install({
    time: new Date("2026-08-20T11:30:10.000Z")
  });
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: SETTINGS_KEY,
    value: {
      ...baseSettings,
      autoWroDuringCompletion: enabled
    }
  });

  try {
    await page.goto(
      `${BASE_URL}&timed-flow=${label}`,
      { waitUntil: "networkidle", timeout: 45_000 }
    );
    await page.waitForFunction(() =>
      document.getElementById("app")?.dataset.timerPhase === "completion",
      { timeout: 15_000 }
    );

    let state = await inspect(page);
    expect(
      state.mainValue === "お疲れ様でした",
      `${label}: completion message starts as ${state.mainValue}`
    );

    await page.clock.runFor(60_100);
    state = await inspect(page);

    if (!enabled) {
      expect(
        state.timerPhase === "completion" &&
        state.activeDisplay === "timer" &&
        state.mainValue === "お疲れ様でした",
        `default-off: completion was interrupted (${JSON.stringify(state)})`
      );
    } else {
      expect(
        state.activeDisplay === "wro" &&
        state.modeLabel.includes("WRO JAPAN FINAL"),
        `enabled: automatic WRO did not appear (${JSON.stringify(state)})`
      );
      expect(
        state.status === "",
        `enabled: automatic WRO footer status is ${state.status}`
      );

      await page.clock.runFor(6_100);
      state = await inspect(page);
      expect(
        state.timerPhase === "completion" &&
        state.activeDisplay === "timer" &&
        state.mainValue === "お疲れ様でした",
        `enabled: completion message did not return (${JSON.stringify(state)})`
      );
    }
  } catch (error) {
    failures.push(`${label}: ${error.stack || error.message}`);
  }

  await context.close();
}

async function checkNormalTimerAutoWroFooter() {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const label = "normal-timer";

  page.on("pageerror", error =>
    failures.push(`${label} pageerror: ${error.message}`));
  page.on("console", message => {
    if (message.type() === "error") {
      failures.push(`${label} console: ${message.text()}`);
    }
  });

  await page.clock.install({
    time: new Date("2026-08-20T10:00:00.000Z")
  });
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, {
    key: SETTINGS_KEY,
    value: {
      ...baseSettings,
      autoWroDuringCompletion: false
    }
  });

  try {
    await page.goto(
      `${BASE_URL}&normal-timer-flow=1`,
      { waitUntil: "networkidle", timeout: 45_000 }
    );
    await page.waitForFunction(() =>
      document.getElementById("app")?.dataset.timerPhase === "countdown",
      { timeout: 15_000 }
    );

    await page.clock.runFor(60_100);
    let state = await inspect(page);
    expect(
      state.activeDisplay === "wro" &&
      state.modeLabel.includes("WRO JAPAN FINAL"),
      `normal-timer: automatic WRO did not appear (${JSON.stringify(state)})`
    );
    expect(
      state.status === "",
      `normal-timer: automatic WRO footer status is ${state.status}`
    );

    await page.clock.runFor(6_100);
    state = await inspect(page);
    expect(
      state.timerPhase === "countdown" &&
      state.activeDisplay === "timer",
      `normal-timer: timer did not return (${JSON.stringify(state)})`
    );
  } catch (error) {
    failures.push(`${label}: ${error.stack || error.message}`);
  }

  await context.close();
}

await checkTimedFlow(false);
await checkTimedFlow(true);
await checkNormalTimerAutoWroFooter();

const settingsContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
  reducedMotion: "reduce"
});
const settingsPage = await settingsContext.newPage();

try {
  await settingsPage.addInitScript(({ key, marker }) => {
    if (sessionStorage.getItem(marker) !== "1") {
      localStorage.removeItem(key);
      sessionStorage.setItem(marker, "1");
    }
  }, { key: SETTINGS_KEY, marker: INIT_MARKER });

  await settingsPage.goto(
    `${BASE_URL}&settings-control=1`,
    { waitUntil: "networkidle", timeout: 45_000 }
  );
  await settingsPage.waitForFunction(() => {
    const value = document.getElementById("mainValue")?.textContent || "";
    return value && !value.includes("--");
  }, { timeout: 15_000 });

  await settingsPage.click("#gear");
  const advanced = settingsPage.locator("#advancedSettingsAccordion");
  if (!(await advanced.evaluate(element => element.open))) {
    await settingsPage.click("#advancedSettingsAccordion > summary");
  }
  await settingsPage.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open
  );

  const initial = await settingsPage.evaluate(() => {
    const input = document.getElementById("autoWroDuringCompletion");
    return {
      exists: Boolean(input),
      checked: Boolean(input?.checked),
      insideAutoWro: Boolean(
        document.getElementById("autoWroSettings")?.contains(input)
      )
    };
  });
  expect(initial.exists, "completion-time WRO setting is missing");
  expect(!initial.checked, "completion-time WRO setting is not off by default");
  expect(initial.insideAutoWro,
    "completion-time WRO setting is outside the automatic WRO group");

  await settingsPage.evaluate(() => {
    const input = document.getElementById("autoWroDuringCompletion");
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await settingsPage.waitForTimeout(200);

  let state = await inspect(settingsPage);
  expect(
    state.stored.autoWroDuringCompletion === true,
    "completion-time WRO setting was not saved"
  );

  await settingsPage.reload({ waitUntil: "networkidle" });
  await settingsPage.waitForFunction(() =>
    document.getElementById("autoWroDuringCompletion")?.checked === true,
    { timeout: 15_000 }
  );
  state = await inspect(settingsPage);
  expect(
    state.stored.autoWroDuringCompletion === true,
    "completion-time WRO setting did not survive reload"
  );
} catch (error) {
  failures.push(`settings control: ${error.stack || error.message}`);
}

await settingsContext.close();
await browser.close();

if (failures.length) {
  console.error("WRO completion-time automatic display check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO completion-time automatic display, normal timer return, persistence, and footer-free automatic WRO check passed."
);
