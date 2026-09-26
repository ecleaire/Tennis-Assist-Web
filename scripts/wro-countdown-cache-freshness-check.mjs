import fs from "node:fs/promises";
import { chromium } from "playwright";

const URL = process.env.WRO_BASE_URL ||
  "http://127.0.0.1:4173/docs/wro-countdown/?cache-freshness-check=1";

const failures = [];
const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const html = await fs.readFile("docs/wro-countdown/index.html", "utf8");
const sw = await fs.readFile("docs/wro-countdown/sw.js", "utf8");

expect(html.includes('http-equiv="Cache-Control"'),
  "index.html is missing Cache-Control no-cache metadata");
expect(html.includes('updateViaCache: "none"'),
  "service worker registration must use updateViaCache=none");
expect(html.includes('register("./sw.js"'),
  "index.html must register the scoped freshness service worker");
expect(sw.includes('cache: "no-store"'),
  "service worker must bypass the HTTP cache");
expect(sw.includes("self.clients.claim()"),
  "service worker must claim existing clients after activation");
expect(sw.includes("self.skipWaiting()"),
  "service worker must activate without waiting for an old worker");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const runtimeErrors = [];
page.on("pageerror", error => runtimeErrors.push(error.message));
page.on("console", message => {
  if (message.type() === "error") runtimeErrors.push(message.text());
});

try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 45_000 });
  await page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      throw new Error("serviceWorker API unavailable");
    }
    await navigator.serviceWorker.ready;
  });

  await page.reload({ waitUntil: "networkidle", timeout: 45_000 });
  const state = await page.evaluate(() => ({
    controlled: Boolean(navigator.serviceWorker.controller),
    controllerUrl: navigator.serviceWorker.controller?.scriptURL || "",
    version: document.querySelector(".settingsVersion strong")?.textContent || ""
  }));

  expect(state.controlled, "page is not controlled by the freshness service worker");
  expect(state.controllerUrl.endsWith("/wro-countdown/sw.js"),
    `unexpected service worker controller: ${state.controllerUrl}`);
  expect(state.version === "v1.1.0",
    `unexpected visible app version: ${state.version}`);
} catch (error) {
  failures.push(error.stack || error.message);
}

failures.push(...runtimeErrors.map(error => `runtime: ${error}`));
await context.close();
await browser.close();

if (failures.length) {
  console.error("WRO cache freshness check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("WRO cache freshness check passed: no-store SW, immediate control, v1.1.0.");
