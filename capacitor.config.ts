import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
appId: 'com.cafeqr.app',
appName: 'Cafe QR',
webDir: 'out', // change if your build output is different (e.g., 'dist' or '.next')
server: {
url: 'https://restaurant-qr-app-clean.vercel.app', // your deployed URL
cleartext: true
},
plugins: {
PushNotifications: {
presentationOptions: ['badge', 'sound', 'alert']
}
}
};

export default config;