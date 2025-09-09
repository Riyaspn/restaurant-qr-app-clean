// public/firebase-messaging-sw.js

// Use compat builds in a Service Worker (ES modules aren't supported here)
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// IMPORTANT: this config must match the web app’s config for the same Firebase project
firebase.initializeApp({
  apiKey: "AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE",
  authDomain: "cafe-qr-notifications.firebaseapp.com",
  projectId: "cafe-qr-notifications",
  storageBucket: "cafe-qr-notifications.firebasestorage.app",
  messagingSenderId: "620603470804",
  appId: "1:620603470804:web:fb903bb1ef725098d1dc41",
  measurementId: "G-CBZEJ7GBC8"
});

// Retrieve Messaging instance
const messaging = firebase.messaging();

// Handle background messages (when the page is not focused or is closed)
messaging.onBackgroundMessage((payload) => {
  // Prefer notification fields if present; fallback to data payload
  const notif = payload?.notification || {};
  const data = payload?.data || {};

  const title = notif.title || data.title || 'New Order';
  const body  = notif.body  || data.body  || 'You have a new order.';
  const icon  = notif.icon  || '/favicon.ico';
  const badge = notif.badge || '/favicon.ico';
  const tag   = notif.tag   || 'new-order';

  // Persist useful data for click navigation
  const notifData = {
    url: data.url || '/',      // e.g. /owner/orders?highlight=...
    orderId: data.orderId || null,
    restaurantId: data.restaurantId || null
  };

  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    data: notifData,
    requireInteraction: true // keeps the notification until the user interacts
    // Note: custom sound files are not supported by Web Push; browsers play system sound
  });
});

// Focus or open app on notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    (async () => {
      // Try to focus an open client matching the origin; otherwise open a new tab
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const origin = self.location.origin;

      for (const client of allClients) {
        if (client.url.startsWith(origin)) {
          // If the client is already on the target URL, just focus it; else navigate then focus
          try {
            if ('navigate' in client && client.url !== (origin + targetUrl)) {
              await client.navigate(targetUrl);
            }
          } catch (_) {}
          return client.focus();
        }
      }
      // No existing window found; open a new one
      return self.clients.openWindow(targetUrl);
    })()
  );
});
