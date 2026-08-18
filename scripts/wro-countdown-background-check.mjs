import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/app.html?background-audit=1";
const SETTINGS_KEY = "wro-countdown-settings-v4";

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

async function state() {
  return page.evaluate(key => {
    const app = document.getElementById("app");
    const style = getComputedStyle(app);
    return {
      dataset: {
        style: app.dataset.backgroundStyle,
        guides: app.dataset.backgroundGuides,
        scanlines: app.dataset.backgroundScanlines
      },
      variables: {
        base: style.getPropertyValue("--background-base").trim(),
        mid: style.getPropertyValue("--background-mid").trim(),
        guide: style.getPropertyValue("--background-guide").trim()
      },
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      stored: JSON.parse(localStorage.getItem(key) || "{}")
    };
  }, SETTINGS_KEY);
}

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(() => {
    const value = document.getElementById("mainValue")?.textContent || "";
    return value && !value.includes("--");
  }, { timeout: 15_000 });
  await page.waitForTimeout(250);

  let current = await state();
  expect(current.dataset.style === "gradient", "default background is not gradient");
  expect(current.dataset.guides === "on", "default center guides are not enabled");
  expect(current.dataset.scanlines === "on", "default scanlines are not enabled");
  expect(current.variables.base === "#020405", `unexpected dark base ${current.variables.base}`);

  await page.click("#gear");
  await page.waitForFunction(() => document.getElementById("overlay")?.classList.contains("open"));

  const required = [
    "backgroundSettings",
    "backgroundStyle",
    "backgroundUseThemeColors",
    "backgroundBaseColor",
    "backgroundBaseHex",
    "backgroundAccentColor",
    "backgroundAccentHex",
    "backgroundStrengthRange",
    "backgroundStrength",
    "backgroundGuides",
    "backgroundScanlines"
  ];
  const missing = await page.evaluate(ids =>
    ids.filter(id => !document.getElementById(id)), required);
  expect(missing.length === 0, `missing background controls: ${missing.join(", ")}`);

  await page.selectOption("#backgroundStyle", "spotlight");
  await page.uncheck("#backgroundUseThemeColors");

  await page.evaluate(() => {
    const setColor = (id, value) => {
      const input = document.getElementById(id);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    setColor("backgroundBaseColor", "#112233");
    setColor("backgroundAccentColor", "#44aacc");

    const strength = document.getElementById("backgroundStrengthRange");
    strength.value = "35";
    strength.dispatchEvent(new Event("input", { bubbles: true }));
  });

  await page.uncheck("#backgroundGuides");
  await page.uncheck("#backgroundScanlines");
  await page.waitForTimeout(300);

  current = await state();
  expect(current.dataset.style === "spotlight", "spotlight style was not applied");
  expect(current.dataset.guides === "off", "center guides did not turn off");
  expect(current.dataset.scanlines === "off", "scanlines did not turn off");
  expect(current.variables.base === "#112233", `custom base was not applied: ${current.variables.base}`);
  expect(current.stored.backgroundStyle === "spotlight", "background style was not saved");
  expect(current.stored.backgroundUseThemeColors === false, "custom-color mode was not saved");
  expect(current.stored.backgroundBaseColor === "#112233", "base color was not saved");
  expect(current.stored.backgroundAccentColor === "#44aacc", "accent color was not saved");
  expect(current.stored.backgroundStrength === 35, "background strength was not saved");
  expect(current.stored.backgroundGuides === false, "guide setting was not saved");
  expect(current.stored.backgroundScanlines === false, "scanline setting was not saved");

  await page.click("#done");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const value = document.getElementById("mainValue")?.textContent || "";
    return value && !value.includes("--");
  }, { timeout: 15_000 });
  await page.waitForTimeout(250);

  current = await state();
  expect(current.dataset.style === "spotlight", "background style did not survive reload");
  expect(current.variables.base === "#112233", "custom base did not survive reload");

  await page.click("#gear");
  await page.check("#backgroundUseThemeColors");
  await page.click("#themeLight");
  await page.waitForTimeout(250);

  current = await state();
  expect(current.variables.base === "#ffffff", `light theme base is ${current.variables.base}`);
  expect(current.bodyBackground === "rgb(255, 255, 255)",
    `body background did not follow light theme: ${current.bodyBackground}`);
} catch (error) {
  failures.push(error.stack || error.message);
}

await context.close();
await browser.close();

if (failures.length) {
  console.error("WRO background settings check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("WRO background settings check passed.");
