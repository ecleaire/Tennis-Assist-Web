import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?settings-recovery-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const browser = await chromium.launch({ headless: true });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function readUi(page) {
  await page.click("#gear");
  const advanced = page.locator("#advancedSettingsAccordion");
  if (!(await advanced.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open);

  return page.evaluate(() => ({
    targetTime: document.getElementById("targetTime").value,
    clockSize: Number(document.getElementById("clockSize").value),
    timerSize: Number(document.getElementById("timerSize").value),
    completionDurationMin:
      Number(document.getElementById("completionDurationMin").value),
    showTarget: document.getElementById("showTarget").checked,
    showCurrentTime: document.getElementById("showCurrentTime").checked,
    autoSize: document.getElementById("autoSize").checked,
    clockPosition: document.querySelector(
      'input[name="clockPosition"]:checked'
    )?.value,
    backgroundBaseColor:
      document.getElementById("backgroundBaseColor").value,
    volume: Number(document.getElementById("volume").value),
    soundType: document.getElementById("soundType").value,
    leadTimes: [...document.querySelectorAll(".leadPreset:checked")]
      .map(input => Number(input.value))
      .sort((a, b) => a - b),
    phase: document.getElementById("app").dataset.timerPhase
  }));
}

async function runCase(name, storedSource, assertions) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", error => pageErrors.push(error.message));
  await page.addInitScript(({ key, source }) => {
    localStorage.setItem(key, source);
  }, { key: SETTINGS_KEY, source: storedSource });

  try {
    await page.goto(`${BASE_URL}&case=${name}`, {
      waitUntil: "networkidle",
      timeout: 45_000
    });
    await page.waitForFunction(() => {
      const value = document.getElementById("mainValue")?.textContent || "";
      return value && !value.includes("--");
    }, { timeout: 15_000 });

    const state = await readUi(page);
    assertions(state);
    expect(pageErrors.length === 0,
      `${name}: page errors ${pageErrors.join(" | ")}`);
  } catch (error) {
    failures.push(`${name}: ${error.stack || error.message}`);
  }

  await context.close();
}

await runCase(
  "invalid-values",
  JSON.stringify({
    mode: "unknown",
    targetTime: "99:99",
    clockSize: "not-a-number",
    timerSize: 99999,
    completionDurationMin: -80,
    showTarget: "false",
    showCurrentTime: null,
    autoSize: 0,
    clockPosition: "outside-screen",
    backgroundBaseColor: "red",
    volume: Infinity,
    soundType: "missing-sound",
    leadTimes: [60, "10", -1, 60, "bad", 99999]
  }),
  state => {
    expect(state.targetTime === "20:30",
      `invalid-values: target time is ${state.targetTime}`);
    expect(state.clockSize === 64,
      `invalid-values: clock size is ${state.clockSize}`);
    expect(state.timerSize === 520,
      `invalid-values: timer size is ${state.timerSize}`);
    expect(state.completionDurationMin === 1,
      `invalid-values: completion duration is ${state.completionDurationMin}`);
    expect(state.showTarget === true,
      `invalid-values: showTarget is ${state.showTarget}`);
    expect(state.showCurrentTime === true,
      `invalid-values: showCurrentTime is ${state.showCurrentTime}`);
    expect(state.autoSize === true,
      `invalid-values: autoSize is ${state.autoSize}`);
    expect(state.clockPosition === "top-right",
      `invalid-values: clock position is ${state.clockPosition}`);
    expect(state.backgroundBaseColor === "#020405",
      `invalid-values: base color is ${state.backgroundBaseColor}`);
    expect(state.volume === 70,
      `invalid-values: volume is ${state.volume}`);
    expect(state.soundType === "bell",
      `invalid-values: sound type is ${state.soundType}`);
    expect(JSON.stringify(state.leadTimes) === JSON.stringify([10, 60]),
      `invalid-values: lead times are ${JSON.stringify(state.leadTimes)}`);
  }
);

await runCase(
  "malformed-json",
  "{broken-json",
  state => {
    expect(state.targetTime === "20:30",
      `malformed-json: target time is ${state.targetTime}`);
    expect(state.clockSize === 64,
      `malformed-json: clock size is ${state.clockSize}`);
    expect(state.timerSize === 116,
      `malformed-json: timer size is ${state.timerSize}`);
    expect(state.completionDurationMin === 30,
      `malformed-json: completion duration is ${state.completionDurationMin}`);
    expect(state.showTarget && state.showCurrentTime && state.autoSize,
      `malformed-json: boolean defaults are wrong ${JSON.stringify(state)}`);
  }
);

await browser.close();

if (failures.length) {
  console.error("WRO settings recovery check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("WRO settings recovery check passed invalid values and malformed JSON.");
