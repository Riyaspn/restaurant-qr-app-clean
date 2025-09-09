import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.cafeqr.app',
  appName: 'Cafe QR',
  webDir: 'out', // Capacitor needs index.html here
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  // Remove any server.url section for production
};

export default config;
