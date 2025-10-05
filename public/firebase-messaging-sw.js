// /public/firebase-messaging-sw.js

/* global importScripts, firebase, self, clients */
try {
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
} catch (e) {
  // If CDN fails, keep SW alive (no push), but do not crash install/activate.
  console.warn('[fcm-sw] importScripts failed:', e?.message || e);
}

// No-op install/activate to avoid uncaught rejections blocking activation
self.addEventListener('install', (event) => {
  event.waitUntil(Promise.resolve());
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients?.claim?.() || Promise.resolve());
});

let messaging;
try {
  firebase?.initializeApp?.({
    apiKey: "AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE",
    authDomain: "cafe-qr-notifications.firebaseapp.com",
    projectId: "cafe-qr-notifications",
    storageBucket: "cafe-qr-notifications.firebasestorage.app",
    messagingSenderId: "620603470804",
    appId: "1:620603470804:web:fb903bb1ef725098d1dc41"
  });
  messaging = firebase?.messaging?.();
} catch (e) {
  // Still allow SW to run without FCM
  console.warn('[fcm-sw] firebase init failed:', e?.message || e);
}

// Helper to safely show notifications without throwing
async function safeShowNotification(title, options) {
  try {
    // Fallback assets if custom ones are missing
    const finalOptions = {
      icon: options?.icon || '/icon-192x192.png',
      badge: options?.badge || '/icon-192x192.png',
      ...options
    };
    return await self.registration.showNotification(title, finalOptions);
  } catch (e) {
    console.warn('[fcm-sw] showNotification failed:', e?.message || e);
    return null;
  }
}

// Background payload handler
try {
  messaging?.onBackgroundMessage?.((payload) => {
    try {
      const title = payload?.data?.title || payload?.notification?.title || 'New Order';
      const body = payload?.data?.body || payload?.notification?.body || 'You have a new order.';
      const url = payload?.data?.url || '/owner/orders';

      const options = {
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: { url, ...payload?.data }
      };

      return safeShowNotification(title, options);
    } catch (e) {
      console.warn('[fcm-sw] onBackgroundMessage error:', e?.message || e);
      return null;
    }
  });
} catch (e) {
  console.warn('[fcm-sw] registering background listener failed:', e?.message || e);
}

// Click → focus or open
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event?.notification?.data?.url || '/owner/orders';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c && c.url?.includes(self.location.origin)) {
          return c.focus().then(() => (c.navigate ? c.navigate(urlToOpen) : null));
        }
      }
      if (clients.openWindow) return clients.openWindow(urlToOpen);
      return null;
    })
  );
});
