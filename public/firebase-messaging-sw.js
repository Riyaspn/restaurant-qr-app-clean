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
  apiKey: "AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE",
  authDomain: "cafe-qr-notifications.firebaseapp.com",
  projectId: "cafe-qr-notifications",
  storageBucket: "cafe-qr-notifications.firebasestorage.app",
  messagingSenderId: "620603470804",
  appId: "1:620603470804:web:fb903bb1ef725098d1dc41",
  measurementId: "G-CBZEJ7GBC8"
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
// CRITICAL: Handle background messages for PWA
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received:', payload);
  
  const notif = payload.notification;
  const data = payload.data;
  
  const title = notif?.title || data?.title || 'New Order';
  const body = notif?.body || data?.body || 'You have a new order.';
  const icon = notif?.icon || '/favicon.ico';
  
  // Enhanced notification options for better mobile support
  const notificationOptions = {
    body,
    icon,
    badge: '/favicon.ico',
    tag: 'new-order',
    requireInteraction: true, // Keeps notification visible until clicked
    vibrate: [200, 100, 200, 100, 200], // More noticeable vibration pattern
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
      url: data?.url || '/owner/orders',
      orderId: data?.orderId,
      restaurantId: data?.restaurantId,
      timestamp: Date.now()
    },
    // Force sound on Android
    silent: false,
    renotify: true // Allow repeat notifications
  };

  // Show notification - this works in background/PWA
  return self.registration.showNotification(title, notificationOptions);
});

// Enhanced notification click handling
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
      
      // Try to focus existing window
      for (const client of allClients) {
        if (client.url.startsWith(origin)) {
          try {
            if ('navigate' in client && client.url !== origin + targetUrl) {
              await client.navigate(targetUrl);
            }
            return client.focus();
          } catch (e) {
            console.log('[SW] Navigate failed, focusing client');
            return client.focus();
          }
        }
      }
      
      // Open new window if no existing client
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })()
  );
});

// Add push event listener for additional reliability
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
