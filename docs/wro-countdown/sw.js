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
    const response = await fetch(event.request, { cache: "no-store" });
    const headers = new Headers(response.headers);
    // The request option bypasses the HTTP cache, but does not stop Chromium
    // from reusing a cacheable subresource response before consulting the SW.
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
    headers.set("Pragma", "no-cache");
    headers.set("Expires", "0");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  })());
});
