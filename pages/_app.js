// pages/_app.js
import '../styles/responsive.css';
import '../styles/globals.css';
import '../styles/theme.css';
import Layout from '../components/Layout';
import { RestaurantProvider } from '../context/RestaurantContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { onMessage } from 'firebase/messaging';
import { getMessagingIfSupported } from '../lib/firebaseClient';

const OWNER_PREFIX    = '/owner';
const CUSTOMER_PREFIX = '/order';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const path   = router.pathname || '';
  const showSidebar     = path === OWNER_PREFIX || path.startsWith(`${OWNER_PREFIX}/`);
  const isCustomerRoute = path === CUSTOMER_PREFIX || path.startsWith(`${CUSTOMER_PREFIX}/`);

  useEffect(() => {
    const bootstrap = async () => {
      if (!('serviceWorker' in navigator)) return;

      // Register the Firebase messaging service worker
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('✅ SW registered for push');
      } catch (e) {
        console.error('❌ SW registration failed', e);
      }

      // Foreground push handler
      const messaging = await getMessagingIfSupported();
      if (!messaging) return;

      onMessage(messaging, payload => {
        const { title, body } = payload.notification || {};
        if (!title) return;

        // Show browser notification
        if (Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
          notification.onclick = () => {
            router.push('/owner/orders');
            notification.close();
          };
          setTimeout(() => notification.close(), 5000);
        }

        // Play custom in-page sound
        new Audio('/notification-sound.mp3').play().catch(() => {});
      });
    };

    bootstrap();
  }, [router]);

  return (
    <RestaurantProvider>
      <Layout
        title={pageProps?.title}
        showSidebar={showSidebar}
        hideChrome={isCustomerRoute}
        showCustomerHeader={isCustomerRoute}
      >
        <Component {...pageProps} />
      </Layout>
    </RestaurantProvider>
  );
}

export default MyApp;
