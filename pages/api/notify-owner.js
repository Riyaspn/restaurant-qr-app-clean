//pages/api/notify-owner.js

import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL, // Use SUPABASE_URL, not NEXT_PUBLIC_SUPABASE_URL on the server
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Method not allowed' });
  }

  const { restaurantId, orderId, orderItems } = req.body || {};
  if (!restaurantId || !orderId) {
    return res.status(400).send({ error: 'Missing restaurantId or orderId' });
  }

  // 1. Fetch device tokens
  const { data: rows, error: fetchErr } = await supabase
    .from('push_subscription_restaurants')
    .select('device_token')
    .eq('restaurant_id', restaurantId);

  if (fetchErr) {
    console.error('Error fetching push subscriptions:', fetchErr);
    return res.status(500).send({ error: 'Failed to fetch push subscriptions' });
  }

  const tokens = rows.map(r => r.device_token).filter(Boolean);
  if (tokens.length === 0) {
    return res.status(200).send({ message: 'No devices subscribed', successCount: 0 });
  }

  // 2. Construct the rich notification content
  const itemCount = Array.isArray(orderItems)
    ? orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0)
    : 0;
  const title = '🔔 New Order Received!';
  const body = `A new order with ${itemCount} items has been placed.`;

  // 3. CRITICAL: Build the robust FCM message payload
  const message = {
    tokens,
    // This `notification` object makes the alert VISIBLE
    notification: {
      title,
      body,
    },
    // This `data` object is for your app to use
    data: {
      orderId: String(orderId),
      url: `/owner/orders?highlight=${orderId}`,
    },
    // This `android` object is ESSENTIAL for background delivery
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders', // MUST match the channel ID in your app
        sound: 'beep.wav',
        priority: 'high',
      },
    },
    // This `apns` object is for iOS
    apns: {
      headers: { 'apns-priority': '10' },
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    // 4. Send the message
    const response = await admin.messaging().sendMulticast(message);

    // 5. Clean up invalid tokens (your existing logic is good)
    const invalidTokens = [];
    response.responses.forEach((resp, i) => {
      if (!resp.success) {
        const code = resp.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalidTokens.push(tokens[i]);
        }
      }
    });

    if (invalidTokens.length > 0) {
      await supabase.from('push_subscriptions').delete().in('device_token', invalidTokens);
    }

    return res.status(200).send({
      successCount: response.successCount,
      failureCount: response.failureCount,
      pruned: invalidTokens.length,
    });
  } catch (error) {
    console.error('FCM send failed:', error);
    return res.status(500).send({ error: 'Failed to send notifications' });
  }
}
