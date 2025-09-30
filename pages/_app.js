import '../styles/responsive.css';
import '../styles/globals.css';
import '../styles/theme.css';
import Layout from '../components/Layout';
import { RestaurantProvider } from '../context/RestaurantContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { getFCMToken } from '../lib/firebase/messaging'; // Import the new function

const OWNER_PREFIX = '/owner';
const CUSTOMER_PREFIX = '/order';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Universal Notification Setup
  useEffect(() => {
    // This runs for both web and native platforms
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // First, register the service worker that handles background notifications
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('✅ Firebase Service Worker registered successfully:', registration);
          
          // Now, decide how to get the token
          if (Capacitor.isNativePlatform()) {
            // NATIVE ANDROID: Use Capacitor's PushNotifications plugin
            setupCapacitorPush();
          } else {
            // WEB BROWSER: Use the standard Firebase web SDK
            console.log('🌐 This is a web browser. Setting up web push notifications...');
            getFCMToken(); // This will ask for permission and get the token
          }
        })
        .catch((error) => {
          console.error('❌ Firebase Service Worker registration failed:', error);
        });
    }
  }, []);

  const setupCapacitorPush = async () => {
    console.log('🚀 Setting up Capacitor push notifications for native app...');
    await PushNotifications.removeAllListeners();
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission not granted.');
      return;
    }
    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.log('✅ Capacitor Push registration success:', token.value);
      localStorage.setItem('fcm_token', token.value);
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('❌ Capacitor Push registration error:', error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('📱 Capacitor Push received:', notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('👆 Capacitor Push action performed:', action);
      const url = action.notification?.data?.url || '/owner/orders';
      router.push(url);
    });
  };

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
