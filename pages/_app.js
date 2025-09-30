import '../styles/responsive.css';
import '../styles/globals.css';
import '../styles/theme.css';
import Layout from '../components/Layout';
import { RestaurantProvider } from '../context/RestaurantContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const OWNER_PREFIX = '/owner';
const CUSTOMER_PREFIX = '/order';

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // CRITICAL: Firebase Web Service Worker Registration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      console.log('🔥 Starting Firebase service worker registration...');
      
      // Register the service worker
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('✅ Firebase Service Worker registered successfully:', registration);
        })
        .catch((error) => {
          console.error('❌ Firebase Service Worker registration failed:', error);
        });
    }
  }, []);

  // Capacitor Push Notification Setup (for native apps)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const setupPushNotifications = async () => {
        console.log('🚀 Setting up Capacitor push notifications...');
        
        await PushNotifications.removeAllListeners();
        
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive !== 'granted') {
          console.warn('Push notification permission not granted.');
          return;
        }
        
        await PushNotifications.register();

        PushNotifications.addListener('registration', (token) => {
          console.log('✅ Capacitor Push registration success:', token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Capacitor Push registration error:', error);
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('📱 Capacitor Push received (foreground/background):', notification);
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          console.log('👆 Capacitor Push action performed (tap):', action);
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
