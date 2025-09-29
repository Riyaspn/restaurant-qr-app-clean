// In: pages/_app.js

import '../styles/responsive.css';
import '../styles/globals.css';
import '../styles/theme.css';
import Layout from '../components/Layout';
import { RestaurantProvider } from '../context/RestaurantContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getFirebaseConfig } from '../services/firebase'; // We will use a helper for this
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const OWNER_PREFIX = '/owner';
const CUSTOMER_PREFIX = '/order';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // =================================================================================
  // HOOK 1: Register the Firebase Service Worker
  // This is the NEW and critical part that was missing.
  // =================================================================================
  useEffect(() => {
    // This runs only in the browser, not on the server
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const firebaseConfig = getFirebaseConfig();
      const app = initializeApp(firebaseConfig);
      const messaging = getMessaging(app);

      // Register the service worker
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('✅ Firebase Service Worker registered successfully');
          // Request notification permission and get token
          return getToken(messaging, { serviceWorkerRegistration: registration });
        })
        .catch((err) => {
          console.error('❌ Service Worker registration failed:', err);
        });
        
      // Handle foreground messages
      onMessage(messaging, (payload) => {
          console.log('Foreground message received.', payload);
          // Here you could show a custom in-app notification if you want
      });
    }
  }, []);

  // =================================================================================
  // HOOK 2: Capacitor Push Notification Listeners
  // Your existing code, slightly cleaned up.
  // =================================================================================
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const setupPushNotifications = async () => {
        await PushNotifications.removeAllListeners();
        
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive !== 'granted') {
          console.warn('Push notification permission not granted.');
          return;
        }
        
        await PushNotifications.register();

        PushNotifications.addListener('registration', (token) => {
          console.log('Capacitor Push registration success:', token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('Capacitor Push registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('Capacitor Push received (foreground/background):', notification);
          // This is where your sound comes from.
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('Capacitor Push action performed (tap):', action);
          const url = action.notification?.data?.url || '/owner/orders';
          router.push(url);
        });
      };
      setupPushNotifications().catch(console.error);
    }
  }, [router]);

  const path = router.pathname || '';
  const showSidebar = path.startsWith(OWNER_PREFIX);
  const isCustomerRoute = path.startsWith(CUSTOMER_PREFIX);

  return (
    <RestaurantProvider>
      <Layout
        title={pageProps?.title}
        showSidebar={showSidebar}
        hideChrome={isCustomerRoute}
        showHeader={isCustomerRoute}
      >
        <Component {...pageProps} />
      </Layout>
    </RestaurantProvider>
  );
}

export default MyApp;
