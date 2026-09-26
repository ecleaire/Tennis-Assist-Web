const APP_SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // This countdown intentionally prefers the newest deployed files over any
    // previously cached app shell. Remove old Cache Storage entries that may
    // have been created by an older implementation, then take control now.
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith("wro-countdown"))
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(APP_SCOPE)) return;

  event.respondWith((async () => {
    // Bypass the browser HTTP cache for HTML, JavaScript, CSS and other local
    // assets. This prevents an old nested module (for example main.js) from
    // surviving after a new GitHub Pages deployment.
    const freshRequest = new Request(request, { cache: "no-store" });
    return fetch(freshRequest);
  })());
});
