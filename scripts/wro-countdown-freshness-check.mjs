import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";

const SETTINGS_KEY = "wro-countdown-settings-v4";
const root = resolve("docs/wro-countdown");
let generation = 1;
const requests = [];
const oldWorker = `
self.addEventListener("install", e => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  if (new URL(e.request.url).pathname.endsWith("/main.js")) {
    e.respondWith(Promise.resolve(new Response("window.__staleMain = true;", {
      headers: { "Content-Type": "text/javascript" }
    })));
  }
});`;

// A long HTTP cache lifetime reproduces Pages/browser caches. The new worker
// must bypass it even for statically imported modules whose URLs stay the same.
const server = createServer(async (request, response) => {
  const url = new URL(request.url, "http://localhost");
  requests.push({ path: url.pathname, query: url.search, generation });
  response.setHeader("Cache-Control", "public, max-age=3600");
  if (url.pathname === "/wro-countdown/seed.html") {
    response.setHeader("Content-Type", "text/html");
    response.end("<!doctype html><title>Worker migration fixture</title>");
    return;
  }
  if (url.pathname === "/wro-countdown/sw.js" && url.search === "?v=old") {
    response.setHeader("Content-Type", "text/javascript");
    response.end(oldWorker);
    return;
  }
  const relative = url.pathname.replace(/^\/wro-countdown\//, "") || "index.html";
  const file = resolve(root, relative);
  if (!file.startsWith(`${root}/`)) {
    response.writeHead(404).end();
    return;
  }
  try {
    let contents = await readFile(file);
    response.setHeader("Content-Type", file.endsWith(".js")
      ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html");
    if (relative === "v2/main.js" || relative === "v2/settings-layout.js") {
      const marker = relative === "v2/main.js" ? "__mainGeneration" : "__settingsGeneration";
      contents = `window.${marker} = ${generation};\n${contents}`;
    }
    response.end(contents);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/wro-countdown/`;
const browser = await chromium.launch({ headless: true });

async function checkLoaded(page, expected) {
  await page.waitForFunction(expected =>
    document.getElementById("settingsRoot")?.querySelector(".settingsVersion") &&
    window.__mainGeneration === expected && window.__settingsGeneration === expected,
  expected, { timeout: 15_000 }).catch(async error => {
    console.error("Fresh-load diagnostics:", await page.evaluate(() => ({
      main: window.__mainGeneration, settings: window.__settingsGeneration,
      stale: window.__staleMain, body: document.body.textContent.slice(0, 120),
      controller: navigator.serviceWorker.controller?.scriptURL
    })), requests.filter(item => item.generation === expected && item.path.endsWith(".js")));
    throw error;
  });
  return page.evaluate(key => ({
    stale: window.__staleMain || false,
    version: document.querySelector(".settingsVersion strong").textContent,
    updatedAt: document.querySelector(".settingsVersion small").textContent,
    settings: localStorage.getItem(key),
    sentinel: localStorage.getItem("wro-freshness-sentinel"),
    timerHasMax: document.getElementById("timerSize").hasAttribute("max"),
    controller: navigator.serviceWorker.controller?.scriptURL || ""
  }), SETTINGS_KEY);
}

try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`${base}seed.html`);
  await page.evaluate(async key => {
    localStorage.setItem(key, JSON.stringify({
      autoSize: false, timerSize: 99999, currentTimeLabel: "保存した設定"
    }));
    localStorage.setItem("wro-freshness-sentinel", "keep");
    await navigator.serviceWorker.register("./sw.js?v=old", { scope: "./" });
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener(
        "controllerchange", resolve, { once: true }
      ));
    }
  }, SETTINGS_KEY);
  assert.match(await page.evaluate(() => navigator.serviceWorker.controller.scriptURL), /v=old$/);

  await page.goto(base, { waitUntil: "networkidle" });
  const first = await checkLoaded(page, 1);
  assert.equal(first.stale, false, "old worker supplied stale main.js");
  assert.equal(first.version, "v1.1.0");
  assert.equal(first.updatedAt, "更新日：2026年9月27日");
  assert.match(first.controller, /sw\.js\?v=1\.1\.0$/);
  assert.equal(first.sentinel, "keep");
  assert.equal(JSON.parse(first.settings).timerSize, 99999);
  assert.equal(first.timerHasMax, false);
  assert.equal(await page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration()).updateViaCache), "none");

  generation = 2;
  await page.reload({ waitUntil: "networkidle" });
  const second = await checkLoaded(page, 2);
  assert.equal(second.settings, first.settings, "settings changed during cache refresh");
  assert.equal(second.sentinel, "keep");
  for (const name of ["entry.js", "entry-settings.js", "main.js"]) {
    const urls = requests.filter(item => item.path.endsWith(`/v2/${name}`));
    assert(urls.some(item => item.generation === 2 &&
      new URLSearchParams(item.query).get("release") === "1.1.0" &&
      new URLSearchParams(item.query).has("t")), `${name} lost fresh bootstrap query`);
  }
  assert(requests.some(item => item.path.endsWith("/settings-layout.js") &&
    item.generation === 2), "worker reused cached static dependency");
  assert.deepEqual(errors, []);
  await context.close();

  const blocked = await browser.newContext({ serviceWorkers: "block" });
  const fallback = await blocked.newPage();
  await fallback.goto(base, { waitUntil: "networkidle" });
  const withoutWorker = await checkLoaded(fallback, 2);
  assert.equal(withoutWorker.version, "v1.1.0");
  await blocked.close();
  console.log("WRO fresh loading passed old worker replacement, fresh child/static modules, release metadata, no-worker fallback and localStorage preservation.");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
