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
        if (heightState.scroll > heightState.client + 2) {
          failures.push(`${label}: draw vertical overflow ${heightState.scroll}/${heightState.client} (header ${heightState.headerHeight}, draw ${heightState.drawHeight}, shell min ${heightState.shellMinHeight}, body ${heightState.bodyClass})`);
        }
        for (const selector of ["#operation-ball-random", "#operation-time-random", "#operation-ready"]) {
          const box = await page.locator(selector).boundingBox();
          if (!box || box.x < -1 || box.y < -1 || box.x + box.width > target.width + 1 || box.y + box.height > target.height + 1) {
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
        process.stdout.write(`PASS ${label}\n`);
      } catch (error) {
        failures.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await context.close();
      }
    }
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
