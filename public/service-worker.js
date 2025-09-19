const CACHE_NAME = 'cafeqr-cache-v2'; // Use latest cache version
const urlsToCache = [
  '/',
  '/favicon.ico',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/styles/globals.css',
  '/styles/responsive.css',
  '/styles/theme.css',
  '/index.html',
  // Add other assets or routes you want to cache here
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  self.skipWaiting(); // Activate worker immediately after installation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell and content');
        return cache.addAll(urlsToCache);
      })
      .catch((err) => {
        console.error('[Service Worker] Cache addAll failed:', err);
      })
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
          }
        })
      );
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Bypass cache for audio files (like .mp3)
  if (event.request.url.endsWith('.mp3')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Network failed - respond with empty or fallback response
        return new Response('', {
          status: 503,
          statusText: 'Service Unavailable',
        });
      });
    })
  );
});
