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
  { name: "iphone-se", width: 375, height: 667, mobile: true },
  { name: "iphone-17-pro", width: 402, height: 874, mobile: true },
  { name: "ipad-air2-portrait", width: 768, height: 1024, mobile: true },
  { name: "ipad-air2-landscape", width: 1024, height: 768, mobile: true },
  { name: "ipad7-portrait", width: 810, height: 1080, mobile: true },
  { name: "ipad7-landscape", width: 1080, height: 810, mobile: true },
];
const editions = [
  { name: "venue", path: "/" },
  { name: "general", path: "/general/" },
];
const drawTargets = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "iphone-17-pro", width: 402, height: 874, mobile: true },
  { name: "ipad-air2-landscape", width: 1024, height: 768, mobile: true },
  { name: "ipad7-landscape", width: 1080, height: 810, mobile: true },
];
const screens = ["dashboard", "timer", "referee", "balls", "records", "rules", "links"];

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const edition of editions) {
    for (const target of targets) {
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
        if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
      });

      try {
        await page.goto(`${baseUrl}${edition.path}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
        if (edition.name === "general") {
          await page.evaluate(() => {
            const button = document.querySelector('[data-screen="operation"]');
            if (button instanceof HTMLElement) button.click();
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

  for (const edition of editions) {
    for (const target of drawTargets) {
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
        if (edition.name === "general") {
          await page.evaluate(() => {
            const button = document.querySelector('[data-screen="operation"]');
            if (button instanceof HTMLElement) button.click();
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
        await page.locator("#screen-timer").waitFor({ state: "visible" });
        await page.waitForTimeout(80);
        if (await page.locator("#timer-ten").isVisible()) failures.push(`${label}: 10-count visible in match-flow timer`);
        if (await page.locator("#timer-five").isVisible()) failures.push(`${label}: 5-count visible in match-flow timer`);
        const preStartBox = await page.locator("#timer-start").boundingBox();
        const progressBox = await page.locator("#timer-progress").boundingBox();
        if (!preStartBox || !progressBox || preStartBox.width < progressBox.width * 0.9) {
          failures.push(`${label}: match-flow start button is not wide enough (${JSON.stringify({ preStartBox, progressBox })})`);
        }
        await page.locator("#timer-start").click();
        await page.waitForTimeout(40);
        for (const selector of ["#timer-start", "#timer-end"]) {
          const box = await page.locator(selector).boundingBox();
          if (!box || box.width < 120 || box.height < 64 || box.x < -1 || box.y < -1 || box.x + box.width > target.width + 1 || box.y + box.height > target.height + 1) {
            failures.push(`${label}: match-flow timer action is too small or outside viewport: ${selector} ${JSON.stringify(box)}`);
          }
        }
        const timerVisual = await page.evaluate(() => ({
          fontSize: Number.parseFloat(getComputedStyle(document.querySelector("#timer-time")).fontSize),
          columns: getComputedStyle(document.querySelector("#screen-timer .controls")).gridTemplateColumns.split(" ").length,
        }));
        const minimumTimerFontSize = target.mobile ? 74 : 88;
        if (timerVisual.fontSize < minimumTimerFontSize) failures.push(`${label}: match-flow timer digits too small (${timerVisual.fontSize}px)`);
        if (timerVisual.columns !== 2) failures.push(`${label}: match-flow timer controls are not two columns`);
        process.stdout.write(`PASS ${label}\n`);
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await context.close();
      }
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
    const mainCuePlan = await refereePage.evaluate(() => window.__timerAudioStarts.filter((_, index) => index % 3 === 0));
    const expectedMainFrequencies = [1568, 1760, 1397, 1397, 1397, 1397, 1397, 2093];
    const expectedMainOffsets = [30, mainTotal - 10, mainTotal - 5, mainTotal - 4, mainTotal - 3, mainTotal - 2, mainTotal - 1, mainTotal];
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
    await page.reload({ waitUntil: "networkidle" });
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
