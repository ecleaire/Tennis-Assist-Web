const CACHE_NAME = "tennis-assist-web-e993bed8c963";
const CORE = [
  "./",
  "./index.html",
  "./assets/DSEG7Modern-Bold-B_JOyP8w.woff2",
  "./assets/index-CtVtKvyr.css",
  "./assets/index-D54fHBWF.js",
  "./assets/playfield-BvIRyTeo.jpg",
  "./favicon.svg",
  "./manifest.webmanifest"
];
const OPTIONAL = [
  "./assets/jsQR-DDgRDtAc.js",
  "./assets/qr-general.png",
  "./assets/qr-judge.png",
  "./assist_icon_512.png",
  "./data/news.json",
  "./data/rules_sections.json",
  "./data/team_list_example.csv",
  "./history/app.js",
  "./history/index.html",
  "./history/style.css",
  "./result-demo/app.js",
  "./result-demo/index.html",
  "./result-demo/style.css"
];

async function fetchNavigationWithTimeout(request, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("tennis-assist-web-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetchNavigationWithTimeout(event.request).then((response) => {
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
