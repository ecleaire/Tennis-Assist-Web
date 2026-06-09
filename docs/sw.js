const CACHE_NAME = "tennis-assist-web-aae5e9db5b9d";
const CORE = [
  "./",
  "./index.html",
  "./assets/DSEG7Modern-Bold.woff2",
  "./assets/index-Ba-jUTVz.js",
  "./assets/index-DDYWjPqV.css",
  "./assets/playfield.jpg",
  "./favicon.svg",
  "./manifest.webmanifest"
];
const OPTIONAL = [
  "./assets/jsQR-BnGm8Ll0.js",
  "./assist_icon_512.png",
  "./data/news.json",
  "./data/rules_sections.json",
  "./data/team_list_example.csv",
  "./general/assets/DSEG7Modern-Bold.woff2",
  "./general/assets/index-BVcIfDfQ.css",
  "./general/assets/index-Bb2aOyO5.js",
  "./general/assets/jsQR-BnGm8Ll0.js",
  "./general/assets/playfield.jpg",
  "./general/assist_icon_512.png",
  "./general/data/news.json",
  "./general/data/rules_sections.json",
  "./general/data/team_list_example.csv",
  "./general/favicon.svg",
  "./general/index.html",
  "./general/manifest.webmanifest",
  "./general/sw.js"
];

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
