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
        // Register Firebase messaging SW if not registered
        const registrations = await navigator.serviceWorker.getRegistrations();
        if (!registrations.some((r) => r.active && r.active.scriptURL.includes('firebase-messaging'))) {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('Firebase messaging SW registered:', registration.scope);
        } else {
          console.log('Firebase messaging SW already registered');
        }
      } catch (error) {
        console.error('Firebase messaging SW registration failed', error);
        return;
      }

      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        console.log('Firebase messaging not supported');
        return;
      }

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        console.log('Foreground message received', payload);

        // Play custom notification sounds
        const audioPaths = ['/beep.mp3', '/notification.mp3', '/alert.mp3'];
        (async () => {
          for (const path of audioPaths) {
            try {
              const audio = new Audio(path);
              audio.volume = 0.8;
              await audio.play();
              break;
            } catch (_e) {
              // Try next sound if current fails
            }
          }
        })();

        const { title, body } = payload.notification || {};
        if (title && Notification.permission === 'granted') {
          const notification = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
          });
          notification.onclick = () => {
            router.push('/owner/orders');
            notification.close();
          };
          setTimeout(() => notification.close(), 15000);
        }
      });

      console.log('Firebase messaging initialized');
    }

    bootstrap().catch((e) => {
      console.error('Push bootstrap failed', e);
    });
  }, [router]);

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
