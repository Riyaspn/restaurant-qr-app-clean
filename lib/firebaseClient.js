// lib/firebaseClient.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, isSupported } from 'firebase/messaging';

// EXACTLY the config shown in Firebase Console → Project settings → Your apps (Web)
const firebaseConfig = {
  apiKey: "AIzaSyATyNkWG6l1VMuaxrOtvDtraYSJwjtDmSE",
  authDomain: "cafe-qr-notifications.firebaseapp.com",
  projectId: "cafe-qr-notifications",
  storageBucket: "cafe-qr-notifications.firebasestorage.app",
  messagingSenderId: "620603470804",
  appId: "1:620603470804:web:fb903bb1ef725098d1dc41",
  measurementId: "G-CBZEJ7GBC8"
};

// Create or reuse the app safely
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Helper to get messaging only if supported (prevents errors in unsupported browsers)
export const getMessagingIfSupported = async () => {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(firebaseApp);
  } catch {
    return null;
  }
};
