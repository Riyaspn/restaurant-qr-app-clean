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

  // This hook is for push notifications and remains unchanged.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      const setupPushNotifications = async () => {
        await PushNotifications.removeAllListeners();
        const permStatus = await PushNotifications.requestPermissions();
        if (permStatus.receive !== 'granted') return;
        await PushNotifications.register();
        PushNotifications.addListener('registration', (token) => console.log('Push registration success:', token.value));
        PushNotifications.addListener('registrationError', (error) => console.error('Push registration error:', error));
        PushNotifications.addListener('pushNotificationReceived', (notification) => console.log('Push received:', notification));
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          console.log('Push action performed:', notification);
          router.push('/owner/orders');
        });
      };
      setupPushNotifications().catch(console.error);
    }
  }, [router]);

  const path = router.pathname || '';
  const showSidebar = path.startsWith(OWNER_PREFIX);
  const isCustomerRoute = path.startsWith(CUSTOMER_PREFIX);

  return (
    // RestaurantProvider no longer needs any props.
    <RestaurantProvider> 
      <Layout
        title={pageProps?.title}
        showSidebar={showSidebar}
        hideChrome={isCustomerRoute}
        showHeader={isCustomerRoute}
      >
        {/* The supabase prop is removed from Component. */}
        <Component {...pageProps} />
      </Layout>
    </RestaurantProvider>
  );
}

export default MyApp;
