const CACHE_VERSION = 'v2';
const STATIC_CACHE = `dental-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `dental-runtime-${CACHE_VERSION}`;

const STATIC_ASSETS = [
    '/img/icon-192.png',
    '/img/icon-512.png',
    '/img/icon-maskable-512.png',
    '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
                    .map((k) => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    if (url.origin !== self.location.origin && !url.hostname.includes('fonts.bunny.net')) return;

    // HTML — network first (so Inertia/Laravel routes always get fresh data)
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request).catch(() => caches.match(request).then((r) => r || caches.match('/')))
        );
        return;
    }

    // Static assets (build, images, fonts) — cache first
    if (
        url.pathname.startsWith('/build/') ||
        url.pathname.startsWith('/img/') ||
        url.pathname.startsWith('/storage/') ||
        url.hostname.includes('fonts.bunny.net')
    ) {
        event.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // API/AJAX requests — network only (no caching to keep data fresh)
});

self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') self.skipWaiting();
});
