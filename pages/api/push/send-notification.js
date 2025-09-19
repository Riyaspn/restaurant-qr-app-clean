// api/push/send-notification.js
import admin from 'firebase-admin';

// Initialize Firebase Admin (do this once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      // Your Firebase service account key
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

export async function sendOrderNotification(orderData, deviceTokens) {
  try {
    const message = {
      notification: {
        title: '🔔 New Order Alert!',
        body: `Table ${orderData.table_number || 'N/A'} - Order #${orderData.id.slice(0, 8)}`,
      },
      data: {
        type: 'new_order',
        orderId: orderData.id,
        restaurantId: orderData.restaurant_id,
        tableNumber: String(orderData.table_number || ''),
        amount: String(orderData.total_inc_tax || orderData.total_amount || 0),
        url: '/owner/orders',
      },
      android: {
        channelId: 'orders',
        priority: 'high',
        notification: {
          channelId: 'orders',
          priority: 'high',
          defaultSound: false,
          sound: 'beep.wav',
          vibrationPattern: ['200', '100', '200', '100', '200'],
          lightSettings: {
            color: {
              red: 1.0,
              green: 0.0,
              blue: 0.0,
              alpha: 1.0
            },
            lightOnDuration: '200ms',
            lightOffDuration: '200ms'
          }
        }
      },
      apns: {
        payload: {
          aps: {
            sound: {
              name: 'default',
              volume: 1.0
            },
            badge: 1
          }
        }
      },
      tokens: deviceTokens // Array of device tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('Notification sent successfully:', response);
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
    
  } catch (error) {
    console.error('Error sending notification:', error);
    throw error;
  }
}
