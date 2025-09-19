// components/EnableAlertsButton.jsx

import { useState, useEffect } from 'react';
>>>>>>> a301191 (latest updates)
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

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const checkExistingPermission = async () => {
      const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsIOS(isiOS);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        // Check if we have a stored token
        try {
          const messaging = await getMessagingIfSupported();
          if (messaging) {
            const token = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });
            if (token) {
              setEnabled(true);
            }
          }
        } catch (e) {
          console.log('Token check failed:', e);
        }
      }
    };

    checkExistingPermission();
  }, []);

  const enablePush = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check notification support
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported in this browser');
      }

      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied. Please allow notifications in your browser settings.');
      }

      // Ensure service worker is ready
      await navigator.serviceWorker.ready;

      // iOS Safari PWA handling
      if (isIOS) {
        // For iOS, we'll use a placeholder token since FCM tokens may not work reliably
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceToken: `ios-pwa-${Date.now()}`,
            restaurantId,
            userEmail,
            platform: 'ios-pwa',
          }),
        });

        if (!res.ok) throw new Error('Subscribe failed');
        
        setEnabled(true);
        
        // Test notification
        new Notification('Order Alerts Enabled!', {
          body: 'You will now receive notifications for new orders.',
          icon: '/favicon.ico',
          requireInteraction: true
        });
        
        return;
      }

      // For Android/Desktop - use FCM
      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        throw new Error('Messaging not supported');
      }


      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
      });


      if (!token) throw new Error('Failed to get push token');

      const ua = navigator.userAgent || '';
      const platform = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : 'web';

      if (!token) {
        throw new Error('Failed to get push token');
      }

      const ua = navigator.userAgent;
      const platform = /Android/i.test(ua) ? 'android' : 'web';


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


      if (!res.ok) throw new Error('Subscribe failed');

      // Test audio unlock
      try {
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.1;
        await audio.play();
      } catch (e) {
        console.log('Audio test failed:', e);
      }

      setEnabled(true);
      
      // Test notification
      new Notification('Order Alerts Enabled!', {
        body: 'You will now receive notifications for new orders.',
        icon: '/favicon.ico',
        requireInteraction: true
      });

    } catch (e) {
      console.error('Enable alerts failed:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={enablePush} disabled={loading} className="btn btn-primary">
          {loading ? 'Retrying...' : 'Retry Alerts'}
        </button>
        <span style={{ fontSize: 10, color: '#ff6b6b' }}>{error}</span>
      </div>
    );
  }

  return (
    <button
      onClick={enablePush}
      disabled={loading || enabled}
      className={`btn ${enabled ? 'btn-success' : 'btn-primary'}`}
    >
      {loading ? 'Enabling...' : enabled ? 'Alerts Active' : isIOS ? 'Enable iOS Alerts' : 'Enable Push Alerts'}

    </button>
  );
}
