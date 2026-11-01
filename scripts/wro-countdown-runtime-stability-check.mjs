import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.WRO_BASE_URL || "http://127.0.0.1:4173/docs/wro-countdown/";
const KEY = "wro-countdown-settings-v4";
const browser = await chromium.launch({ headless: true });
const targetTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hour12: false
}).format(new Date(Date.now() + 7200000));

async function setup(init, argument) {
  const context = await browser.newContext({
    serviceWorkers: "block", viewport: { width: 1366, height: 768 }, reducedMotion: "reduce"
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(({ key, targetTime }) => {
    localStorage.setItem(key, JSON.stringify({
      mode: "timer", targetTime, timerSize: 116, noiseStrength: 0,
      autoWroEnabled: false, currentTimeLabel: "安定化検証"
    }));
    localStorage.setItem("wro-stability-sentinel", "keep");
  }, { key: KEY, targetTime });
  if (init) await page.addInitScript(init, argument);
  return { context, page, errors };
}

async function running(page) {
  await page.waitForFunction(() => document.getElementById("app")?.dataset.timerPhase === "countdown",
    null, { timeout: 9000 });
  assert(await page.locator("#mainValue").isVisible());
  const before = await page.locator("#mainValue").textContent();
  await page.waitForFunction(before => document.getElementById("mainValue")?.textContent !== before,
    before, { timeout: 3000 });
  const stored = await page.evaluate(key => ({
    settings: JSON.parse(localStorage.getItem(key)),
    sentinel: localStorage.getItem("wro-stability-sentinel")
  }), KEY);
  assert.equal(stored.settings.currentTimeLabel, "安定化検証");
  assert.equal(stored.settings.timerSize, 116);
  assert.equal(stored.sentinel, "keep");
}

try {
  for (const mode of ["registration", "update", "activation", "claim"]) {
    const { context, page, errors } = await setup(mode => {
      const sw = new EventTarget();
      const worker = new EventTarget();
      worker.state = mode === "activation" ? "installing" : "activated";
      const registration = {
        active: worker, installing: mode === "activation" ? worker : null,
        update() {
          window.workerUpdateCalls = (window.workerUpdateCalls || 0) + 1;
          return mode === "update"
            ? new Promise(resolve => { window.releaseWorker = resolve; }) : Promise.resolve();
        }
      };
      sw.controller = mode === "claim" ? null : worker;
      sw.register = () => mode === "registration"
        ? new Promise(resolve => { window.releaseWorker = () => resolve(registration); })
        : Promise.resolve(registration);
      if (mode === "activation") window.releaseWorker = () => {
        worker.state = "activated";
        worker.dispatchEvent(new Event("statechange"));
      };
      if (mode === "claim") window.releaseWorker = () => {
        sw.controller = worker;
        sw.dispatchEvent(new Event("controllerchange"));
      };
      window.workerListenerCount = 0;
      for (const target of [sw, worker]) {
        const add = target.addEventListener.bind(target);
        const remove = target.removeEventListener.bind(target);
        target.addEventListener = (...args) => { window.workerListenerCount++; add(...args); };
        target.removeEventListener = (...args) => { window.workerListenerCount--; remove(...args); };
      }
      Object.defineProperty(navigator, "serviceWorker", { value: sw });
    }, mode);
    let navigations = 0;
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) navigations++; });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await running(page);
    assert.equal(await page.evaluate(() => window.workerListenerCount), 0,
      `${mode}: timed-out worker retained listeners`);
    await page.evaluate(() => { window.releaseWorker(); });
    await page.waitForTimeout(100);
    assert.equal(navigations, 1, `${mode}: late worker restarted the running page`);
    if (mode === "registration") assert.equal(await page.evaluate(() => window.workerUpdateCalls || 0), 0);
    assert.deepEqual(errors, [], mode);
    await context.close();
  }

  // A transient module download error has a visible recovery action.
  for (const moduleName of ["entry", "version"]) {
    const { context, page, errors } = await setup();
    let failed = false;
    await page.route(new RegExp(`/v2/${moduleName}\\.js(?:\\?|$)`), async route => {
      if (!failed) {
        failed = true;
        await route.fulfill({ status: 503, body: "Temporary download failure" });
      } else await route.continue();
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    const error = page.locator('.bootStatus[role="alert"]');
    await error.waitFor();
    assert.match(await error.textContent(), /通信状態/);
    assert.equal(await error.evaluate(element => getComputedStyle(element).color), "rgb(247, 251, 252)");
    await page.getByRole("button", { name: "再読み込み", exact: true }).click();
    await running(page);
    assert.deepEqual(errors, []);
    await context.close();
  }

  // A blocked IndexedDB open must not hold up the clock or settings dialog.
  {
    const { context, page, errors } = await setup(() => {
      indexedDB.open = () => ({});
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await running(page);
    await page.click("#gear");
    assert(await page.locator("#done").isVisible());
    assert.deepEqual(errors, []);
    await context.close();
  }

  {
    const { context, page, errors } = await setup();
    await page.route(/\/audio-storage\.js(?:\?|$)/, async route => {
      const source = await readFile("docs/wro-countdown/v2/audio-storage.js", "utf8");
      await route.fulfill({ contentType: "text/javascript", body: source.replace(
        "export async function loadAudioFile() {",
        'export async function loadAudioFile() { throw new Error("Audio restore failed");'
      ) });
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await running(page);
    assert.match(await page.locator("#audioStatus").textContent(), /復元できません/);
    assert.deepEqual(errors, []);
    await context.close();
  }

  // Hold an old restore result until after a newer user file action completes.
  for (const action of ["select", "remove"]) {
    const { context, page, errors } = await setup();
    await page.route(/\/audio-storage\.js(?:\?|$)/, async route => {
      const source = await readFile("docs/wro-countdown/v2/audio-storage.js", "utf8");
      await route.fulfill({ contentType: "text/javascript", body: source.replace(
        "export async function loadAudioFile() {",
        `export async function loadAudioFile() {
          await new Promise(resolve => { window.releaseAudioRestore = resolve; });
          return new File(["old audio"], "old.wav", { type: "audio/wav" });`
      ) });
    });
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await running(page);
    await page.waitForFunction(() => typeof window.releaseAudioRestore === "function");
    await page.click("#gear");
    await page.click("#advancedSettingsAccordion > summary");
    if (action === "select") {
      await page.locator("#audioFile").setInputFiles({
        name: "new.wav", mimeType: "audio/wav", buffer: Buffer.from("new audio")
      });
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).fileName === "new.wav", KEY);
    } else {
      await page.click("#removeAudio");
      await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).fileName === "", KEY);
    }
    const source = await page.locator("#audioPlayer").getAttribute("src");
    await page.evaluate(() => window.releaseAudioRestore());
    await page.waitForTimeout(100);
    assert.equal(await page.locator("#audioPlayer").getAttribute("src"), source,
      `${action}: stale restore replaced the user's audio choice`);
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).fileName, KEY),
      action === "select" ? "new.wav" : "");
    assert.deepEqual(errors, []);
    await context.close();
  }

  {
    const { context, page, errors } = await setup();
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await running(page);
    await page.evaluate(() => document.fonts.ready);
    const fits = await page.evaluate(async () => {
      let count = 0;
      const listener = () => { count++; };
      const app = document.getElementById("app");
      app.addEventListener("wro:layout-updated", listener);
      for (let i = 0; i < 200; i++) window.dispatchEvent(new Event("resize"));
      await new Promise(requestAnimationFrame);
      app.removeEventListener("wro:layout-updated", listener);
      return count;
    });
    assert.equal(fits, 1, "resize burst did not coalesce into one layout pass");
    for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.waitForFunction(() => {
        const rect = document.getElementById("mainValue").getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight;
      });
    }
    const resumed = await page.evaluate(() => {
      const DateClass = window.Date;
      const future = DateClass.now() + 60000;
      const before = document.getElementById("mainValue").textContent;
      window.Date = class extends DateClass {
        constructor(...args) { super(...(args.length ? args : [future])); }
        static now() { return future; }
      };
      window.dispatchEvent(new Event("pageshow"));
      const after = document.getElementById("mainValue").textContent;
      window.Date = DateClass;
      return { before, after };
    });
    assert.notEqual(resumed.after, resumed.before, "restored page retained an old countdown");
    await running(page);
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log("WRO runtime stability passed stalled/late workers, blocked audio storage, stale audio restore, coalesced resizing, orientation and settings preservation.");
} finally {
  await browser.close();
}
