// lib/firebase/messaging.js
import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE",
  authDomain: "cafe-qr-notifications.firebaseapp.com",
  projectId: "cafe-qr-notifications",
  storageBucket: "cafe-qr-notifications.firebasestorage.app",
  messagingSenderId: "620603470804",
  appId: "1:620603470804:web:fb903bb1ef725098d1dc41"
};

const initializeFirebaseApp = () => {
  if (!getApps().length) return initializeApp(firebaseConfig);
  return getApps()[0];
};

export const getFCMToken = async () => {
  const app = initializeFirebaseApp();
  const messaging = getMessaging(app);
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(messaging, {
      vapidKey: 'BOsAl1-5erAp7aw-yA2IqcYSXGxOyWmCTAfegUo_Lekrxll5ukCAz78NgkYeGxBmbjRN_ecq4yQNuySziWPMFnQ',
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
    });
    if (token) localStorage.setItem('fcm_token', token);
    return token || null;
  } catch (e) {
    console.error('Web FCM getToken error:', e);
    return null;
  }
};
