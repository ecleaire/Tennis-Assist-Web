import { chromium } from "playwright";

const ORIGIN = process.env.WRO_ORIGIN || "http://127.0.0.1:4173";
const ROOT_PATH = "/docs/wro-countdown/";
const ROOT_URL = `${ORIGIN}${ROOT_PATH}`;
const LEGACY_URL = `${ORIGIN}${ROOT_PATH}app.html?v=legacy-bookmark`;

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

function expect(condition, message) {
  if (!condition) failures.push(message);
}

async function waitForApp() {
  await page.waitForFunction(() => {
    const value = document.getElementById("mainValue")?.textContent || "";
    return value && !value.includes("--");
  }, { timeout: 15_000 });
  await page.waitForTimeout(150);
}

async function inspect() {
  return page.evaluate(() => ({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    canonical: document.querySelector('link[rel="canonical"]')?.href || "",
    hasApp: Boolean(document.getElementById("app")),
    versionedStyles: [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map(link => link.href)
      .filter(href => href.includes("?v="))
  }));
}

try {
  await page.goto(ROOT_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await waitForApp();

  let state = await inspect();
  expect(state.pathname === ROOT_PATH,
    `root URL changed to ${state.pathname}`);
  expect(state.search === "",
    `root URL unexpectedly contains query ${state.search}`);
  expect(state.hash === "",
    `root URL unexpectedly contains hash ${state.hash}`);
  expect(state.hasApp, "root URL did not load the countdown app");
  expect(state.canonical.endsWith("/Tennis-Assist-Web/wro-countdown/"),
    `unexpected canonical URL ${state.canonical}`);
  expect(state.versionedStyles.length > 0,
    "internal styles are not cache-versioned");

  await page.reload({ waitUntil: "networkidle" });
  await waitForApp();
  state = await inspect();
  expect(state.pathname === ROOT_PATH && state.search === "",
    "reload did not keep the stable root URL");

  await page.goto(LEGACY_URL, { waitUntil: "networkidle", timeout: 45_000 });
  await waitForApp();
  state = await inspect();
  expect(state.pathname === ROOT_PATH,
    `legacy app.html link did not redirect to root: ${state.pathname}`);
  expect(state.search === "",
    `legacy version query remained after redirect: ${state.search}`);
  expect(state.hasApp, "legacy app.html link did not load the countdown app");
} catch (error) {
  failures.push(error.stack || error.message);
}

await context.close();
await browser.close();

if (failures.length) {
  console.error("WRO stable URL check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("WRO stable URL check passed for root and legacy links.");
