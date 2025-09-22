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
        body: `Table ${orderData.table_number || 'N/A'} - Order #${String(orderData.id).slice(0, 8)}`,
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
          channelId: 'orders',
          sound: 'beep.wav',
          vibrationPattern: ['200', '100', '200', '100', '200'],
        }
      },
      apns: {
        headers: {
          'apns-priority': '5',
        },
        payload: {
          aps: {
            'content-available': 1,
            'mutable-content': 1,
            sound: 'default'
          }
        }
      },
      tokens: deviceTokens
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