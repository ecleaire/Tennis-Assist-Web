const CACHE_NAME = 'wro-robosports-assist-v20260521-4';

const APP_SHELL = [
	'./',
	'./index.html',
	'./index.js',
	'./index.wasm',
	'./index.pck',
	'./index.png',
	'./index.icon.png',
	'./index.apple-touch-icon.png',
	'./index.pwa.png',
	'./index.audio.worklet.js',
	'./index.audio.position.worklet.js',
	'./manifest.webmanifest'
];

self.addEventListener('install', (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => cache.addAll(APP_SHELL))
			.then(() => self.skipWaiting())
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		caches.keys()
			.then((keys) => Promise.all(
				keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
			))
			.then(() => self.clients.claim())
	);
});

self.addEventListener('fetch', (event) => {
	const request = event.request;
	if (request.method !== 'GET') {
		return;
	}

	const requestUrl = new URL(request.url);
	if (requestUrl.origin !== self.location.origin) {
		return;
	}

	if (request.mode === 'navigate') {
		event.respondWith(
			fetch(request)
				.then((response) => {
					const copy = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
					return response;
				})
				.catch(() => caches.match('./index.html'))
		);
		return;
	}

	event.respondWith(
		caches.match(request)
			.then((cached) => cached || fetch(request).then((response) => {
				if (!response || response.status !== 200) {
					return response;
				}
				const copy = response.clone();
				caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
				return response;
			}))
	);
});
