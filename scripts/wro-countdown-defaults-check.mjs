import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/app.html?defaults-audit=1";

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

try {
  await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.waitForFunction(() => {
    const main = document.querySelector("#mainValue")?.textContent || "";
    const clock = document.querySelector("#clock")?.textContent || "";
    return main && !main.includes("--") && clock && !clock.includes("--");
  }, { timeout: 15_000 });
  await page.waitForTimeout(350);

  const initial = await page.evaluate(() => {
    const checkedLeads = [...document.querySelectorAll(".leadPreset:checked")]
      .map(input => Number(input.value))
      .sort((a, b) => a - b);
    const descriptions = [...document.querySelectorAll(".positionEditorHead small")]
      .map(element => element.textContent.trim());
    const completionWro = document.querySelector("#autoWroDuringCompletion");

    return {
      clockPosition: document.querySelector("#currentBlock")?.dataset.position,
      timerPosition: document.querySelector("#display")?.dataset.position,
      activeDisplay: document.querySelector("#app")?.dataset.activeDisplay,
      targetTime: document.querySelector("#targetTime")?.value,
      completionText: document.querySelector("#completionTextInput")?.value,
      completionDurationMin:
        Number(document.querySelector("#completionDurationMin")?.value),
      completionTextSize:
        Number(document.querySelector("#completionTextSize")?.value),
      completionWroSettingExists: Boolean(completionWro),
      autoWroDuringCompletion: Boolean(completionWro?.checked),
      checkedLeads,
      hasOneHourPreset: Boolean(
        document.querySelector('.leadPreset[value="60"]')
      ),
      descriptions
    };
  });

  if (initial.clockPosition !== "top-right") {
    failures.push(`default current-time position is ${initial.clockPosition}`);
  }
  if (initial.timerPosition !== "center") {
    failures.push(`default timer position is ${initial.timerPosition}`);
  }
  if (initial.activeDisplay !== "timer") {
    failures.push(`default active display is ${initial.activeDisplay}`);
  }
  if (initial.targetTime !== "20:30") {
    failures.push(`default target time is ${initial.targetTime}`);
  }
  if (initial.completionText !== "お疲れ様でした") {
    failures.push(`default completion text is ${initial.completionText}`);
  }
  if (initial.completionDurationMin !== 30) {
    failures.push(
      `default completion duration is ${initial.completionDurationMin}`
    );
  }
  if (initial.completionTextSize !== 96) {
    failures.push(
      `default completion text size is ${initial.completionTextSize}`
    );
  }
  if (!initial.completionWroSettingExists) {
    failures.push("completion-time WRO switching control is missing");
  }
  if (initial.autoWroDuringCompletion) {
    failures.push("completion-time WRO switching is on by default");
  }
  if (!initial.hasOneHourPreset) {
    failures.push("1-hour lead-time checkbox is missing");
  }
  if (JSON.stringify(initial.checkedLeads) !== JSON.stringify([5, 10, 30, 60])) {
    failures.push(
      `default lead times are ${JSON.stringify(initial.checkedLeads)}`
    );
  }

  const expectedDescriptions = [
    "初期位置：右上",
    "初期位置：中央",
    "初期位置：中央"
  ];
  if (JSON.stringify(initial.descriptions) !== JSON.stringify(expectedDescriptions)) {
    failures.push(
      `position descriptions are ${JSON.stringify(initial.descriptions)}`
    );
  }

  await page.click("#gear");
  await page.click("#modeWro");
  await page.waitForFunction(() =>
    document.querySelector("#app")?.dataset.activeDisplay === "wro"
  );
  await page.waitForTimeout(250);

  const wroPosition = await page.evaluate(() =>
    document.querySelector("#display")?.dataset.position
  );
  if (wroPosition !== "center") {
    failures.push(`default WRO position is ${wroPosition}`);
  }
} catch (error) {
  failures.push(error.stack || error.message);
}

await browser.close();

if (failures.length) {
  console.error("WRO countdown defaults check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  "WRO countdown defaults, completion message, completion-time WRO opt-in, layout, and 1-hour alert check passed."
);
