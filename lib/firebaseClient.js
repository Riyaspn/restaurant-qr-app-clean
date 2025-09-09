// lib/firebaseClient.js
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId is optional
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
}

// Ensure we only initialize in the browser
function ensureClientApp() {
  if (typeof window === 'undefined') return null
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

// Export the app (null on server)
export const firebaseApp = ensureClientApp()

// Returns Messaging instance if supported, otherwise null.
// Never throws; safe to call from components.
export async function getMessagingIfSupported() {
  try {
    if (typeof window === 'undefined') return null
    const supported = await isSupported()
    if (!supported) return null
    const app = firebaseApp ?? ensureClientApp()
    if (!app) return null
    return getMessaging(app)
  } catch (e) {
    console.info('FCM not supported or init failed:', e)
    return null
  }
}
