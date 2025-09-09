// services/pushNotifications.js
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabase';

export class PushNotificationService {
  static async initialize(restaurantId, userId) {
    if (!Capacitor.isNativePlatform()) return;
    console.log('Push init start');

    const check = await PushNotifications.checkPermissions();
    const perm = check.receive === 'prompt'
      ? await PushNotifications.requestPermissions()
      : check;
    console.log('Permission result:', perm);
    if (perm.receive !== 'granted') return;

    PushNotifications.addListener('registration', async ({ value }) => {
      console.log('PN token', value);
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            device_token: value,
            restaurant_id: restaurantId,
            user_id: userId,
            platform: 'android',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'device_token' }
        );
      console.log(error ? 'Upsert error' : 'Upsert success', error || '');
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('registrationError', err);
    });

    await PushNotifications.register();
    console.log('Registering for push');
  }
}
