// services/pushNotifications.js
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export class PushNotificationService {
  static async initialize(restaurantId, userId) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') return;

      await PushNotifications.register();

      PushNotifications.addListener('registration', async (token) => {
        await supabase.from('push_subscriptions').upsert({
          device_token: token.value,
          restaurant_id: restaurantId,
          user_id: userId,
          platform: 'android',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'device_token' });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        const url = notification?.notification?.data?.url || '/owner/orders';
        window.location.href = url;
      });
    } catch (err) {
      console.error('Push init failed', err);
    }
  }
}
