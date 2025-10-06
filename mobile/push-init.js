// mobile/push-init.js
export async function initAndroidChannel() {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
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
  } catch (e) {
    console.log('Channel init skipped (web runtime)', e?.message || e);
  }
}
