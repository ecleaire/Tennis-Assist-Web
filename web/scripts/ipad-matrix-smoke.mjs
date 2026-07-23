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
  if (!address || typeof address === "string") throw new Error("ipad_matrix_server_failed");
  baseUrl = `http://127.0.0.1:${address.port}`;
}

const iPadViewports = [
  ["ipad-9.7", 768, 1024],
  ["ipad-10.2", 810, 1080],
  ["ipad-10.9-11", 820, 1180],
  ["ipad-mini-8.3", 744, 1133],
  ["ipad-pro-10.5", 834, 1112],
  ["ipad-pro-11", 834, 1194],
  ["ipad-pro-11-m4", 834, 1210],
  ["ipad-pro-12.9-air13", 1024, 1366],
  ["ipad-pro-13", 1032, 1376],
].flatMap(([name, width, height]) => [
  { name: `${name}-portrait`, width, height },
  { name: `${name}-landscape`, width: height, height: width },
]);

const editions = [
  { name: "venue", path: "/" },
  { name: "general", path: "/general/" },
];
const screens = ["dashboard", "timer", "referee", "balls", "records", "rules", "links"];
const failures = [];
const browser = await chromium.launch({ headless: true });

function pushFailure(label, text) {
  failures.push(`${label}: ${text}`);
}

async function visibleBox(page, selector) {
  const locator = page.locator(selector);
  if (!(await locator.count())) return null;
  if (!(await locator.first().isVisible())) return null;
  return locator.first().boundingBox();
}

async function checkNoHorizontalOverflow(page, label, scope = "page") {
  const overflow = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (overflow.scroll > overflow.client + 2) {
    pushFailure(label, `${scope} horizontal overflow ${overflow.scroll}/${overflow.client}`);
  }
}

async function checkInteractiveTargets(page, label) {
  const badTargets = await page.evaluate(() => {
    const selectors = ["button", "select", "input", "summary", "[role='button']"];
    return [...document.querySelectorAll(selectors.join(","))]
      .filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || element.offsetParent === null) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;
        return rect.width < 36 || rect.height < 36;
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        id: element.id,
        text: (element.textContent || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 40),
        width: Math.round(element.getBoundingClientRect().width),
        height: Math.round(element.getBoundingClientRect().height),
      }));
  });
  if (badTargets.length) pushFailure(label, `small interactive targets ${JSON.stringify(badTargets)}`);
}

async function checkTextContainment(page, label) {
  const clipped = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll("button, .btn, .match-draw-action, .primary-action, .operation-start-button, select")];
    return candidates
      .filter((element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        if (style.display === "none" || style.visibility === "hidden" || element.offsetParent === null) return false;
        return element.scrollWidth > element.clientWidth + 3 || element.scrollHeight > element.clientHeight + 3;
      })
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        id: element.id,
        className: element.className,
        text: (element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 60),
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
  });
  if (clipped.length) pushFailure(label, `text clipped in controls ${JSON.stringify(clipped)}`);
}

async function checkImportantControlsInViewport(page, label, selectors) {
  for (const selector of selectors) {
    const box = await visibleBox(page, selector);
    if (!box) {
      pushFailure(label, `${selector} is not visible`);
      continue;
    }
    const viewport = page.viewportSize();
    if (!viewport) continue;
    if (box.x < -2 || box.y < -2 || box.x + box.width > viewport.width + 2 || box.y + box.height > viewport.height + 2) {
      pushFailure(label, `${selector} outside viewport ${JSON.stringify(box)} in ${viewport.width}x${viewport.height}`);
    }
  }
}

try {
  for (const edition of editions) {
    for (const target of iPadViewports) {
      const label = `${edition.name}/${target.name}`;
      const context = await browser.newContext({
        viewport: { width: target.width, height: target.height },
        hasTouch: true,
        isMobile: true,
      });
      await context.addInitScript(() => {
        try {
          delete Navigator.prototype.serviceWorker;
        } catch {
          // Service Worker behavior is covered by the main stability smoke.
        }
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        const text = message.text();
        const ignoredDriveCsp =
          text.includes("Framing 'https://drive.google.com/' violates the following report-only Content Security Policy") &&
          text.includes("frame-ancestors 'self'");
        if (message.type() === "error" && !ignoredDriveCsp) runtimeErrors.push(`console: ${text}`);
      });

      try {
        await page.goto(`${baseUrl}${edition.path}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
        await page.evaluate(() => {
          const button = document.querySelector('[data-screen="dashboard"]');
          if (button instanceof HTMLElement) button.click();
        });
        const hasOperationFlow = await page.locator("#operation-prepare").isVisible();

        for (const screen of screens) {
          await page.evaluate((name) => {
            const button = document.querySelector(`[data-screen="${name}"]`);
            if (button instanceof HTMLElement) button.click();
          }, screen);
          await page.waitForTimeout(60);
          const active = await page.locator(`#screen-${screen}`).evaluate((element) => !element.classList.contains("hidden"));
          if (!active) pushFailure(label, `${screen} did not activate`);
          await checkNoHorizontalOverflow(page, label, screen);
          await checkInteractiveTargets(page, `${label}/${screen}`);
          await checkTextContainment(page, `${label}/${screen}`);
        }

        if (hasOperationFlow) {
          await page.evaluate(() => {
            const button = document.querySelector('[data-screen="dashboard"]');
            if (button instanceof HTMLElement) button.click();
          });
          await page.waitForSelector("#operation-prepare", { state: "visible", timeout: 10_000 });
          await page.locator("#operation-prepare").click();
          await page.locator("#operation-team").waitFor({ state: "visible", timeout: 10_000 });
          await page.selectOption("#operation-court", { index: 0 });
          await page.selectOption("#operation-match-type", { index: 1 });
          await page.selectOption("#operation-team-a", { index: 0 });
          await page.selectOption("#operation-team-b", { index: 1 });
          await checkImportantControlsInViewport(page, label, [
            "#operation-court",
            "#operation-match-type",
            "#operation-team-a",
            "#operation-team-b",
            "#operation-team-ok",
          ]);
          await checkTextContainment(page, `${label}/operation-team`);
          await page.locator("#operation-team-ok").click();
          await page.locator("#operation-start-check-dialog").waitFor({ state: "visible", timeout: 10_000 });
          await checkImportantControlsInViewport(page, label, ["#operation-start-check-confirm"]);
          await page.keyboard.press("Escape");
        }

        if (runtimeErrors.length) pushFailure(label, runtimeErrors.join(" | "));
        process.stdout.write(`PASS ${label}\n`);
      } catch (error) {
        pushFailure(label, error instanceof Error ? error.message : String(error));
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  if (testServer) await new Promise((resolveClose) => testServer.close(resolveClose));
}

if (failures.length) {
  console.error(`iPad matrix smoke found ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("iPad matrix smoke checks passed.");
