// functions/sendOrderNotification/index.js (Final Corrected Version)

import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK once
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials');
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order } = req.body;
  const { data: subs, error: tokenError } = await supabase
    .from('push_subscription_restaurants')
    .select('device_token')
    .eq('restaurant_id', order.restaurant_id);

  if (tokenError) {
    console.error('Error fetching tokens:', tokenError);
    return res.status(500).json({ error: tokenError.message });
  }

  const tokens = (subs || []).map(s => s.device_token).filter(Boolean);
  if (!tokens.length) {
    return res.status(200).json({ message: 'No tokens found' });
  }

  const count = Array.isArray(order.items)
    ? order.items.reduce((s, it) => s + (it.quantity || 1), 0)
    : 0;
  const total = Number(order.total_amount || 0).toFixed(2);

  const title = 'New Order Received';
  const body = `#${String(order.id).slice(0, 8)} • ${count} items • ₹${total}`;

  try {
    // This is the most robust payload structure for ensuring killed-app delivery.
    const message = {
      tokens,
      // 1. The top-level `notification` object tells the OS to display a notification immediately.
      notification: {
        title,
        body,
      },
      // 2. The `data` payload is for your app to use when it's opened.
      data: {
        type: 'new_order',
        orderId: String(order.id),
        url: '/owner/orders',
        timestamp: Date.now().toString(),
      },
      // 3. The `android` block provides critical OS-specific instructions.
      android: {
        priority: 'high', // Absolutely essential for heads-up notifications.
        notification: {
          channelId: 'orders', // CRITICAL: This MUST match the channel ID in your Android app.
          sound: 'beep.wav',     // The custom sound file in `res/raw`.
          priority: 'high',      // Ensures the notification is treated as important.
          visibility: 'private', // Standard visibility for notifications.
        },
      },
      // 4. The `apns` block is for iOS configuration.
      apns: {
        headers: {
          'apns-priority': '10', // High priority for iOS.
        },
        payload: {
          aps: {
            sound: 'beep.wav',
            'content-available': 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log('FCM response:', response);
    
    return res.status(200).json({ successCount: response.successCount, failureCount: response.failureCount });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({ error: error.message });
  }
}
