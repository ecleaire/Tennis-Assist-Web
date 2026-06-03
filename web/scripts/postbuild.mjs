import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";

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

async function listFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...await listFiles(new URL(`${relative}/`, docsRoot), `${relative}/`));
      continue;
    }
    if (!entry.isFile() || relative === "sw.js") continue;
    const extension = relative.slice(relative.lastIndexOf("."));
    if (cacheableExtensions.has(extension)) files.push(relative);
  }
  return files.sort();
}

const files = await listFiles(docsRoot);
const hash = createHash("sha256");
for (const file of files) {
  const info = await stat(new URL(file, docsRoot));
  hash.update(`${file}:${info.size}:`);
  hash.update(await readFile(new URL(file, docsRoot)));
}

const cacheName = `tennis-assist-web-${hash.digest("hex").slice(0, 12)}`;
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
    await Promise.all(keys.filter((key) => key.startsWith("tennis-assist-web-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
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

await writeFile(new URL("../../docs/sw.js", import.meta.url), sw);
