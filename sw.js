/* Abhiram Pradhan Portfolio - Service Worker (PWA offline support) */
const CACHE_NAME = 'abhiram-core-portfolio-v1';
const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './profile-dark.jpg',
  './profile-light.jpg',
  './bulb-dark.png',
  './bulb-light.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
      // Tell any open pages that a new build is live so they reload.
      .then(() =>
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'NEW_VERSION' }));
        })
      )
  );
});

// NETWORK-FIRST: always show the latest content when online (fixes the "phone
// still sees the old build" problem), and fall back to the cache when offline.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          (request.url.startsWith('http') || request.url.startsWith('https')) &&
          !request.url.includes('chrome-extension')
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate' || request.destination === 'document') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503 });
        })
      )
  );
});