// public/firebase-messaging-sw.js
// Use compat builds in a Service Worker (no ESM here)
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js')

// IMPORTANT: Must match the web app config (Firebase Console)
firebase.initializeApp({
  apiKey: 'AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE',
  authDomain: 'cafe-qr-notifications.firebaseapp.com',
  projectId: 'cafe-qr-notifications',
  storageBucket: 'cafe-qr-notifications.firebasestorage.app',
  messagingSenderId: '620603470804',
  appId: '1:620603470804:web:fb903bb1ef725098d1dc41',
  measurementId: 'G-CBZEJ7GBC8'
})

const messaging = firebase.messaging()

// Optional: handle background messages (data or notification payloads)
messaging.onBackgroundMessage((payload) => {
  const notif = payload?.notification || {}
  const data = payload?.data || {}
  const title = notif.title || data.title || 'New Order'
  const body  = notif.body  || data.body  || 'You have a new order.'
  const icon  = notif.icon  || '/favicon.ico'
  const badge = notif.badge || '/favicon.ico'
  const tag   = notif.tag   || 'new-order'
  const notifData = {
    url: data.url || '/',
    orderId: data.orderId || null,
    restaurantId: data.restaurantId || null
  }
  self.registration.showNotification(title, {
    body, icon, badge, tag, data: notifData, requireInteraction: true
  })
})

// Focus existing tab or open a new one on click
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification?.data?.url || '/'
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const origin = self.location.origin
    for (const client of allClients) {
      if (client.url.startsWith(origin)) {
        try {
          if ('navigate' in client && client.url !== (origin + targetUrl)) {
            await client.navigate(targetUrl)
          }
        } catch (_) {}
        return client.focus()
      }
    }
    return self.clients.openWindow(targetUrl)
  })())
})
