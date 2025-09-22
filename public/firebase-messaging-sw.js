// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE',
  authDomain: 'cafe-qr-notifications.firebaseapp.com',
  projectId: 'cafe-qr-notifications',
  storageBucket: 'cafe-qr-notifications.firebasestorage.app',
  messagingSenderId: '620603470804',
  appId: '1:620603470804:web:fb903bb1ef725098d1dc41',
  measurementId: 'G-CBZEJ7GBC8'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || 'New Order';
  const body = notif.body || data.body || 'You have a new order.';
  const icon = notif.icon || '/favicon.ico';

  const notificationOptions = {
    body,
    icon,
    badge: '/favicon.ico',
    tag: 'new-order',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    actions: [
      {
        action: 'view',
        title: 'View Order',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: {
      url: data.url || '/owner/orders',
      orderId: data.orderId,
      restaurantId: data.restaurantId,
      timestamp: Date.now()
    },
    silent: false,
    renotify: true
  };

  return self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/owner/orders';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      const origin = self.location.origin;

      for (const client of allClients) {
        if (client.url.startsWith(origin)) {
          try {
            if ('navigate' in client && client.url !== origin + targetUrl) {
              await client.navigate(targetUrl);
            }
            return client.focus();
          } catch (e) {
            console.log('[SW] Navigation failed, focusing client');
            return client.focus();
          }
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push event received:', event);

  if (!event.data) {
    return;
  }

  try {
    const payload = event.data.json();
    const title = payload.notification?.title || 'New Order';
    const options = {
      body: payload.notification?.body || 'You have a new order.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      tag: 'push-notification',
      requireInteraction: true,
      data: payload.data || {}
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (e) {
    console.error('[SW] Push event parse error:', e);
  }
});
