import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.cafeqr.app',
  appName: 'Cafe QR',
  webDir: 'out',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge','sound','alert']
    }
  }
};

export default config;
