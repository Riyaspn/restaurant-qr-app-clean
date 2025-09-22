// components/EnableAlertsButton.jsx
import { useState, useEffect } from 'react';
import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '../lib/firebaseClient';

export default function EnableAlertsButton({ restaurantId, userEmail }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    setIsIOS(/iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (Notification.permission === 'granted') {
      getMessagingIfSupported()?.then(messaging => messaging && getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY }))
        .then(token => token && setEnabled(true))
        .catch(() => {});
    }
  }, []);

  const enablePush = async () => {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('Permission denied');
      await navigator.serviceWorker.ready;

      if (isIOS) {
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ deviceToken:`ios-pwa-${Date.now()}`, restaurantId, userEmail, platform:'ios-pwa' })
        });
        new Notification('Alerts Enabled', { body:'You’ll get new order alerts' });
      } else {
        const messaging = await getMessagingIfSupported();
        if (!messaging) throw new Error('Messaging not supported');
        const token = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
        if (!token) throw new Error('No token');
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ deviceToken:token, restaurantId, userEmail, platform: /Android/.test(navigator.userAgent) ? 'android' : 'web' })
        });
        // Prime sound
        new Audio('/notification-sound.mp3').play().catch(() => {});
        new Notification('Alerts Enabled', { body:'You’ll get new order alerts' });
      }
      setEnabled(true);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={enablePush} disabled={loading || enabled} className={`btn ${enabled?'btn-success':'btn-primary'}`}>
      {loading ? 'Enabling…' : enabled ? 'Alerts Active' : isIOS ? 'Enable iOS Alerts' : 'Enable Push Alerts'}
    </button>
  );
}
