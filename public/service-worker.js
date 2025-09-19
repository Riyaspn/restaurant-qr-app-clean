const CACHE_NAME = 'cafeqr-cache-v1';
const CACHE_NAME = 'cafeqr-cache-v2';
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/styles/globals.css',
  '/styles/responsive.css',
  '/styles/theme.css',
  // Add any other assets or routes you want to cache here
  '/index.html',
  '/styles/globals.css',
  '/styles/responsive.css',
  '/styles/theme.css',
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  self.skipWaiting(); // Activate worker immediately

  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and content');
      return cache.addAll(urlsToCache);
    })
    .catch((err) => console.error('[Service Worker] Cache addAll failed:', err))
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');

  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const existingCaches = await caches.keys();
      await Promise.all(
        existingCaches.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })()
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      try {
        const fetchResponse = await fetch(event.request);
        return fetchResponse;
      } catch (error) {
        console.warn('[Service Worker] Fetch failed; returning nothing.', error);
        return new Response('', {status: 503, statusText: 'Service Unavailable'});
      }
  // Bypass cache for audio files
  if (event.request.url.endsWith('.mp3')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // Network failed, return fallback or empty
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
