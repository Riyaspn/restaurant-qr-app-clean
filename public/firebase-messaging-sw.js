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

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const notif = payload.notification || {};
  const data = payload.data || {};
  const title = notif.title || data.title || 'New Order';
  const body = notif.body || data.body || 'You have a new order.';
  
  self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'new-order',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: {
      deeplink: data.url || `/owner/orders?highlight=${data.orderId || ''}`,
      orderId: data.orderId,
      restaurantId: data.restaurantId
    }
  });
});

// Handle notification clicks
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
        } catch (e) {}
        return client.focus();
      }
    }
    
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});
