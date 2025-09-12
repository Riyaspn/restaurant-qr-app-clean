// components/EnableAlertsButton.jsx
import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '../lib/firebaseClient';

export default function EnableAlertsButton({ restaurantId, userEmail }) {
  const onEnable = async () => {
    try {
      if (!('Notification' in window)) throw new Error('Notifications not supported');

      const perm = await Notification.requestPermission(); // must be in a user gesture
      if (perm !== 'granted') {
        alert('Please allow notifications to receive order alerts.');
        return;
      }

      // Ensure SW is ready before token
      await navigator.serviceWorker.ready;

      const messaging = await getMessagingIfSupported();
      if (!messaging) throw new Error('Messaging not supported');

      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
      });

      if (!token) throw new Error('Failed to get push token');

      const ua = navigator.userAgent || '';
      const platform = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : 'web';

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken: token,
          restaurantId,
          userEmail,
          platform,
        }),
      });
      if (!res.ok) throw new Error('Subscribe failed');

      // Prime audio unlock right after gesture
      try { await new Audio('/notification-sound.mp3').play(); } catch {}

      alert('Order alerts enabled.');
    } catch (e) {
      console.error('Enable alerts failed:', e);
      alert('Failed to enable alerts. Check console.');
    }
  };

  return (
    <button onClick={onEnable} className="btn btn-primary">
      Enable order alerts
    </button>
  );
}
