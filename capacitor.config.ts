// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/core';

const isProd = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'com.cafeqr.app',
  appName: 'Cafe QR',
  webDir: 'out',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  // In dev, point the WebView at the Next dev server so 10.0.2.2 works
  server: isProd ? {} : { url: 'http://10.0.2.2:3000', cleartext: true },
};

export default config;
