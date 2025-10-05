// pages/api/push/send-notification.js
import admin from 'firebase-admin';

function normalizePrivateKey(raw) {
  if (!raw) return '';
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');
  key = key.replace(/\r\n/g, '\n');
  if (!key.endsWith('\n')) key = key + '\n';
  return key;
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export async function sendOrderNotification(orderData, deviceTokens) {
  const message = {
    notification: {
      title: '🔔 New Order Alert!',
      body: `Table ${orderData.table_number || 'N/A'} - Order #${String(orderData.id).slice(0, 8)}`
    },
    data: {
      type: 'new_order',
      orderId: String(orderData.id),
      restaurantId: String(orderData.restaurant_id),
      tableNumber: String(orderData.table_number || ''),
      amount: String(orderData.total_inc_tax || orderData.total_amount || 0),
      url: '/owner/orders',
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders_v3',
        sound: 'beep'
      }
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { 'content-available': 1, 'mutable-content': 1, sound: 'default' } }
    },
    tokens: deviceTokens
  };

  const resp = await admin.messaging().sendEachForMulticast(message);
  return {
    success: true,
    successCount: resp.successCount,
    failureCount: resp.failureCount,
    responses: resp.responses
  };
}
