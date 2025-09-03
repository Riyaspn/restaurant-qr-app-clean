// services/pushNotifications.js
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export class PushNotificationService {
  static async initialize(restaurantId, userId) {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push init skipped: not native');
      return;
    }
    console.log('Push init start');
    try {
      const perm = await PushNotifications.requestPermissions();
      console.log('Push permission', perm);
      if (perm.receive !== 'granted') {
        console.log('Permission denied');
        return;
      }
      console.log('Registering for push');
      await PushNotifications.register();

      PushNotifications.addListener('registration', async ({ value }) => {
        console.log('PN token', value);
        const { error } = await supabase
          .from('push_subscriptions')
          .upsert({
            device_token: value,
            restaurant_id: restaurantId,
            user_id: userId,
            platform: 'android',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'device_token' });
        if (error) console.error('Upsert error', error);
        else console.log('Upsert success');
      });

      PushNotifications.addListener('registrationError', err => {
        console.error('Registration error', err);
      });
    } catch (err) {
      console.error('Push init failed', err);
    }
  }
}
