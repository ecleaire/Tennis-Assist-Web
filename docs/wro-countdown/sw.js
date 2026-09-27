self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.includes("/wro-countdown/")) return;

  event.respondWith((async () => {
    try {
      return await fetch(event.request, { cache: "no-store" });
    } catch (error) {
      return fetch(event.request);
    }
  })());
});
