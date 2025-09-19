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

      console.log('🚀 Push notification bootstrap starting...');

      const userAgent = navigator.userAgent;
      const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
      const isAndroid = /Android/i.test(userAgent);
      const isMobile = isIOS || isAndroid;
      const isPWA =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

      console.log('📱 Device Info:', {
        isIOS, isAndroid, isMobile,
        isDesktop: !isMobile,
        isPWA,
      });

      if (!navigator.serviceWorker || !window.Notification) {
        console.error('❌ Service Worker or Notifications not supported');
        return;
      }

      // Register PWA SW
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (!regs.some(r => r.active?.scriptURL.includes('service-worker.js'))) {
          const reg = await navigator.serviceWorker.register('/service-worker.js');
          console.log('✅ PWA SW registered:', reg.scope);
        }
      } catch (e) {
        console.error('❌ PWA SW registration failed:', e);
      }

      // Register Firebase SW
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        if (!regs.some(r => r.active?.scriptURL.includes('firebase-messaging-sw.js'))) {
          const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('✅ Firebase SW registered:', reg.scope);
        }
      } catch (e) {
        console.error('❌ Firebase SW registration failed:', e);
        return;
      }

      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker ready');

      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        console.error('❌ Firebase Messaging not supported');
        return;
      }
      console.log('✅ Firebase Messaging initialized');

      onMessage(messaging, (payload) => {
        console.log('📨 Foreground message:', payload);
        const { title, body } = payload.notification || {};
        if (!title) return;

        // Try to play sound from available files
        (async () => {
          const files = [
            '/notification-sound.mp3',
            '/notification.mp3',
            '/beep.mp3',
            '/alert.mp3',
          ];
          for (const src of files) {
            try {
              const audio = new Audio(src);
              audio.volume = 0.8;
              await audio.play();
              break;
            } catch {}
          }
        })();

        if (Notification.permission === 'granted') {
          const notif = new Notification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'foreground-notification',
            requireInteraction: true,
            vibrate: [200, 100, 200],
            data: { url: '/owner/orders' },
            actions: [
              { action: 'view', title: 'View Orders' },
              { action: 'dismiss', title: 'Dismiss' },
            ],
          });
          notif.onclick = () => {
            router.push('/owner/orders');
            notif.close();
          };
          setTimeout(() => notif.close(), 15000);
        }
      });

      console.log('🎉 Push notification setup complete');
    }

    bootstrap().catch((e) => console.error('💥 Bootstrap failed:', e));

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
