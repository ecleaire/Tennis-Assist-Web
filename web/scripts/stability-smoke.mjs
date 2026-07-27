import { chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".webmanifest", "application/manifest+json; charset=utf-8"],
  [".woff2", "font/woff2"],
]);
const docsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../docs");
let testServer = null;
let baseUrl = process.env.PREVIEW_URL || "";

if (!baseUrl) {
  testServer = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname).replace(/^\/+/, "");
      let filePath = resolve(docsRoot, pathname || "index.html");
      if (filePath !== docsRoot && !filePath.startsWith(`${docsRoot}${sep}`)) {
        response.writeHead(403).end();
        return;
      }
      if ((await stat(filePath)).isDirectory()) filePath = resolve(filePath, "index.html");
      const body = await readFile(filePath);
      response.writeHead(200, { "Content-Type": mimeTypes.get(extname(filePath)) || "application/octet-stream" });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolveListen, reject) => {
    testServer.once("error", reject);
    testServer.listen(0, "127.0.0.1", resolveListen);
  });
  const address = testServer.address();
  if (!address || typeof address === "string") throw new Error("stability_test_server_failed");
  baseUrl = `http://127.0.0.1:${address.port}`;
}
const targets = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "monitor-1360x768", width: 1360, height: 768 },
  { name: "iphone-se", width: 375, height: 667, mobile: true },
  { name: "iphone-17-pro", width: 402, height: 874, mobile: true },
  { name: "android-360x800", width: 360, height: 800, mobile: true },
  { name: "android-412x915", width: 412, height: 915, mobile: true },
  { name: "android-915x412", width: 915, height: 412, mobile: true },
  { name: "ipad-air2-portrait", width: 768, height: 1024, mobile: true },
  { name: "ipad-air2-landscape", width: 1024, height: 768, mobile: true },
  { name: "ipad7-portrait", width: 810, height: 1080, mobile: true },
  { name: "ipad7-landscape", width: 1080, height: 810, mobile: true },
  { name: "ipad-pro11-portrait", width: 834, height: 1194, mobile: true },
  { name: "ipad-pro11-landscape", width: 1194, height: 834, mobile: true },
];
const editions = [
  { name: "venue", path: "/" },
  { name: "general", path: "/general/" },
];
const drawTargets = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "monitor-1360x768", width: 1360, height: 768 },
  { name: "iphone-17-pro", width: 402, height: 874, mobile: true },
  { name: "android-412x915", width: 412, height: 915, mobile: true },
  { name: "android-915x412", width: 915, height: 412, mobile: true },
  { name: "ipad-air2-landscape", width: 1024, height: 768, mobile: true },
  { name: "ipad7-landscape", width: 1080, height: 810, mobile: true },
  { name: "ipad-pro11-portrait", width: 834, height: 1194, mobile: true },
  { name: "ipad-pro11-landscape", width: 1194, height: 834, mobile: true },
];
const screens = ["dashboard", "timer", "referee", "balls", "records", "rules", "links"];
const targetFilter = process.env.SMOKE_TARGET || "";
const editionFilter = process.env.SMOKE_EDITION || "";
const activeTargets = targetFilter ? targets.filter((target) => target.name === targetFilter) : targets;
const activeDrawTargets = targetFilter ? drawTargets.filter((target) => target.name === targetFilter) : drawTargets;
const activeEditions = editionFilter ? editions.filter((edition) => edition.name === editionFilter) : editions;

const browser = await chromium.launch({ headless: true });
const failures = [];

async function holdButton(page, selector, duration = 1150) {
  const locator = page.locator(selector);
  await locator.scrollIntoViewIfNeeded();
  await locator.focus();
  await page.keyboard.down("Enter");
  await page.waitForTimeout(duration);
  await page.keyboard.up("Enter");
}

async function holdReturnButton(page, selector, duration = 1150) {
  await holdButton(page, selector, duration);
}

try {
  for (const edition of activeEditions) {
    for (const target of activeTargets) {
      const context = await browser.newContext({
        viewport: { width: target.width, height: target.height },
        hasTouch: Boolean(target.mobile),
        isMobile: Boolean(target.mobile),
      });
      await context.addInitScript(() => {
        try {
          delete Navigator.prototype.serviceWorker;
        } catch {
          // Service Worker behavior is verified separately below.
        }
      });
      const page = await context.newPage();
      const label = `${edition.name}/${target.name}`;
      const runtimeErrors = [];
      page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        const messageText = message.text();
        const isGoogleDriveReportOnlyWarning =
          messageText.includes("Framing 'https://drive.google.com/' violates the following report-only Content Security Policy") &&
          messageText.includes("frame-ancestors 'self'");
        if (message.type() === "error" && !isGoogleDriveReportOnlyWarning) {
          runtimeErrors.push(`console: ${messageText}`);
        }
      });

      try {
        await page.goto(`${baseUrl}${edition.path}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.waitForFunction(() => document.querySelectorAll("#operation-court option").length > 0);
        if (edition.name === "general") {
          await page.waitForFunction(() => {
            const button = document.querySelector('[data-screen="operation"]');
            const screen = document.querySelector("#screen-operation");
            if (!(button instanceof HTMLElement) || !(screen instanceof HTMLElement)) return false;
            if (!screen.classList.contains("active")) button.click();
            return screen.classList.contains("active");
          });
        }
        await page.locator("#operation-prepare").waitFor({ state: "visible", timeout: 10_000 });

        for (const screen of screens) {
          await page.evaluate((name) => {
            const button = document.querySelector(`[data-screen="${name}"]`);
            if (button instanceof HTMLElement) button.click();
          }, screen);
          await page.waitForTimeout(40);
          const active = await page.locator(`#screen-${screen}`).evaluate((element) => !element.classList.contains("hidden"));
          if (!active) failures.push(`${label}: ${screen} did not activate`);
          const widthState = await page.evaluate(() => ({
            client: document.documentElement.clientWidth,
            scroll: document.documentElement.scrollWidth,
          }));
          if (widthState.scroll > widthState.client + 2) {
            failures.push(`${label}: ${screen} horizontal overflow ${widthState.scroll}/${widthState.client}`);
          }
          if (screen === "timer") {
            for (const selector of ["#timer-ten", "#timer-five"]) {
              if (!(await page.locator(selector).isVisible())) failures.push(`${label}: normal timer control is hidden: ${selector}`);
              const box = await page.locator(selector).boundingBox();
              if (!box || box.width < 44 || box.height < 44) failures.push(`${label}: normal timer control is too small: ${selector} ${JSON.stringify(box)}`);
            }
          }
          if (screen === "referee") {
            for (const selector of ["#referee-ten", "#referee-five"]) {
              if (!(await page.locator(selector).isVisible())) failures.push(`${label}: referee timer control is hidden: ${selector}`);
              const box = await page.locator(selector).boundingBox();
              if (!box || box.width < 44 || box.height < 44) failures.push(`${label}: referee timer control is too small: ${selector} ${JSON.stringify(box)}`);
            }
          }
        }

        for (const fullscreenCase of [
          { screen: "timer", button: "#timer-fullscreen", bodyClass: "compact" },
          { screen: "referee", button: "#referee-fullscreen", bodyClass: "referee-compact" },
          { screen: "balls", button: "#balls-fullscreen", bodyClass: "balls-compact" },
        ]) {
          await page.evaluate((screen) => {
            const button = document.querySelector(`[data-screen="${screen}"]`);
            if (button instanceof HTMLElement) button.click();
          }, fullscreenCase.screen);
          await page.locator(fullscreenCase.button).click();
          await page.waitForFunction((bodyClass) => document.body.classList.contains(bodyClass), fullscreenCase.bodyClass);
          await page.locator(fullscreenCase.button).click();
          await page.waitForFunction((bodyClass) => !document.body.classList.contains(bodyClass), fullscreenCase.bodyClass);
          if (!(await page.locator(`#screen-${fullscreenCase.screen}`).evaluate((screen) => screen.classList.contains("active")))) {
            failures.push(`${label}: ${fullscreenCase.screen} fullscreen did not return to its source screen`);
          }
        }

        await page.evaluate((screen) => {
          const button = document.querySelector(`[data-screen="${screen}"]`);
          if (button instanceof HTMLElement) button.click();
        }, edition.name === "general" ? "operation" : "dashboard");
        await page.locator("#operation-prepare").click();
        await page.locator("#operation-team").waitFor({ state: "visible" });
        for (const selector of ["#operation-court", "#operation-match-type", "#operation-team-a", "#operation-team-b", "#operation-team-ok"]) {
          const box = await page.locator(selector).boundingBox();
          if (!box || box.x < -1 || box.x + box.width > target.width + 1) {
            failures.push(`${label}: team setup control outside viewport: ${selector}`);
          }
        }

        if (runtimeErrors.length) failures.push(`${label}: ${runtimeErrors.join(" | ")}`);
        process.stdout.write(`PASS ${label}\n`);
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await context.close();
      }
    }
  }

  for (const edition of activeEditions) {
    for (const target of activeDrawTargets) {
      const context = await browser.newContext({
        viewport: { width: target.width, height: target.height },
        hasTouch: Boolean(target.mobile),
        isMobile: Boolean(target.mobile),
      });
      await context.addInitScript(() => {
        try {
          delete Navigator.prototype.serviceWorker;
        } catch {
          // Service Worker behavior is verified separately below.
        }
      });
      const page = await context.newPage();
      const label = `${edition.name}/draw-sequence/${target.name}`;
      try {
        await page.goto(`${baseUrl}${edition.path}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.waitForFunction(() => document.querySelectorAll("#operation-court option").length > 0);
        if (edition.name === "general") {
          await page.waitForFunction(() => {
            const button = document.querySelector('[data-screen="operation"]');
            const screen = document.querySelector("#screen-operation");
            if (!(button instanceof HTMLElement) || !(screen instanceof HTMLElement)) return false;
            if (!screen.classList.contains("active")) button.click();
            return screen.classList.contains("active");
          });
        }
        await page.locator("#operation-prepare").click();
        await page.locator("#operation-match-type").selectOption({ index: 1 });
        await page.locator("#operation-team-a").selectOption({ index: 0 });
        await page.locator("#operation-team-b").selectOption({ index: 1 });
        await page.locator("#operation-team-ok").click();
        await page.locator("#operation-start-check-dialog").waitFor({ state: "visible" });
        await page.locator("#operation-start-check-confirm").click();
        await page.locator("#operation-draw").waitFor({ state: "visible" });

        await page.locator("#operation-balls-fullscreen").click();
        await page.waitForFunction(() => document.body.classList.contains("operation-balls-compact"));
        if (!(await page.locator("#operation-draw").evaluate((screen) => !screen.classList.contains("hidden")))) {
          failures.push(`${label}: operation court fullscreen hid the draw screen`);
        }
        await page.locator("#operation-balls-fullscreen").click();
        await page.waitForFunction(() => !document.body.classList.contains("operation-balls-compact"));
        if (!(await page.locator("#operation-draw").evaluate((screen) => !screen.classList.contains("hidden")))) {
          failures.push(`${label}: operation court fullscreen did not return to the draw screen`);
        }

        const heightState = await page.evaluate(() => ({
          bodyClass: document.body.className,
          client: document.documentElement.clientHeight,
          drawHeight: document.querySelector("#operation-draw")?.getBoundingClientRect().height || 0,
          headerHeight: document.querySelector("#app-header")?.getBoundingClientRect().height || 0,
          shellMinHeight: getComputedStyle(document.querySelector(".operation-shell")).minHeight,
          scroll: document.documentElement.scrollHeight,
        }));
        if (!target.mobile && heightState.scroll > heightState.client + 2) {
          failures.push(`${label}: draw vertical overflow ${heightState.scroll}/${heightState.client} (header ${heightState.headerHeight}, draw ${heightState.drawHeight}, shell min ${heightState.shellMinHeight}, body ${heightState.bodyClass})`);
        }
        for (const selector of ["#operation-ball-random", "#operation-time-random", "#operation-ready"]) {
          await page.locator(selector).scrollIntoViewIfNeeded();
          const box = await page.locator(selector).boundingBox();
          if (!box || box.x < -1 || box.x + box.width > target.width + 1 || (!target.mobile && (box.y < -1 || box.y + box.height > target.height + 1))) {
            failures.push(`${label}: draw control outside viewport: ${selector}`);
          }
        }
        if (!(await page.locator("#operation-time-random").isDisabled())) failures.push(`${label}: time draw enabled before ball draw`);
        if (!(await page.locator("#operation-ready").isDisabled())) failures.push(`${label}: ready enabled before draws`);
        await page.locator("#operation-ball-random").click();
        if (await page.locator("#operation-time-random").isDisabled()) failures.push(`${label}: time draw stayed disabled after ball draw`);
        if (!(await page.locator("#operation-ready").isDisabled())) failures.push(`${label}: ready enabled before time draw`);
        await page.locator("#operation-time-random").click();
        if (await page.locator("#operation-ready").isDisabled()) failures.push(`${label}: ready stayed disabled after both draws`);
        await page.locator("#operation-ready").click();
        await page.locator("#operation-ready-confirm").click();
        await page.locator("#screen-timer .timer-face").waitFor({ state: "visible" });
        if (!(await page.locator("#screen-timer").evaluate((screen) => screen.classList.contains("active")))) failures.push(`${label}: timer screen did not become active`);
        await page.waitForTimeout(80);
        const preparedTime = (await page.locator("#timer-time").textContent())?.trim();
        const preparedLayout = await page.locator("#dashboard-court .ball").evaluateAll((balls) => balls.map((ball) => ({
          className: ball.className,
          left: ball.style.left,
          top: ball.style.top,
        })));
        await holdReturnButton(page, "#operation-timer-back");
        await page.locator("#operation-action-dialog").waitFor({ state: "visible" });
        await holdButton(page, "#operation-action-confirm");
        await page.locator("#operation-draw").waitFor({ state: "visible" });
        if (!(await page.locator("#operation-ball-random").isDisabled())) failures.push(`${label}: ball draw was re-enabled after timer accident return`);
        if (!(await page.locator("#operation-time-random").isDisabled())) failures.push(`${label}: time draw was re-enabled after timer accident return`);
        if (await page.locator("#operation-ready").isDisabled()) failures.push(`${label}: ready stayed disabled after timer accident return`);
        const returnedTime = (await page.locator("#dashboard-time").textContent())?.trim();
        if (returnedTime !== preparedTime) failures.push(`${label}: prepared time changed after timer accident return (${preparedTime} -> ${returnedTime})`);
        const returnedLayout = await page.locator("#dashboard-court .ball").evaluateAll((balls) => balls.map((ball) => ({
          className: ball.className,
          left: ball.style.left,
          top: ball.style.top,
        })));
        if (JSON.stringify(returnedLayout) !== JSON.stringify(preparedLayout)) failures.push(`${label}: ball layout changed after timer accident return`);
        await page.locator("#operation-ready").click();
        await page.locator("#operation-ready-confirm").click();
        await page.locator("#screen-timer .timer-face").waitFor({ state: "visible" });
        if (!(await page.locator("#screen-timer").evaluate((screen) => screen.classList.contains("active")))) failures.push(`${label}: timer screen did not reactivate after accident return`);
        if ((await page.locator("#timer-time").textContent())?.trim() !== preparedTime) failures.push(`${label}: timer did not resume from the prepared duration`);
        if ((await page.locator("#timer-end").textContent())?.trim() !== "試合中断") failures.push(`${label}: match-flow timer end label is not explicit`);
        const timerEndColors = await page.locator("#timer-end").evaluate((button) => {
          const style = getComputedStyle(button);
          return { background: style.backgroundColor, color: style.color };
        });
        if (!/rgb\((?:1[5-9]\d|2\d\d),\s*(?:[0-9]|[1-8]\d),\s*(?:[0-9]|[1-8]\d)\)/.test(timerEndColors.background)) {
          failures.push(`${label}: match-flow force-end button is not red (${timerEndColors.background})`);
        }
        if (await page.locator("#timer-ten").isVisible()) failures.push(`${label}: 10-count visible in match-flow timer`);
        if (await page.locator("#timer-five").isVisible()) failures.push(`${label}: 5-count visible in match-flow timer`);
        const preStartBox = await page.locator("#timer-start").boundingBox();
        const progressBox = await page.locator("#timer-progress").boundingBox();
        if (!preStartBox || !progressBox || preStartBox.width < progressBox.width * 0.9) {
          failures.push(`${label}: match-flow start button is not wide enough (${JSON.stringify({ preStartBox, progressBox })})`);
        }
        await page.locator("#timer-start").click();
        await page.waitForTimeout(40);
        await page.locator("#timer-end").click();
        if (!(await page.locator("#cold-notice").textContent())?.includes("試合中断")) failures.push(`${label}: first interrupt press did not show the warning`);
        if (!(await page.locator("body").evaluate((body) => body.classList.contains("timer-running")))) failures.push(`${label}: first force-end press stopped the timer`);
        await page.locator("#timer-end").click();
        await page.locator("#timer-end-confirm-dialog").waitFor({ state: "visible" });
        if (!(await page.locator("#timer-end-confirm-dialog").textContent())?.includes("試合を中断")) failures.push(`${label}: interrupt confirmation wording is unclear`);
        await page.locator('#timer-end-confirm-dialog button[value="cancel"]').click();
        if (!(await page.locator("body").evaluate((body) => body.classList.contains("timer-running")))) failures.push(`${label}: cancelling force-end stopped the timer`);
        if (await page.locator("#timer-start").isVisible()) failures.push(`${label}: pause control is visible in a running match-flow timer`);
        const endBox = await page.locator("#timer-end").boundingBox();
        if (!endBox || !progressBox || endBox.width < progressBox.width * 0.9 || endBox.height < 64 || endBox.x < -1 || endBox.y < -1 || endBox.x + endBox.width > target.width + 1 || endBox.y + endBox.height > target.height + 1) {
          failures.push(`${label}: match-flow interrupt action is too small or outside viewport: ${JSON.stringify({ endBox, progressBox })}`);
        }
        const timerVisual = await page.evaluate(() => ({
          fontSize: Number.parseFloat(getComputedStyle(document.querySelector("#timer-time")).fontSize),
          time: document.querySelector("#timer-time")?.getBoundingClientRect().toJSON(),
          progress: document.querySelector("#timer-progress")?.getBoundingClientRect().toJSON(),
          columns: getComputedStyle(document.querySelector("#screen-timer .controls")).gridTemplateColumns.split(" ").length,
        }));
        const minimumTimerFontSize = target.mobile ? 80 : 100;
        if (timerVisual.fontSize < minimumTimerFontSize) failures.push(`${label}: match-flow timer digits too small (${timerVisual.fontSize}px)`);
        if (!timerVisual.time || timerVisual.time.left < -1 || timerVisual.time.right > target.width + 1 || timerVisual.time.top < -1 || timerVisual.time.bottom > target.height + 1) {
          failures.push(`${label}: match-flow timer digits are outside viewport (${JSON.stringify(timerVisual.time)})`);
        }
        if (timerVisual.time && timerVisual.progress && timerVisual.time.bottom > timerVisual.progress.top - 4) {
          failures.push(`${label}: match-flow timer digits overlap progress (${JSON.stringify({ time: timerVisual.time, progress: timerVisual.progress })})`);
        }
        if (timerVisual.columns !== 2) failures.push(`${label}: match-flow timer controls are not two columns`);
        if (edition.name === "venue" && target.name === "desktop") {
          await page.locator("#timer-end").click();
          await page.locator("#timer-end").click();
          await page.locator("#timer-end-confirm-dialog").waitFor({ state: "visible" });
          await page.locator("#timer-end-confirm").click();
          await page.locator("#record-input").waitFor({ state: "visible" });
          if (!(await page.locator("#operation-result-back").isVisible())) failures.push(`${label}: operation return menu is hidden on result input`);
          if (await page.locator("#back-balls").isVisible()) failures.push(`${label}: ball-layout return unexpectedly visible on result input`);
          const returnButtonBox = await page.locator("#operation-result-back").boundingBox();
          if (!returnButtonBox || returnButtonBox.width < 120 || returnButtonBox.height < 48) {
            failures.push(`${label}: prepared-time timer return is too small (${JSON.stringify(returnButtonBox)})`);
          }
          await holdReturnButton(page, "#operation-result-back", 450);
          if (await page.locator("#operation-return-dialog").isVisible()) failures.push(`${label}: short hold opened the operation return menu`);
          await holdReturnButton(page, "#operation-result-back");
          await page.locator("#operation-return-dialog").waitFor({ state: "visible" });
          await page.locator("#operation-return-primary").click();
          await page.locator("#operation-action-dialog").waitFor({ state: "visible" });
          await holdButton(page, "#operation-action-confirm");
          await page.locator("#screen-timer .timer-face").waitFor({ state: "visible" });
          if (!(await page.locator("#screen-timer").evaluate((screen) => screen.classList.contains("active")))) failures.push(`${label}: prepared-time return did not activate timer`);
          if (!(await page.locator("body").evaluate((body) => body.classList.contains("operation-timer-active")))) failures.push(`${label}: prepared-time return opened the standalone timer instead of the operation timer`);
          for (const selector of ["#timer-mode", "#timer-reset", "#timer-step"]) {
            if (await page.locator(selector).isVisible()) failures.push(`${label}: standalone timer control is visible after operation return: ${selector}`);
          }
          if ((await page.locator("#timer-time").textContent())?.trim() !== preparedTime) failures.push(`${label}: prepared-time return rerandomized the timer`);
          if (!(await page.locator("#timer-start").isVisible())) failures.push(`${label}: prepared-time return did not reset timer to ready state`);
          const retriedLayout = await page.locator("#dashboard-court .ball").evaluateAll((balls) => balls.map((ball) => ({
            className: ball.className,
            left: ball.style.left,
            top: ball.style.top,
          })));
          if (JSON.stringify(retriedLayout) !== JSON.stringify(preparedLayout)) failures.push(`${label}: prepared-time return changed the ball layout`);
        }
        process.stdout.write(`PASS ${label}\n`);
      } catch (error) {
        const message = `${label}: ${error instanceof Error ? error.message : String(error)}`;
        failures.push(message);
        process.stderr.write(`FAIL ${message}\n`);
      } finally {
        await context.close();
      }
    }
  }

  if ((!editionFilter || editionFilter === "venue") && (!targetFilter || targetFilter === "desktop")) {
    for (const edition of ["venue", "general"]) {
      const matchLabelContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      await matchLabelContext.addInitScript(() => {
        try {
          delete Navigator.prototype.serviceWorker;
        } catch {
          // Service Worker behavior is verified separately below.
        }
        Object.defineProperty(Element.prototype, "requestFullscreen", {
          configurable: true,
          value: async () => undefined,
        });
      });
      const matchLabelPage = await matchLabelContext.newPage();
      const label = `${edition}/operation-match-label`;
      try {
        const editionPath = edition === "general" ? "/general/" : "/";
        await matchLabelPage.goto(`${baseUrl}${editionPath}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
        if (edition === "general") {
          await matchLabelPage.locator('[data-screen="operation"]').click();
          await matchLabelPage.locator("#screen-operation").waitFor({ state: "visible" });
        }
        await matchLabelPage.waitForFunction(() => document.querySelectorAll("#operation-court option").length > 0);
        await matchLabelPage.locator("#operation-prepare").click();
        await matchLabelPage.locator("#operation-match-type").selectOption({ index: 1 });
        await matchLabelPage.locator("#operation-team-a").selectOption({ index: 0 });
        await matchLabelPage.locator("#operation-team-b").selectOption({ index: 1 });
        await matchLabelPage.locator("#operation-team-ok").click();
        await matchLabelPage.locator("#operation-start-check-confirm").click();
        await matchLabelPage.locator("#operation-ball-random").click();
        await matchLabelPage.locator("#operation-time-random").click();
        await matchLabelPage.locator("#operation-ready").click();
        await matchLabelPage.locator("#operation-ready-confirm").click();

        const matchLabel = matchLabelPage.locator("#operation-timer-match-label");
        if (await matchLabel.isVisible()) failures.push(`${label}: match label is visible by default`);
        await matchLabelPage.evaluate(() => {
          const key = "tennis-assist-admin-v1";
          const settings = JSON.parse(localStorage.getItem(key) ?? "{}");
          settings.showOperationMatchLabel = true;
          settings.operationMatchLabelSize = 46;
          localStorage.setItem(key, JSON.stringify(settings));
          document.dispatchEvent(new CustomEvent("admin-settings-updated"));
        });
        await matchLabel.waitFor({ state: "visible" });
        if ((await matchLabel.textContent())?.trim() !== "第1マッチ") failures.push(`${label}: incorrect match label text`);
        if ((await matchLabel.evaluate((node) => getComputedStyle(node).fontSize)) !== "46px") failures.push(`${label}: configured font size was not applied`);
        for (const viewport of [
          { width: 1280, height: 900 },
          { width: 402, height: 874 },
          { width: 834, height: 1194 },
          { width: 1080, height: 810 },
        ]) {
          await matchLabelPage.setViewportSize(viewport);
          const box = await matchLabel.boundingBox();
          if (!box || box.x < -1 || box.y < -1 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
            failures.push(`${label}: match label outside viewport ${viewport.width}x${viewport.height} (${JSON.stringify(box)})`);
          }
        }
        await matchLabelPage.locator("#timer-start").click();
        if (await matchLabel.isVisible()) failures.push(`${label}: match label remained visible after timer start`);
        process.stdout.write(`PASS ${label}\n`);
      } catch (error) {
        const message = `${label}: ${error instanceof Error ? error.message : String(error)}`;
        failures.push(message);
        process.stderr.write(`FAIL ${message}\n`);
      } finally {
        await matchLabelContext.close();
      }
    }
  }

  if ((!editionFilter || editionFilter === "venue") && (!targetFilter || targetFilter === "desktop")) {
    const restrictedRulesContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await restrictedRulesContext.addInitScript(() => {
      try {
        delete Navigator.prototype.serviceWorker;
      } catch {
        // Service Worker behavior is verified separately below.
      }
    });
    const restrictedRulesPage = await restrictedRulesContext.newPage();
    const label = "venue/mie-restricted-rules";
    try {
      await restrictedRulesPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 20_000 });
      const restrictedRules = restrictedRulesPage.locator("[data-admin-rule]");
      if (await restrictedRules.first().isVisible()) failures.push(`${label}: restricted rule is visible before admin login`);
      await restrictedRulesPage.locator("#development-nav").click();
      await restrictedRulesPage.locator("#admin-password").fill("mie");
      await restrictedRulesPage.locator("#admin-unlock").click();
      await restrictedRulesPage.locator("#admin-settings").waitFor({ state: "visible" });
      await restrictedRulesPage.locator("#admin-advanced-details").evaluate((element) => { element.open = true; });
      await restrictedRulesPage.locator("#venue-screen-setting").evaluate((element) => { element.open = true; });
      await restrictedRulesPage.locator("#venue-screen-rules").check();
      await restrictedRulesPage.locator('[data-screen="rules"]').click();
      if (!(await restrictedRules.first().isVisible())) failures.push(`${label}: restricted rule is hidden after Mie admin login`);
      process.stdout.write(`PASS ${label}\n`);
    } catch (error) {
      const message = `${label}: ${error instanceof Error ? error.message : String(error)}`;
      failures.push(message);
      process.stderr.write(`FAIL ${message}\n`);
    } finally {
      await restrictedRulesContext.close();
    }
  }

  if ((!editionFilter || editionFilter === "venue") && (!targetFilter || targetFilter === "desktop")) {
    const operationContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await operationContext.addInitScript(() => {
      try {
        delete Navigator.prototype.serviceWorker;
      } catch {
        // Service Worker behavior is verified separately below.
      }
      const gasUrl = "https://example.invalid/gas/exec";
      try {
        localStorage.setItem("tennis-assist-admin-v1", JSON.stringify({
          gasUrl,
          apiKey: "TEST_KEY",
          sendEnabled: true,
          gasConnectedAt: new Date().toISOString(),
          gasConnectedUrl: gasUrl,
        }));
      } catch {
        // The init script also runs for the initial opaque about:blank document.
      }
    });
    const operationPage = await operationContext.newPage();
    const sentSeriesBodies = [];
    await operationPage.route("https://example.invalid/gas/exec**", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const body = request.postDataJSON();
        sentSeriesBodies.push(body);
      }
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, success: true, status: "ok" }) });
    });
    const label = "venue/operation-pause-resume-final-correction";
    try {
      await operationPage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 20_000 });
      await operationPage.waitForFunction(() => document.querySelectorAll("#operation-court option").length > 0);
      await operationPage.locator("#operation-prepare").click();
      await operationPage.locator("#operation-match-type").selectOption({ index: 1 });
      const teamA = await operationPage.locator("#operation-team-a option").nth(0).textContent();
      const teamB = await operationPage.locator("#operation-team-b option").nth(1).textContent();
      if (!teamA || !teamB) throw new Error("operation_test_teams_unavailable");
      await operationPage.locator("#operation-team-a").selectOption({ index: 0 });
      await operationPage.locator("#operation-team-b").selectOption({ index: 1 });
      await operationPage.locator("#operation-team-ok").click();
      await operationPage.locator("#operation-start-check-confirm").click();
      await operationPage.locator("#operation-ball-random").click();
      await operationPage.locator("#operation-time-random").click();
      await holdButton(operationPage, '[data-operation-return-context="draw"]');
      await operationPage.locator("#operation-return-dialog").waitFor({ state: "visible" });
      await operationPage.locator("#operation-cancel-record").click();
      await operationPage.locator("#operation-action-dialog").waitFor({ state: "visible" });
      await holdButton(operationPage, "#operation-action-confirm", 450);
      if (!(await operationPage.locator("#operation-action-dialog").isVisible())) failures.push(`${label}: short hold cancelled the match`);
      await holdButton(operationPage, "#operation-action-confirm");
      await operationPage.locator("#operation-prepare").waitFor({ state: "visible" });
      if (await operationPage.locator("#paused-operation-panel").isVisible()) failures.push(`${label}: an unfinished first match created a paused-operation warning`);
      if (await operationPage.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("tennis-assist-paused-operation-v1-")))) failures.push(`${label}: an unfinished first match was retained as a paused record`);

      await operationPage.locator("#operation-prepare").click();
      await operationPage.locator("#operation-match-type").selectOption({ index: 1 });
      await operationPage.locator("#operation-team-a").selectOption({ label: teamA.trim() });
      await operationPage.locator("#operation-team-b").selectOption({ label: teamB.trim() });
      await operationPage.locator("#operation-team-ok").click();
      await operationPage.locator("#operation-start-check-confirm").click();
      await operationPage.locator("#operation-ball-random").click();
      await operationPage.locator("#operation-time-random").click();
      await operationPage.locator("#operation-ready").click();
      await operationPage.locator("#operation-ready-confirm").click();
      await operationPage.locator("#timer-start").click();
      await operationPage.locator("#timer-end").click();
      await operationPage.locator("#timer-end").click();
      await operationPage.locator("#timer-end-confirm").click();
      await operationPage.locator("#record-input").waitFor({ state: "visible" });
      await operationPage.locator("#a-orange").selectOption("4");
      await operationPage.locator("#a-purple").selectOption("1");
      await operationPage.locator("#b-orange").selectOption("4");
      await operationPage.locator("#b-purple").selectOption("1");
      await operationPage.locator("#record-save").click();
      await operationPage.locator("#confirm-dialog").waitFor({ state: "visible" });
      await operationPage.locator("#confirm-save").click();
      if (sentSeriesBodies.length !== 0) failures.push(`${label}: GAS received data after only the first match was saved`);
      await operationPage.locator("#operation-between").waitFor({ state: "visible" });
      await operationPage.locator("#operation-next-match").click();
      await operationPage.locator("#operation-draw").waitFor({ state: "visible" });
      await operationPage.locator("#operation-ball-random").click();
      await operationPage.locator("#operation-time-random").click();

      const preparedTime = (await operationPage.locator("#dashboard-time").textContent())?.trim();
      const preparedLayout = await operationPage.locator("#dashboard-court .ball").evaluateAll((balls) => balls.map((ball) => ({
        className: ball.className,
        left: ball.style.left,
        top: ball.style.top,
      })));
      await holdButton(operationPage, '[data-operation-return-context="draw"]');
      await operationPage.locator("#operation-return-dialog").waitFor({ state: "visible" });
      await operationPage.locator("#operation-cancel-record").click();
      await operationPage.locator("#operation-action-dialog").waitFor({ state: "visible" });
      await holdButton(operationPage, "#operation-action-confirm");
      await operationPage.locator("#paused-operation-panel").waitFor({ state: "visible" });
      if (!(await operationPage.locator("#paused-operation-summary").textContent())?.includes("送信されていません")) failures.push(`${label}: paused match does not clearly state that it was not sent`);

      await operationPage.reload({ waitUntil: "domcontentloaded" });
      await operationPage.locator("#paused-operation-panel").waitFor({ state: "visible" });
      await operationPage.locator("#paused-operation-resume").click();
      await operationPage.locator("#operation-draw").waitFor({ state: "visible" });
      if ((await operationPage.locator("#dashboard-time").textContent())?.trim() !== preparedTime) failures.push(`${label}: prepared time changed after reload and resume`);
      const resumedLayout = await operationPage.locator("#dashboard-court .ball").evaluateAll((balls) => balls.map((ball) => ({
        className: ball.className,
        left: ball.style.left,
        top: ball.style.top,
      })));
      if (JSON.stringify(resumedLayout) !== JSON.stringify(preparedLayout)) failures.push(`${label}: ball layout changed after reload and resume`);
      if (!(await operationPage.locator("#operation-ball-random").isDisabled()) || !(await operationPage.locator("#operation-time-random").isDisabled()) || await operationPage.locator("#operation-ready").isDisabled()) {
        failures.push(`${label}: resumed draw controls are not locked to the completed state`);
      }

      for (let match = 2; match <= 3; match += 1) {
        if (match > 2) {
          await operationPage.locator("#operation-ball-random").click();
          await operationPage.locator("#operation-time-random").click();
        }
        await operationPage.locator("#operation-ready").click();
        await operationPage.locator("#operation-ready-confirm").click();
        await operationPage.locator("#timer-start").click();
        await operationPage.locator("#timer-end").click();
        await operationPage.locator("#timer-end").click();
        await operationPage.locator("#timer-end-confirm").click();
        await operationPage.locator("#record-input").waitFor({ state: "visible" });
        await operationPage.locator("#a-orange").selectOption("4");
        await operationPage.locator("#a-purple").selectOption("1");
        await operationPage.locator("#b-orange").selectOption("4");
        await operationPage.locator("#b-purple").selectOption("1");

        await operationPage.locator("#record-save").click();
        await operationPage.locator("#confirm-dialog").waitFor({ state: "visible" });
        await operationPage.locator("#confirm-save").click();
        if (sentSeriesBodies.length !== 0) failures.push(`${label}: GAS received data before all three matches and both agreements were finalized`);
        if (match < 3) {
          await operationPage.locator("#operation-between").waitFor({ state: "visible" });
          await operationPage.locator("#operation-next-match").click();
          await operationPage.locator("#operation-draw").waitFor({ state: "visible" });
        }
      }

      await operationPage.locator("#final-results").waitFor({ state: "visible" });
      await operationPage.locator("#final-meta-edit").click();
      await operationPage.locator("#final-team-a-select").selectOption({ label: teamB.trim() });
      await operationPage.locator("#final-team-b-select").selectOption({ label: teamA.trim() });
      await operationPage.locator("#final-meta-save").click();
      await operationPage.locator("#final-meta-confirm-dialog").waitFor({ state: "visible" });
      await holdButton(operationPage, "#final-meta-confirm-hold", 450);
      if (!(await operationPage.locator("#final-meta-confirm-dialog").isVisible())) failures.push(`${label}: short hold applied final team correction`);
      await holdButton(operationPage, "#final-meta-confirm-hold");
      await operationPage.locator("#final-meta-confirm-dialog").waitFor({ state: "hidden" });
      const finalTeams = await operationPage.locator("#final-matches .final-match-team strong").evaluateAll((elements) => elements.map((element) => element.textContent?.trim()));
      if (finalTeams[0] !== teamB.trim() || finalTeams[1] !== teamA.trim()) failures.push(`${label}: corrected team names did not reach final match rows (${finalTeams.slice(0, 2).join(" / ")})`);
      if (!(await operationPage.locator("#record-status").textContent())?.includes("両チームでもう一度確認")) failures.push(`${label}: final correction did not reset the agreement flow`);
      if (!(await operationPage.locator("#finalize").isDisabled())) failures.push(`${label}: final confirmation button was enabled before agreements`);
      if (await operationPage.locator("#finalize").evaluate((button) => button.classList.contains("ready"))) failures.push(`${label}: final confirmation button looked ready before agreements`);
      await operationPage.locator("#agree-a").click();
      await operationPage.locator("#agreement-confirm").waitFor({ state: "visible" });
      await holdButton(operationPage, "#agreement-accept", 1150);
      if (sentSeriesBodies.length !== 0) failures.push(`${label}: GAS received data after only the first team agreed`);
      if (!(await operationPage.locator("#finalize").isDisabled())) failures.push(`${label}: final confirmation button was enabled after only one agreement`);
      if (await operationPage.locator("#finalize").evaluate((button) => button.classList.contains("ready"))) failures.push(`${label}: final confirmation button looked ready after only one agreement`);
      await operationPage.locator("#agree-b").click();
      await operationPage.locator("#agreement-confirm").waitFor({ state: "visible" });
      await holdButton(operationPage, "#agreement-accept", 1150);
      if (sentSeriesBodies.length !== 0) failures.push(`${label}: GAS received data before the final confirmation`);
      if (await operationPage.locator("#finalize").isDisabled()) failures.push(`${label}: final confirmation button stayed disabled after both agreements`);
      if (!(await operationPage.locator("#finalize").evaluate((button) => button.classList.contains("ready")))) failures.push(`${label}: final confirmation button did not turn ready after both agreements`);
      await operationPage.locator("#finalize").click();
      await operationPage.waitForFunction(() => document.querySelector("#completion-panel")?.classList.contains("hidden"), null, { timeout: 10_000 });
      if (sentSeriesBodies.length !== 1) {
        failures.push(`${label}: finalized series was sent ${sentSeriesBodies.length} times instead of once`);
      } else {
        const sent = sentSeriesBodies[0];
        const detailNumbers = Array.isArray(sent.detail_rows)
          ? sent.detail_rows.filter((row) => row?.csv_row?.[1] === "マッチ").map((row) => row.csv_row[6]).sort((a, b) => a - b)
          : [];
        if (sent.event !== "series_result" || sent.payload?.teamAAgreed !== true || sent.payload?.teamBAgreed !== true
          || sent.payload?.completedMatchCount !== 3 || sent.payload?.finalized !== true || detailNumbers.join(",") !== "1,2,3") {
          failures.push(`${label}: finalized series payload is missing its three-match/agreement proof`);
        }
      }
      process.stdout.write(`PASS ${label}\n`);
    } catch (error) {
      const message = `${label}: ${error instanceof Error ? error.message : String(error)}`;
      failures.push(message);
      process.stderr.write(`FAIL ${message}\n`);
    } finally {
      await operationContext.close();
    }
  }

  const refereeContext = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await refereeContext.addInitScript(() => {
    try {
      delete Navigator.prototype.serviceWorker;
    } catch {
      // Service Worker behavior is verified separately below.
    }
    window.__timerAudioStarts = [];
    class FakeAudioParam {
      value = 0;
      setValueAtTime(value) { this.value = value; }
      exponentialRampToValueAtTime(value) { this.value = value; }
    }
    class FakeAudioNode extends EventTarget {
      connect() { return this; }
    }
    class FakeOscillator extends FakeAudioNode {
      frequency = new FakeAudioParam();
      type = "sine";
      start(when) { window.__timerAudioStarts.push({ frequency: this.frequency.value, when }); }
      stop() {}
    }
    class FakeGain extends FakeAudioNode {
      gain = new FakeAudioParam();
    }
    class FakeCompressor extends FakeAudioNode {
      threshold = new FakeAudioParam();
      knee = new FakeAudioParam();
      ratio = new FakeAudioParam();
      attack = new FakeAudioParam();
      release = new FakeAudioParam();
    }
    class FakeAudioContext {
      currentTime = 100;
      state = "running";
      destination = new FakeAudioNode();
      createDynamicsCompressor() { return new FakeCompressor(); }
      createOscillator() { return new FakeOscillator(); }
      createGain() { return new FakeGain(); }
      resume() { return Promise.resolve(); }
    }
    Object.defineProperty(window, "AudioContext", { configurable: true, value: FakeAudioContext });
  });
  const refereePage = await refereeContext.newPage();
  try {
    await refereePage.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await refereePage.evaluate(() => {
      const button = document.querySelector('[data-screen="timer"]');
      if (button instanceof HTMLElement) button.click();
    });
    const mainTimerText = (await refereePage.locator("#timer-time").textContent())?.trim() || "00 : 00";
    const [mainMinutes, mainSeconds] = mainTimerText.split(":").map((part) => Number.parseInt(part.trim(), 10));
    const mainTotal = mainMinutes * 60 + mainSeconds;
    await refereePage.locator("#timer-start").click();
    await refereePage.waitForTimeout(30);
    if (await refereePage.locator("#timer-start").isVisible()) failures.push("main-timer: pause control is visible after start");
    const mainCuePlan = await refereePage.evaluate(() => window.__timerAudioStarts.filter((_, index) => index % 3 === 0));
    const expectedMainFrequencies = [2093, 1568, 1760, 1397, 1397, 1397, 1397, 1397, 2093];
    const expectedMainOffsets = [10, 30, mainTotal - 10, mainTotal - 5, mainTotal - 4, mainTotal - 3, mainTotal - 2, mainTotal - 1, mainTotal];
    const mainCueOffsets = mainCuePlan.map((cue) => cue.when - 100);
    const mainFrequencies = mainCuePlan.map((cue) => cue.frequency);
    if (JSON.stringify(mainFrequencies) !== JSON.stringify(expectedMainFrequencies)) failures.push(`main-timer: audio pitches are incorrect (${mainFrequencies.join(",")})`);
    if (mainCueOffsets.length !== expectedMainOffsets.length || mainCueOffsets.some((offset, index) => Math.abs(offset - expectedMainOffsets[index]) > 0.08)) {
      failures.push(`main-timer: audio offsets are incorrect (${mainCueOffsets.map((offset) => offset.toFixed(3)).join(",")}; expected ${expectedMainOffsets.join(",")})`);
    }
    if (!(await refereePage.locator("#timer-ten").isVisible()) || !(await refereePage.locator("#timer-five").isVisible())) failures.push("main-timer: manual countdown controls disappeared");
    process.stdout.write("PASS main-timer/audio-schedule\n");
    await refereePage.evaluate(() => { window.__timerAudioStarts = []; });
    await refereePage.evaluate(() => {
      const button = document.querySelector('[data-screen="referee"]');
      if (button instanceof HTMLElement) button.click();
    });
    await refereePage.locator("#referee-ten").click();
    const tenCuePlan = await refereePage.evaluate(() => window.__timerAudioStarts.filter((_, index) => index % 3 === 0));
    const tenOffsets = tenCuePlan.map((cue) => Number((cue.when - tenCuePlan[0].when).toFixed(3)));
    const tenFrequencies = tenCuePlan.map((cue) => cue.frequency);
    if (JSON.stringify(tenOffsets) !== JSON.stringify([0, 5, 6, 7, 8, 9, 10])) failures.push(`referee-timer: 10-count audio offsets are incorrect (${tenOffsets.join(",")})`);
    if (JSON.stringify(tenFrequencies) !== JSON.stringify([1047, 1175, 1175, 1175, 1175, 1175, 1760])) failures.push(`referee-timer: 10-count audio pitches are incorrect (${tenFrequencies.join(",")})`);
    await refereePage.evaluate(() => { window.__timerAudioStarts = []; });
    await refereePage.locator("#referee-five").click();
    const fiveCuePlan = await refereePage.evaluate(() => window.__timerAudioStarts.filter((_, index) => index % 3 === 0));
    const fiveOffsets = fiveCuePlan.map((cue) => Number((cue.when - fiveCuePlan[0].when).toFixed(3)));
    const fiveFrequencies = fiveCuePlan.map((cue) => cue.frequency);
    if (JSON.stringify(fiveOffsets) !== JSON.stringify([0, 1, 2, 3, 4, 5])) failures.push(`referee-timer: 5-count audio offsets are incorrect (${fiveOffsets.join(",")})`);
    if (JSON.stringify(fiveFrequencies) !== JSON.stringify([880, 880, 880, 880, 880, 1319])) failures.push(`referee-timer: 5-count audio pitches are incorrect (${fiveFrequencies.join(",")})`);
    const initialFive = (await refereePage.locator("#referee-time").textContent())?.trim();
    if (initialFive !== "05") failures.push(`referee-timer: 5-count did not start at 05 (${initialFive})`);
    await refereePage.waitForTimeout(1100);
    if ((await refereePage.locator("#referee-time").textContent())?.trim() !== "04") failures.push("referee-timer: 5-count display is not aligned to the first second boundary");
    await refereePage.locator(".referee-center").click();
    if ((await refereePage.locator("#referee-time").textContent())?.trim() !== "10") failures.push("referee-timer: tapping the active count area did not reset the timer");
    if ((await refereePage.locator("#referee-label").textContent())?.trim() !== "10カウント / 5カウントを選択") failures.push("referee-timer: count-area reset did not restore the idle label");
    await refereePage.locator("#referee-five").click();
    if ((await refereePage.locator("#referee-time").textContent())?.trim() !== "05") failures.push("referee-timer: 5-count could not restart after count-area reset");
    await refereePage.waitForTimeout(5100);
    if ((await refereePage.locator("#referee-time").textContent())?.trim() !== "00") failures.push("referee-timer: 5-count did not finish at 00");
    if (await refereePage.locator("#referee-return-timer").count()) failures.push("referee-timer: return-to-timer button should not be visible");
    await refereePage.locator("#referee-reset").click();
    if ((await refereePage.locator("#referee-time").textContent())?.trim() !== "10") failures.push("referee-timer: reset did not restore the countdown after finish");
    process.stdout.write("PASS referee-timer/countdown-timing\n");
  } catch (error) {
    failures.push(`referee-timer/countdown-timing: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await refereeContext.close();
  }

  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 20_000 });
    await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) throw new Error("service_worker_unavailable");
      await navigator.serviceWorker.ready;
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.locator("#operation-prepare").waitFor({ state: "visible", timeout: 5_000 });
    await context.setOffline(true);
    await page.reload({ waitUntil: "domcontentloaded", timeout: 10_000 });
    await page.locator("#operation-prepare").waitFor({ state: "visible", timeout: 5_000 });
    process.stdout.write("PASS service-worker/offline-navigation\n");
  } catch (error) {
    failures.push(`service-worker/offline-navigation: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await context.setOffline(false);
    await context.close();
  }
} finally {
  await browser.close();
  if (testServer) await new Promise((resolveClose) => testServer.close(resolveClose));
}

if (failures.length) {
  process.stderr.write(`\nStability smoke failures (${failures.length}):\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`);
  process.exit(1);
}

process.stdout.write("Stability smoke checks passed.\n");
