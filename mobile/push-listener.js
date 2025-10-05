// mobile/push-listener.js
export async function attachPushListeners() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    PushNotifications.addListener('pushNotificationReceived', (notif) => {
      // Foreground message: do a small toast or log; DO NOT navigate blindly
      console.log('[push] foreground', notif);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action?.notification?.data?.url;
      if (url) {
        // Postpone navigation until router is ready in your app
        window.location.href = url; // simple fallback
      }
    });
  } catch {}
}
