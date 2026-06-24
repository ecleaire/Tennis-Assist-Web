import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";

await writeFile(new URL("../../docs/.nojekyll", import.meta.url), "\n");

for (const file of ["../../docs/data/rules_sections.json", "../../docs/data/news.json"]) {
  const url = new URL(file, import.meta.url);
  const data = JSON.parse(await readFile(url, "utf8"));
  await writeFile(url, JSON.stringify(data));
}

const docsRoot = new URL("../../docs/", import.meta.url);
const cacheableExtensions = new Set([".html", ".webmanifest", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".woff2", ".js", ".css", ".json", ".csv"]);
const corePatterns = [
  /^index\.html$/,
  /^manifest\.webmanifest$/,
  /^favicon\.svg$/,
  /^apple-touch-icon\.png$/,
  /^assets\/index-[\w-]+\.(js|css)$/,
  /^assets\/DSEG7Modern-Bold\.woff2$/,
  /^assets\/playfield\.jpg$/,
];

async function listFiles(root, directory = root, prefix = "", options = {}) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = `${prefix}${entry.name}`;
    if (options.exclude?.some((pattern) => pattern.test(relative))) continue;
    if (entry.isDirectory()) {
      files.push(...await listFiles(root, new URL(`${relative}/`, root), `${relative}/`, options));
      continue;
    }
    if (!entry.isFile() || relative === "sw.js") continue;
    const extension = relative.slice(relative.lastIndexOf("."));
    if (cacheableExtensions.has(extension)) files.push(relative);
  }
  return files.sort();
}

async function firstAsset(pattern) {
  const assets = await readdir(new URL("assets/", docsRoot));
  const match = assets.find((file) => pattern.test(file));
  if (!match) throw new Error(`Missing built asset matching ${pattern}`);
  return match;
}

async function syncGeneralAssets() {
  const generalRoot = new URL("general/", docsRoot);
  const generalAssets = new URL("assets/", generalRoot);
  await rm(generalAssets, { recursive: true, force: true });
  await mkdir(generalAssets, { recursive: true });
  for (const file of await readdir(new URL("assets/", docsRoot))) {
    await cp(new URL(`assets/${file}`, docsRoot), new URL(`assets/${file}`, generalRoot));
  }

  const scriptFile = await firstAsset(/^index-[\w-]+\.js$/);
  const cssFile = await firstAsset(/^index-[\w-]+\.css$/);
  const indexUrl = new URL("index.html", generalRoot);
  const index = await readFile(indexUrl, "utf8");
  await writeFile(
    indexUrl,
    index
      .replace(/\.\/assets\/index-[\w-]+\.js/g, `./assets/${scriptFile}`)
      .replace(/\.\/assets\/index-[\w-]+\.css/g, `./assets/${cssFile}`),
  );
}

async function writeServiceWorker(root, cachePrefix, exclude = []) {
  const files = await listFiles(root, root, "", { exclude });
  const hash = createHash("sha256");
  for (const file of files) {
    const info = await stat(new URL(file, root));
    hash.update(`${file}:${info.size}:`);
    hash.update(await readFile(new URL(file, root)));
  }

  const cacheName = `${cachePrefix}-${hash.digest("hex").slice(0, 12)}`;
  const coreFiles = files.filter((file) => corePatterns.some((pattern) => pattern.test(file)));
  const optionalFiles = files.filter((file) => !coreFiles.includes(file));
  const core = Array.from(new Set(["./", "./index.html", ...coreFiles.map((file) => `./${file}`)]));
  const optional = optionalFiles.map((file) => `./${file}`);
  const sw = `const CACHE_NAME = ${JSON.stringify(cacheName)};
const CORE = ${JSON.stringify(core, null, 2)};
const OPTIONAL = ${JSON.stringify(optional, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(${JSON.stringify(`${cachePrefix}-`)}) && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put("./", response.clone()));
        return response;
      }).catch(async () => (await caches.match("./")) || caches.match("./index.html")),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((response) => {
      const path = url.pathname.split("/").pop() ?? "";
      const shouldRuntimeCache = response.ok && (
        url.pathname.includes("/assets/") ||
        url.pathname.includes("/data/") ||
        OPTIONAL.some((asset) => url.pathname.endsWith(asset.slice(1))) ||
        CORE.some((asset) => url.pathname.endsWith(asset.slice(1))) ||
        path === "manifest.webmanifest" ||
        path.endsWith(".png") ||
        path.endsWith(".svg")
      );
      if (shouldRuntimeCache) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      return response;
    }).catch(() => cached)),
  );
});
`;

  await writeFile(new URL("sw.js", root), sw);
}

await syncGeneralAssets();
await writeServiceWorker(docsRoot, "tennis-assist-web", [/^general\//]);
await writeServiceWorker(new URL("general/", docsRoot), "tennis-assist-general");
