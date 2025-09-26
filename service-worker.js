// service-worker.js
const CACHE_NAME = 'hpc-ahead-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Strategy: 
// - Static assets: cache-first.
// - API calls (ORS/OCM): network-first with fallback to cache if previously cached.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Treat same-origin app shell as cache-first
  const isAppShell = url.origin === location.origin && (
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('manifest.json') ||
    url.pathname.includes('/icons/')
  );

  if (isAppShell) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Network-first for external APIs (ORS/OCM) and others
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // Optionally cache successful GETs
        if (event.request.method === 'GET') {
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone)).catch(()=>{});
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
