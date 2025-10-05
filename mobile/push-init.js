// mobile/push-init.js (call this once on app start for Android app builds)
export async function initAndroidChannel() {
  try {
    // @capacitor/push-notifications API if you use Capacitor runtime
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.createChannel({
      id: 'orders_v3',     // bump id
      name: 'Orders',
      description: 'Order alerts',
      importance: 5,       // high
      sound: 'beep',       // android/app/src/main/res/raw/beep.wav
      lights: true,
      vibration: true,
      visibility: 1
    });
  } catch (e) {
    // If web only, this will simply do nothing
    console.log('Channel init skipped (web runtime)', e?.message || e);
  }
}
