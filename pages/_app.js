// pages/_app.js
import '../styles/responsive.css';
import '../styles/globals.css';
import '../styles/theme.css';
import Layout from '../components/Layout';
import { RestaurantProvider } from '../context/RestaurantContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { getFCMToken } from '../lib/firebase/messaging';


const OWNER_PREFIX = '/owner';
const CUSTOMER_PREFIX = '/order';

const getApiBase = () => {
  if (typeof window === 'undefined') return '';
  const isProd = process.env.NODE_ENV === 'production';
  const envBase = process.env.NEXT_PUBLIC_API_BASE || '';
  if (Capacitor?.isNativePlatform?.()) {
    // Prefer explicit base for physical devices in dev; fallback to emulator host
    if (!isProd && envBase) return envBase;
    if (!isProd) return 'http://10.0.2.2:3000';
  }
  return '';
};

const getActiveRestaurantId = () => {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    return (
      window.__activeRestaurantId ||
      url.searchParams.get('r') ||
      url.searchParams.get('rid') ||
      localStorage.getItem('active_restaurant_id') ||
      null
    );
  } catch {
    return null;
  }
};

const postSubscribe = async (token, platform) => {
  if (!token) return;
  const rid = getActiveRestaurantId();
  if (!rid) return;

  const payload = { restaurantId: rid, platform, deviceToken: token };
  const url = `${getApiBase()}/api/push/subscribe-bridge`;

  try {
    console.log('[Subscribe] POST ->', url);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    const text = await res.text();
    console.log('[Subscribe] response:', res.status, text.slice(0, 160));
  } catch (e) {
    console.error('[Subscribe] request failed:', e?.message || e);
  }
};

const ensureSubscribed = async () => {
  if (typeof window === 'undefined') return;
  try {
    const rid = getActiveRestaurantId();
    const token = localStorage.getItem('fcm_token');
    if (rid && token) {
      await postSubscribe(token, Capacitor.isNativePlatform() ? 'android' : 'web');
    }
  } catch (e) {
    console.warn('ensureSubscribed skipped:', e?.message || e);
  }
};

function MyApp({ Component, pageProps }) {
  const router = useRouter();
  const path = router.pathname || '';
  const isOwnerRoute = path.startsWith(OWNER_PREFIX);
  const isCustomerRoute = path.startsWith(CUSTOMER_PREFIX);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const init = async () => {
      if (Capacitor.isNativePlatform()) {
        await safeInitNative();
      } else {
        if ('serviceWorker' in navigator) {
          try {
            await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          } catch (e) {
            console.warn('[SW] web register failed:', e?.message || e);
          }
        }
        await safeInitWebOnly();
      }
      setTimeout(() => { ensureSubscribed(); }, 1200);
    };

    init();

    const onRoute = () => { ensureSubscribed(); };
    router.events?.on?.('routeChangeComplete', onRoute);
    window.addEventListener('focus', onRoute);

    return () => {
      router.events?.off?.('routeChangeComplete', onRoute);
      window.removeEventListener('focus', onRoute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const safeInitNative = async () => {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');

      try {
        await PushNotifications.createChannel({
          id: 'orders_v2',
          name: 'Orders',
          description: 'Order alerts',
          importance: 5,
          sound: 'beep',
          lights: true,
          vibration: true,
          visibility: 1,
        });
      } catch {}

      try { await PushNotifications.removeAllListeners(); } catch {}

      PushNotifications.addListener('pushNotificationReceived', (n) => {
        console.log('Push foreground:', n?.title || n?.data?.title || '(no title)');
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const url = action?.notification?.data?.url || '/owner/orders';
        try { router.push(url); } catch { window.location.href = url; }
      });

      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') {
        console.warn('[PushInit] permission not granted');
        return;
      }

      PushNotifications.addListener('registration', async ({ value }) => {
        console.log('[PushInit] registration token:', value);
        try { localStorage.setItem('fcm_token', value); } catch {}
        await postSubscribe(value, 'android');
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('[PushInit] registrationError', err);
      });

      await PushNotifications.register();
    } catch (e) {
      console.warn('Native init skipped:', e?.message || e);
    }
  };

  const safeInitWebOnly = async () => {
    try {
      const token = await getFCMToken();
      if (token) {
        console.log('[WebPush] token', token?.slice(0, 24));
        try { localStorage.setItem('fcm_token', token); } catch {}
        await postSubscribe(token, 'web');
      }
    } catch (e) {
      console.log('Web push skipped:', e?.message || e);
    }
  };


return (
      <RestaurantProvider>
        <Layout
          title={pageProps?.title}
          showSidebar={isOwnerRoute}
          hideChrome={isCustomerRoute}
          showHeader={isCustomerRoute}
        >
          <Component {...pageProps} />
        </Layout>
        {/* KOT pop ONLY on owner pages */}
      </RestaurantProvider>
  );
}

function InnerGlobalKotSubscriber() {
  useGlobalKot();
  return null;
}

export default MyApp;
