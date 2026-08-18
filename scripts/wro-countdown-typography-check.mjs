import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/app.html?typography-audit=1";

const cases = [
  { name: "phone portrait", width: 390, height: 844 },
  { name: "notebook", width: 1366, height: 768 },
  { name: "full HD", width: 1920, height: 1080 }
];

const forbidden = /Roboto Condensed|Arial Narrow|Condensed/i;
const browser = await chromium.launch({ headless: true });
const failures = [];

for (const testCase of cases) {
  const context = await browser.newContext({
    viewport: { width: testCase.width, height: testCase.height },
    colorScheme: "dark",
    reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const runtimeErrors = [];

  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForFunction(() => {
      const main = document.querySelector("#mainValue")?.textContent || "";
      const clock = document.querySelector("#clock")?.textContent || "";
      return main && !main.includes("--") && clock && !clock.includes("--");
    }, { timeout: 15_000 });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(150);

    const result = await page.evaluate(() => {
      const inspect = selector => {
        const element = document.querySelector(selector);
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const fontSize = Number.parseFloat(style.fontSize) || 1;
        return {
          selector,
          fontFamily: style.fontFamily,
          fontWeight: style.fontWeight,
          lineHeight: style.lineHeight,
          letterSpacing: style.letterSpacing,
          width: rect.width,
          height: rect.height,
          widthToFontSize: rect.width / fontSize,
          text: element.textContent
        };
      };

      const root = getComputedStyle(document.documentElement);
      return {
        uiStack: root.getPropertyValue("--font-ui").trim(),
        numericStack: root.getPropertyValue("--font-numeric").trim(),
        body: inspect("body"),
        currentLabel: inspect("#currentTimeLabel"),
        clock: inspect("#clock"),
        mode: inspect("#modeLabel"),
        target: inspect("#targetLabel"),
        main: inspect("#mainValue"),
        sub: inspect("#subValue"),
        date: inspect("#date")
      };
    });

    if (!result.uiStack || !result.numericStack) {
      failures.push(`${testCase.name}: typography font stacks are missing`);
    }

    for (const item of Object.values(result)) {
      if (!item || typeof item !== "object" || !item.fontFamily) continue;
      if (forbidden.test(item.fontFamily)) {
        failures.push(
          `${testCase.name}: ${item.selector} still uses a narrow font (${item.fontFamily})`
        );
      }
    }

    for (const item of [result.clock, result.main]) {
      if (!/Arial|Noto Sans/i.test(item.fontFamily)) {
        failures.push(
          `${testCase.name}: ${item.selector} does not use the stable numeric stack`
        );
      }
      if (Number(item.fontWeight) > 800) {
        failures.push(
          `${testCase.name}: ${item.selector} uses an overly heavy synthetic weight`
        );
      }
      if (item.widthToFontSize < 3.7) {
        failures.push(
          `${testCase.name}: ${item.selector} numerals are too condensed ` +
          `(${item.widthToFontSize.toFixed(2)}× font size)`
        );
      }
    }

    failures.push(...runtimeErrors.map(error => `${testCase.name}: ${error}`));
  } catch (error) {
    failures.push(`${testCase.name}: ${error.stack || error.message}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO typography check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`WRO typography check passed ${cases.length} viewport profiles.`);
