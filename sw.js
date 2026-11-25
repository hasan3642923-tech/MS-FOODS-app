const CACHE_NAME = 'ms-foods-v1.2.0';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './menu-data.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Never touch cross-origin requests (e.g. Google Sheets CSV or WhatsApp links)
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        if (networkRes && networkRes.ok) {
          const resClone = networkRes.clone();
          const cacheKey = url.pathname.endsWith('/menu-data.json')
            ? './menu-data.json'
            : req;
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(cacheKey, resClone).catch(() => {});
          });
        }
        return networkRes;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Offline' });
        })
      )
  );
});
