//lib/firebase/messaging.js

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE",
  authDomain: "cafe-qr-notifications.firebaseapp.com",
  projectId: "cafe-qr-notifications",
  storageBucket: "cafe-qr-notifications.firebasestorage.app",
  messagingSenderId: "620603470804",
  appId: "1:620603470804:web:fb903bb1ef725098d1dc41"
};

// This function initializes Firebase and can be called safely multiple times.
const initializeFirebaseApp = () => {
  if (!getApps().length) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0];
};

/**
 * This is the universal function to get a notification token.
 * It works for both web browsers and Capacitor.
 */
export const getFCMToken = async () => {
  const app = initializeFirebaseApp();
  const messaging = getMessaging(app);

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted.');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: 'BOsAl1-5erAp7aw-yA2IqcYSXGxOyWmCTAfegUo_Lekrxll5ukCAz78NgkYeGxBmbjRN_ecq4yQNuySziWPMFnQ', // IMPORTANT: Add your VAPID key
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
    });

    if (token) {
      console.log('✅ Universal FCM Token received:', token);
      localStorage.setItem('fcm_token', token);
      return token;
    } else {
      console.warn('Could not get FCM token.');
      return null;
    }
  } catch (error) {
    console.error('❌ An error occurred while retrieving token. ', error);
    return null;
  }
};
