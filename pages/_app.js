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

const OWNER_PREFIX = '/owner';
const CUSTOMER_PREFIX = '/order';

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname || '';
  const showSidebar = path === OWNER_PREFIX || path.startsWith(`${OWNER_PREFIX}/`);
  const isCustomerRoute = path === CUSTOMER_PREFIX || path.startsWith(`${CUSTOMER_PREFIX}/`);

  useEffect(() => {
    async function bootstrap() {
      if (!('serviceWorker' in navigator)) {
        console.log('Service Worker not supported');
        return;
      }

      try {
        // Only register the PWA service worker if not already registered
        const registrations = await navigator.serviceWorker.getRegistrations();
        const hasPwaSW = registrations.some(reg => reg.active && reg.active.scriptURL.includes('service-worker.js'));
        if (!hasPwaSW) {
          const pwaRegistration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('✅ PWA SW registered:', pwaRegistration.scope);
        } else {
          console.log('PWA SW already registered');
        }
      } catch (error) {
        console.error('❌ PWA SW registration failed', error);
      }

      let fbRegistration = null;
      try {
        // Only register Firebase messaging SW if not already registered
        const registrations = await navigator.serviceWorker.getRegistrations();
        const hasFirebaseSW = registrations.some(reg => reg.active && reg.active.scriptURL.includes('firebase-messaging-sw.js'));
        if (!hasFirebaseSW) {
          fbRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('✅ Firebase messaging SW registered:', fbRegistration.scope);
        } else {
          console.log('Firebase messaging SW already registered');
        }
      } catch (error) {
        console.error('❌ Firebase messaging SW registration failed', error);
        return;
      }

      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        console.log('Firebase Messaging not supported');
        return;
      }

      onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        const { title, body } = payload.notification || {};
        if (title && 'Notification' in window && Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
          });
          notification.onclick = () => {
            router.push('/owner/orders');
            notification.close();
          };
          setTimeout(() => notification.close(), 5000);
        }

        // Attempt to play notification sound (may be blocked if no user interaction)
        new Audio('/notification-sound.mp3').play().catch(() => {});
      });
    }

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
