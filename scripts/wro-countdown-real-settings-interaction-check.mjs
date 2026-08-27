import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?real-settings-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";
const failures = [];
const browser = await chromium.launch({ headless: true });

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function waitSaved(page, predicate, description) {
  try {
    await page.waitForFunction(({ key, source }) => {
      const settings = JSON.parse(localStorage.getItem(key) || "{}");
      return Function("settings", `return (${source});`)(settings);
    }, { key: SETTINGS_KEY, source: predicate }, { timeout: 15_000 });
  } catch (error) {
    const actual = await page.evaluate(key =>
      JSON.parse(localStorage.getItem(key) || "{}"), SETTINGS_KEY);
    failures.push(
      `${description}: ${JSON.stringify(actual)} (${error.message})`
    );
  }
}

async function openSettings(page) {
  await page.click("#gear");
  await page.waitForFunction(() =>
    document.getElementById("overlay")?.classList.contains("open"));
  await page.waitForTimeout(50);
}

async function openAdvanced(page) {
  await openSettings(page);
  const advanced = page.locator("#advancedSettingsAccordion");
  if (!(await advanced.evaluate(element => element.open))) {
    await page.click("#advancedSettingsAccordion > summary");
  }
  await page.waitForFunction(() =>
    document.getElementById("advancedSettingsAccordion")?.open);
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

await page.clock.install({ time: new Date("2026-08-20T10:00:00.000Z") });
await page.addInitScript(key => {
  localStorage.setItem(key, JSON.stringify({
    mode: "timer",
    targetTime: "20:30",
    showTarget: true,
    showHourMinute: true,
    timerText: "",
    completionMessages: ["お疲れ様でした"],
    completionText: "お疲れ様でした",
    completionMessageIntervalSec: 10,
    completionDurationMin: 30,
    showCurrentTime: true,
    currentTimeLabel: "現在時刻",
    autoSize: true,
    clockSize: 64,
    dateSize: 16,
    timerSize: 116,
    completionTextSize: 96,
    targetSize: 32,
    subSize: 23,
    timerTextSize: 26,
    clockPosition: "top-right",
    timerPosition: "center",
    wroPosition: "center",
    noiseStrength: 0,
    noiseIntervalMin: 0,
    lineGap: 110,
    autoWroEnabled: false,
    alarmEnabled: false,
    atTarget: true,
    leadTimes: [5, 10, 30, 60],
    volume: 70,
    soundType: "bell",
    backgroundStyle: "gradient",
    backgroundUseThemeColors: true,
    backgroundBaseColor: "#020405",
    backgroundAccentColor: "#56d1e7",
    backgroundStrength: 60,
    backgroundGuides: true,
    backgroundScanlines: true
  }));
}, SETTINGS_KEY);

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(() => {
    const app = document.getElementById("app");
    const value = document.getElementById("mainValue")?.textContent || "";
    return app?.dataset.timerPhase === "countdown" &&
      value && !value.includes("--");
  }, { timeout: 15_000 });

  await openAdvanced(page);

  const structure = await page.evaluate(() => {
    const selector =
      'input:not([type="hidden"]), select, textarea, button';
    const invalid = [...document.querySelectorAll("label")]
      .map(label => ({
        text: label.textContent?.trim().slice(0, 80) || "",
        count: [...label.querySelectorAll(selector)]
          .filter(control => control.closest("label") === label).length
      }))
      .filter(item => item.count > 1);

    return {
      invalid,
      upgraded: Number(
        document.getElementById("settingsRoot")
          ?.dataset.compositeFieldsUpgraded || 0
      ),
      groups: document.querySelectorAll('[data-composite-field="true"]').length,
      unlabeledCompositeControls: [...document.querySelectorAll(
        '[data-composite-field="true"] input, ' +
        '[data-composite-field="true"] select, ' +
        '[data-composite-field="true"] textarea'
      )].filter(control =>
        !control.hasAttribute("aria-label") &&
        !control.hasAttribute("aria-labelledby")
      ).map(control => control.id)
    };
  });

  expect(structure.invalid.length === 0,
    `composite labels remain: ${JSON.stringify(structure.invalid)}`);
  expect(structure.upgraded >= 5 && structure.groups === structure.upgraded,
    `composite groups are ${JSON.stringify(structure)}`);
  expect(structure.unlabeledCompositeControls.length === 0,
    `unlabeled composite controls: ${structure.unlabeledCompositeControls}`);

  // Use actual focus, typing and keyboard commit paths on fields that used to
  // share one invalid label with another control.
  await page.fill("#noiseStrength", "37");
  await page.press("#noiseStrength", "Enter");
  await waitSaved(page, "settings.noiseStrength === 37", "noise number input");

  await page.fill("#volume", "44");
  await page.press("#volume", "Enter");
  await waitSaved(page, "settings.volume === 44", "volume number input");

  await page.click("#backgroundUseThemeColors");
  await waitSaved(
    page,
    "settings.backgroundUseThemeColors === false",
    "custom background colors toggle"
  );

  await page.fill("#backgroundBaseHex", "#123456");
  await page.press("#backgroundBaseHex", "Enter");
  await waitSaved(
    page,
    'settings.backgroundBaseColor === "#123456"',
    "base background hex"
  );

  await page.fill("#backgroundAccentHex", "#abcdef");
  await page.press("#backgroundAccentHex", "Enter");
  await waitSaved(
    page,
    'settings.backgroundAccentColor === "#abcdef"',
    "accent background hex"
  );

  await page.fill("#backgroundStrength", "33");
  await page.press("#backgroundStrength", "Enter");
  await waitSaved(
    page,
    "settings.backgroundStrength === 33",
    "background strength number input"
  );

  await page.fill("#customLead", "15");
  await page.press("#customLead", "Enter");
  await waitSaved(
    page,
    "settings.leadTimes.includes(15)",
    "custom alert lead add"
  );
  await page.click('button[aria-label="15分前の通知を削除"]');
  await waitSaved(
    page,
    "!settings.leadTimes.includes(15)",
    "custom alert lead remove"
  );

  // The modal must own keyboard focus and the page behind it must be inert.
  const modalOpen = await page.evaluate(() => ({
    activeId: document.activeElement?.id,
    shellInert: document.getElementById("shell")?.inert,
    shellAriaHidden: document.getElementById("shell")
      ?.getAttribute("aria-hidden"),
    bodyOverflow: document.body.style.overflow
  }));
  expect(modalOpen.shellInert === true && modalOpen.shellAriaHidden === "true",
    `modal background state is ${JSON.stringify(modalOpen)}`);
  expect(modalOpen.bodyOverflow === "hidden",
    `body overflow while open is ${modalOpen.bodyOverflow}`);

  await page.focus("#done");
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.id) === "close",
    "Tab from the last settings control did not wrap to close");

  await page.focus("#close");
  await page.keyboard.press("Shift+Tab");
  expect(await page.evaluate(() => document.activeElement?.id) === "done",
    "Shift+Tab from close did not wrap to the last control");

  await page.keyboard.press("Escape");
  await page.waitForFunction(() =>
    !document.getElementById("overlay")?.classList.contains("open"));
  await page.waitForTimeout(50);

  const modalClosed = await page.evaluate(() => ({
    activeId: document.activeElement?.id,
    shellInert: document.getElementById("shell")?.inert,
    shellAriaHidden: document.getElementById("shell")
      ?.getAttribute("aria-hidden"),
    bodyOverflow: document.body.style.overflow
  }));
  expect(modalClosed.activeId === "gear",
    `focus after Escape is ${modalClosed.activeId}`);
  expect(modalClosed.shellInert === false && modalClosed.shellAriaHidden === null,
    `closed modal background state is ${JSON.stringify(modalClosed)}`);
  expect(modalClosed.bodyOverflow === "",
    `body overflow after close is ${modalClosed.bodyOverflow}`);

  // Reproduce a rapid open/close. The old delayed focus callback could focus a
  // hidden close button after the dialog had already closed.
  await page.click("#gear");
  await page.waitForFunction(() =>
    document.getElementById("overlay")?.classList.contains("open"));
  await page.click("#close");
  await page.waitForFunction(() =>
    !document.getElementById("overlay")?.classList.contains("open"));
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => document.activeElement?.id) === "gear",
    "rapid close left focus on a hidden settings control");

  failures.push(...runtimeErrors.map(error => `runtime: ${error}`));
} catch (error) {
  failures.push(error.stack || error.message);
}

await context.close();
await browser.close();

if (failures.length) {
  console.error("WRO real settings interaction check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO real settings interaction check passed composite fields, real number/color inputs, custom alerts, modal focus trapping, Escape restore, and rapid close safety."
);
