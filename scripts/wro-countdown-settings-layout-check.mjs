import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/app.html?settings-layout-audit=1";
const DETAILS_OPEN_KEY = "wro-countdown-advanced-settings-open";
const BLOCK_OPEN_KEY_PREFIX = "wro-countdown-settings-block-open-";
const SETTINGS_KEY = "wro-countdown-settings-v4";

const cases = [
  { name: "phone portrait", width: 390, height: 844 },
  { name: "notebook", width: 1366, height: 768 }
];

const basicControlIds = [
  "modeTimer",
  "modeWro",
  "targetTime",
  "showCurrentTime",
  "showTarget",
  "showHourMinute",
  "themeDark",
  "themeLight",
  "backgroundStyle",
  "autoSize",
  "alarmEnabled",
  "atTarget",
  "soundType",
  "volume",
  "testSound",
  "audioStatus"
];

const advancedControlIds = [
  "currentTimeLabelInput",
  "timerTextInput",
  "completionTextInput",
  "completionDurationMin",
  "wroDateSuffixInput",
  "autoWroEnabled",
  "autoWroInterval",
  "autoWroDuration",
  "clockSize",
  "dateSize",
  "timerSize",
  "completionTextSize",
  "targetSize",
  "subSize",
  "timerTextSize",
  "wroTitleSize",
  "wroDateSuffixSize",
  "backgroundUseThemeColors",
  "backgroundBaseColor",
  "backgroundAccentColor",
  "backgroundStrength",
  "backgroundGuides",
  "backgroundScanlines",
  "clockOffsetX",
  "timerOffsetX",
  "wroOffsetX",
  "noiseStrength",
  "noisePattern",
  "noiseInterval",
  "lineGap",
  "customLead",
  "audioFile",
  "removeAudio"
];

const expectedCategories = [
  "content",
  "appearance",
  "placement",
  "effects",
  "audio"
];

const browser = await chromium.launch({ headless: true });
const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

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

  await page.addInitScript(key => localStorage.removeItem(key), DETAILS_OPEN_KEY);

  try {
    await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 45_000 });
    await page.waitForFunction(() => {
      const value = document.getElementById("mainValue")?.textContent || "";
      return value && !value.includes("--");
    }, { timeout: 15_000 });

    await page.click("#gear");
    await page.waitForFunction(() =>
      document.getElementById("overlay")?.classList.contains("open"));
    await page.waitForTimeout(150);

    const structure = await page.evaluate(({ basicIds, advancedIds }) => {
      const root = document.getElementById("settingsRoot");
      const basic = document.getElementById("basicSettingsPanel");
      const advanced = document.getElementById("advancedSettingsAccordion");
      const actions = root?.querySelector(":scope > .actions");
      const allIds = [...document.querySelectorAll("[id]")].map(element => element.id);
      const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);

      return {
        childIds: [...root.children].map(element => element.id || element.className),
        firstIsBasic: root.firstElementChild === basic,
        secondIsAdvanced: root.children[1] === advanced,
        actionsLast: root.lastElementChild?.classList.contains("settingsVersion") &&
          root.lastElementChild.previousElementSibling === actions,
        release: root.querySelector(".settingsVersion strong")?.textContent,
        updatedAt: root.querySelector(".settingsVersion small")?.textContent,
        advancedOpen: advanced.open,
        basicMissing: basicIds.filter(id => !basic.contains(document.getElementById(id))),
        advancedMissing: advancedIds.filter(id => !advanced.contains(document.getElementById(id))),
        categories: [...advanced.querySelectorAll("[data-settings-category]")]
          .map(element => element.dataset.settingsCategory),
        doneInsideAdvanced: advanced.contains(document.getElementById("done")),
        resetInsideAdvanced: advanced.contains(document.getElementById("reset")),
        duplicateIds: [...new Set(duplicateIds)],
        basicRect: basic.getBoundingClientRect(),
        panelRect: document.querySelector(".panel").getBoundingClientRect()
      };
    }, { basicIds: basicControlIds, advancedIds: advancedControlIds });

    expect(structure.firstIsBasic,
      `${testCase.name}: basic settings are not first`);
    expect(structure.secondIsAdvanced,
      `${testCase.name}: advanced accordion is not second`);
    expect(structure.actionsLast,
      `${testCase.name}: footer actions are not immediately before release metadata`);
    expect(structure.release === "v1.1.0" && structure.updatedAt === "更新日：2026年9月27日",
      `${testCase.name}: unexpected release metadata ${structure.release}/${structure.updatedAt}`);
    expect(!structure.advancedOpen,
      `${testCase.name}: advanced settings should be closed initially`);
    expect(structure.basicMissing.length === 0,
      `${testCase.name}: controls missing from basic settings: ${structure.basicMissing.join(", ")}`);
    expect(structure.advancedMissing.length === 0,
      `${testCase.name}: controls missing from advanced settings: ${structure.advancedMissing.join(", ")}`);
    expect(JSON.stringify(structure.categories) === JSON.stringify(expectedCategories),
      `${testCase.name}: unexpected advanced categories ${structure.categories.join(", ")}`);
    expect(!structure.doneInsideAdvanced,
      `${testCase.name}: close button was placed inside advanced settings`);
    expect(!structure.resetInsideAdvanced,
      `${testCase.name}: reset button was placed inside advanced settings`);
    expect(structure.duplicateIds.length === 0,
      `${testCase.name}: duplicate IDs found: ${structure.duplicateIds.join(", ")}`);
    expect(structure.basicRect.left >= -2 &&
      structure.basicRect.right <= testCase.width + 2,
      `${testCase.name}: basic panel is outside the viewport`);

    await page.click("#advancedSettingsAccordion > summary");
    await page.waitForFunction(() =>
      document.getElementById("advancedSettingsAccordion")?.open);
    await page.waitForTimeout(100);

    const openState = await page.evaluate(key => {
      const advanced = document.getElementById("advancedSettingsAccordion");
      const categories = [...advanced.querySelectorAll("[data-settings-category]")];
      return {
        stored: localStorage.getItem(key),
        stateText: advanced.querySelector(".advancedSettingsState")?.textContent,
        visibleCategories: categories.filter(category => {
          const rect = category.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length
      };
    }, DETAILS_OPEN_KEY);

    expect(openState.stored === "1",
      `${testCase.name}: open accordion state was not saved`);
    expect(openState.stateText === "閉じる",
      `${testCase.name}: accordion summary state did not update`);
    expect(openState.visibleCategories === expectedCategories.length,
      `${testCase.name}: not all advanced categories became visible`);

    const blocks = page.locator(".detailSettingsCategory");
    const content = page.locator('[data-settings-category="content"]');
    expect(await blocks.evaluateAll(elements => elements.every(element =>
      element.tagName === "DETAILS" && element.open)),
    `${testCase.name}: categories should be independently expandable native details`);

    await page.fill("#currentTimeLabelInput", "開閉後も保持");
    await page.waitForFunction(key =>
      JSON.parse(localStorage.getItem(key) || "{}").currentTimeLabel === "開閉後も保持",
    SETTINGS_KEY);
    const savedSettings = await page.evaluate(key => localStorage.getItem(key), SETTINGS_KEY);

    await content.locator("summary").click();
    expect(!await content.evaluate(element => element.open),
      `${testCase.name}: clicking a block header did not collapse it`);
    expect(!await page.locator("#currentTimeLabelInput").isVisible(),
      `${testCase.name}: collapsed block still shows its controls`);
    expect(await blocks.evaluateAll(elements => elements.slice(1).every(element => element.open)),
      `${testCase.name}: collapsing one block affected another block`);
    await content.locator("summary").focus();
    await page.keyboard.press("Enter");
    expect(await page.locator("#currentTimeLabelInput").isVisible(),
      `${testCase.name}: Enter did not expand the focused block`);
    await page.keyboard.press("Space");
    expect(!await content.evaluate(element => element.open),
      `${testCase.name}: Space did not collapse the focused block`);

    await page.getByRole("button", { name: "すべて閉じる", exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll(".detailSettingsCategory")]
      .every(element => !element.open));
    for (const category of expectedCategories) {
      expect(!await page.locator(`[data-settings-category="${category}"] input`).first().isVisible(),
        `${testCase.name}: collapse-all still shows controls in ${category}`);
    }
    await page.getByRole("button", { name: "すべて開く", exact: true }).click();
    await page.waitForFunction(() => [...document.querySelectorAll(".detailSettingsCategory")]
      .every(element => element.open));

    // Save a mixed state and verify it survives a complete page reload.
    await content.locator("summary").click();
    await page.waitForFunction(prefix =>
      localStorage.getItem(prefix + "content") === "0" &&
      localStorage.getItem(prefix + "appearance") === "1", BLOCK_OPEN_KEY_PREFIX);
    expect(await page.evaluate(key => localStorage.getItem(key), SETTINGS_KEY) === savedSettings,
      `${testCase.name}: expanding/collapsing blocks changed application settings`);
    await page.reload({ waitUntil: "networkidle" });
    await page.click("#gear");
    await page.click("#advancedSettingsAccordion > summary");
    expect(!await content.evaluate(element => element.open),
      `${testCase.name}: collapsed block state was lost after reload`);
    expect(await blocks.evaluateAll(elements => elements.slice(1).every(element => element.open)),
      `${testCase.name}: expanded block states were lost after reload`);
    await content.locator("summary").click();
    expect(await page.inputValue("#currentTimeLabelInput") === "開閉後も保持",
      `${testCase.name}: saved setting was lost after reload`);

    await page.selectOption("#backgroundStyle", "solid");
    await page.check("#modeWro", { force: true });
    const basicInteraction = await page.evaluate(() => ({
      backgroundStyle: document.getElementById("backgroundStyle").value,
      wroChecked: document.getElementById("modeWro").checked
    }));
    expect(basicInteraction.backgroundStyle === "solid",
      `${testCase.name}: basic background control did not work`);
    expect(basicInteraction.wroChecked,
      `${testCase.name}: basic mode control did not work`);

    await page.evaluate(() => document.getElementById("done").click());
    await page.click("#gear");
    await page.waitForFunction(() =>
      document.getElementById("overlay")?.classList.contains("open"));
    const persistedOpen = await page.evaluate(() =>
      document.getElementById("advancedSettingsAccordion").open);
    expect(persistedOpen,
      `${testCase.name}: accordion open state did not persist when reopening settings`);

    failures.push(...runtimeErrors.map(error => `${testCase.name}: ${error}`));
  } catch (error) {
    failures.push(`${testCase.name}: ${error.stack || error.message}`);
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("WRO settings layout check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`WRO settings layout check passed ${cases.length} viewports.`);
