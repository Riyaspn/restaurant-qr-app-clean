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

const OWNER_PREFIX = '/owner';
const CUSTOMER_PREFIX = '/order';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname || '';
  const showSidebar = path === OWNER_PREFIX || path.startsWith(`${OWNER_PREFIX}/`);
  const isCustomerRoute = path === CUSTOMER_PREFIX || path.startsWith(`${CUSTOMER_PREFIX}/`);

  // This single, centralized useEffect handles all native push notification logic.
  useEffect(() => {
    // Only run this logic on a native device (iOS or Android)
    if (Capacitor.isNativePlatform()) {
      const setupPushNotifications = async () => {
        console.log('Initializing Capacitor Push Notifications...');
        
        // Remove any old listeners to ensure a clean start
        await PushNotifications.removeAllListeners();

        // 1. Request permission
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive !== 'granted') {
          console.error('User denied push notification permissions.');
          return;
        }

        // 2. Register with FCM to get the device token
        await PushNotifications.register();

        // --- All Listeners Are Now Centralized Here ---

        // On success, we get a device token
        PushNotifications.addListener('registration', (token) => {
          console.log('✅ Push registration success, token: ' + token.value);
          // You should send this token to your backend server to associate it with the user
        });

        // On error, log it
        PushNotifications.addListener('registrationError', (error) => {
          console.error('❌ Error on push registration: ' + JSON.stringify(error));
        });

        // Show a notification when the app is open
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          console.log('🔵 Push received in foreground:', notification);
          // You can add a toast or an in-app alert here if you want
        });

        // Handle the user tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('🔵 Push action performed (notification tapped):', notification);
          // When the user taps the notification, navigate to the orders page
          router.push('/owner/orders');
        });
      };

      setupPushNotifications().catch(console.error);
    }
  }, [router]); // router is a dependency for the action listener

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
