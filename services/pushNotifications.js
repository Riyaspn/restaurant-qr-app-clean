// services/pushNotifications.js
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export class PushNotificationService {
  static async initialize(restaurantId, userId) {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push init skipped: not native platform');
      return;
    }
    console.log('Push init start');   // <— added log
    try {
      const perm = await PushNotifications.requestPermissions();
      console.log('Push permission', perm);   // <— added log
      if (perm.receive !== 'granted') {
        console.log('Push permission not granted');
        return;
      }

      await PushNotifications.register();
      console.log('Push register called');   // <— added log

      PushNotifications.addListener('registration', async (token) => {
        console.log('PN token', token.value);  // <— added log
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(
            {
              device_token: token.value,
              restaurant_id: restaurantId,
              user_id: userId,
              platform: 'android',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'device_token' }
          );
        if (error) console.error('PN upsert error', error);
        else console.log('PN upsert success');
      });

      PushNotifications.addListener('registrationError', (err) => {
        console.error('PN registrationError', err);  // <— added log
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('PN received', notification);  // optional listener
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('PN action', notification);  // optional listener
        const url = notification?.notification?.data?.url || '/owner/orders';
        window.location.href = url;
      });
    } catch (err) {
      console.error('Push init failed', err);
    }
  }
}
