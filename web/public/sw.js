const CACHE_NAME = "tennis-assist-web-v21";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./favicon.svg", "./assets/DSEG7Modern-Bold.woff2", "./assets/playfield.jpg"];
const OPTIONAL = ["./data/news.json", "./data/rules_sections.json"];

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

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("tennis-assist-web-") && key !== CACHE_NAME).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetchNavigationWithTimeout(event.request).then((response) => {
        if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put("./", response.clone()));
        return response;
      }).catch(() => caches.match("./")),
    );
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || fetch(event.request).then((response) => {
      const path = new URL(event.request.url).pathname;
      if (response.ok && (path.includes("/assets/") || path.includes("/data/") || OPTIONAL.some((asset) => path.endsWith(asset.slice(1))))) {
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      }
      return response;
    }).catch(() => cached)),
  );
});
