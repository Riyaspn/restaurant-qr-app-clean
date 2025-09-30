// /public/firebase-messaging-sw.js

// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// This configuration is correct based on your screenshot.
const firebaseConfig = {
  apiKey: "AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE",
  authDomain: "cafe-qr-notifications.firebaseapp.com",
  projectId: "cafe-qr-notifications",
  storageBucket: "cafe-qr-notifications.firebasestorage.app",
  messagingSenderId: "620603470804",
  appId: "1:620603470804:web:fb903bb1ef725098d1dc41"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// THIS IS THE CORRECTED HANDLER
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message: ', payload);

  // ROBUST PAYLOAD HANDLING: Check for data first, then notification.
  const notificationTitle = payload.data?.title || payload.notification?.title || 'New Order';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || 'You have a new order waiting.',
    icon: '/icon-192x192.png', // Make sure this file exists in your /public folder
    badge: '/icon-192x192.png',
    data: payload.data // Pass along the data payload for the click event
  };

  // This is the command that tells the Android OS to show the notification.
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// This handler is for when a user clicks on the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/owner/orders';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(c => c.navigate(urlToOpen));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
