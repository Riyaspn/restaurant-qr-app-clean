const CACHE_NAME = 'cafeqr-cache-v1';
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/index.html',
  '/styles/globals.css',
  '/styles/responsive.css',
  '/styles/theme.css',
  // Add other assets or routes you want to cache here
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell and content');
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  // Take control of uncontrolled clients immediately
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })()
  );
});

// Fetch strategy: try cache first, then network fallback.
// If both fail, consider showing a fallback offline page (update as needed).
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
        // Optionally: return offline page here if request is for navigations.
        // For now, just silently fail (prevent errors from causing reload loops)
        console.warn('[Service Worker] Fetch failed; returning nothing.', error);
        return new Response('', {status: 503, statusText: 'Service Unavailable'});
      }
    })
  );
});
