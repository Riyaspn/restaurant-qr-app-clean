// public/firebase-messaging-sw.js
// Compat builds only in SW context
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// IMPORTANT: Match your Firebase web config
firebase.initializeApp({
  apiKey: 'AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE',
  authDomain: 'cafe-qr-notifications.firebaseapp.com',
  projectId: 'cafe-qr-notifications',
  storageBucket: 'cafe-qr-notifications.firebasestorage.app',
  messagingSenderId: '620603470804',
  appId: '1:620603470804:web:fb903bb1ef725098d1dc41',
  measurementId: 'G-CBZEJ7GBC8'

});

// Get Messaging instance
const messaging = firebase.messaging();

// Option A: FCM background handler (payload.notification auto-present, but we’ll ensure display)
messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || 'New Order';
  const body = notif.body || data.body || 'You have a new order.';
  const icon = notif.icon || '/favicon.ico';
  const badge = notif.badge || '/favicon.ico';
  const tag = notif.tag || 'new-order';
  const notifData = {
    deeplink: data.url || `/owner/orders?highlight=${data.orderId || ''}`,
    orderId: data.orderId,
    restaurantId: data.restaurantId
  };
  self.registration.showNotification(title, {
    body,
    icon,
    badge,
    tag,
    data: notifData,
    requireInteraction: true,
    vibrate: [200, 100, 200]
  });
});

// Option B: Generic push event (works for data-only messages too)
self.addEventListener('push', (event) => {
  try {
    const payload = event.data ? event.data.json() : {};
    const notif = payload.notification || {};
    const data = payload.data || {};
    const title = notif.title || data.title || 'New Order';
    const body = notif.body || data.body || 'You have a new order.';
    const icon = notif.icon || '/favicon.ico';
    const badge = notif.badge || '/favicon.ico';
    const tag = notif.tag || 'new-order';
    const notifData = {
      deeplink: data.url || `/owner/orders?highlight=${data.orderId || ''}`,
      orderId: data.orderId,
      restaurantId: data.restaurantId
    };
    event.waitUntil(
      self.registration.showNotification(title, {
        body,
        icon,
        badge,
        tag,
        data: notifData,
        requireInteraction: true,
        vibrate: [200, 100, 200]
      })
    );
  } catch (e) {
    // No-op
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.deeplink) || '/owner/orders';
  event.waitUntil((async () => {
    const origin = self.location.origin;
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if (client.url.startsWith(origin)) {
        try {
          if ('navigate' in client && client.url !== origin + targetUrl) {
            await client.navigate(targetUrl);
          }
        } catch (e) {
          // ignore navigate failures
        }
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});
