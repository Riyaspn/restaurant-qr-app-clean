//functions/sendOrderNotification/index.js

import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK - this should only run once
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel/Supabase automatically handle newline characters in environment variables.
  // This replace() is a safeguard.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials in environment variables.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Ensure the request is a POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order } = req.body;
  if (!order) {
    return res.status(400).json({ error: 'Missing order data in request body.' });
  }

  // Fetch device tokens for the specified restaurant
  const { data: subs, error: tokenError } = await supabase
    .from('push_subscription_restaurants') // Ensure this is your correct view/table name
    .select('device_token')
    .eq('restaurant_id', order.restaurant_id);

  if (tokenError) {
    console.error('Supabase error fetching tokens:', tokenError);
    return res.status(500).json({ error: tokenError.message });
  }

  const tokens = (subs || []).map(s => s.device_token).filter(Boolean);
  if (tokens.length === 0) {
    console.log(`No device tokens found for restaurant_id: ${order.restaurant_id}`);
    return res.status(200).json({ message: 'No subscribed devices found for this restaurant.' });
  }

  // --- Construct Notification Content ---
  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    : 0;
  const totalAmount = Number(order.total_amount || 0).toFixed(2);
  const title = 'New Order Received';
  const body = `Order #${String(order.id).slice(-4)} • ${itemCount} items • ₹${totalAmount}`;

  // --- FCM Message Payload ---
  // This structure is critical for cross-platform, background delivery.
  const message = {
    tokens,
    // The `notification` object is used by the OS to display the alert
    notification: {
      title,
      body,
    },
    // The `data` object is for your app's custom logic
    data: {
      type: 'new_order',
      orderId: String(order.id),
      url: '/owner/orders', // Deep link for when the user taps the notification
    },
    // `android` specific configuration
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders_v2', // MUST match the ID created in your app
        sound: 'beep',   // The sound file in android/app/src/main/res/raw
        priority: 'high',    // Ensures the notification is treated as important
      },
    },
    // `apns` specific configuration for iOS
    apns: {
      headers: {
        'apns-priority': '10', // High priority for immediate delivery
      },
      payload: {
        aps: {
          sound: 'beep.wav',
          'content-available': 1, // Wakes up the app for background processing
        },
      },
    },
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(`Successfully sent ${response.successCount} messages`);
    if (response.failureCount > 0) {
      console.error('Failed to send to some devices:', response.responses);
    }
    return res.status(200).json({
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('FCM send error:', error);
    return res.status(500).json({ error: error.message });
  }
}
