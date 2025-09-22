import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';
import fetch from 'node-fetch';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId ||!clientEmail ||!privateKey) {
    throw new Error('Missing Firebase Admin credentials');
  }
  privateKey = privateKey.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { order } = req.body;

  const { data: subs, error: tokenError } = await supabase
   .from('push_subscription_restaurants')
   .select('device_token')
   .eq('restaurant_id', order.restaurant_id);

  if (tokenError) {
    console.error('Error fetching tokens:', tokenError);
    return res.status(500).json({ error: tokenError.message });
  }

  const tokens = (subs ||).map(s => s.device_token).filter(Boolean);
  if (!tokens.length) {
    return res.status(200).json({ message: 'No tokens found' });
  }

  const count = Array.isArray(order.items)? order.items.reduce((s, it) => s + (it.quantity || 1), 0) : 0;
  const total = Number(order.total_amount || 0).toFixed(2);
  const title = 'New Order Received';
  const body = `Order #${String(order.id).slice(0, 8)} has been placed.`;

  try {
    const message = {
      tokens,
      notification: { title, body },
      data: {
        type: 'new_order',
        orderId: String(order.id),
        restaurantId: String(order.restaurant_id),
        total: String(total),
        items: String(count),
        url: '/owner/orders',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'orders',
          sound: 'beep.wav',
          vibrationPattern: ['200', '100', '200', '100', '200'],
          priority: 'high',
        }
      },
      apns: {
        headers: {
          'apns-priority': '5'
        },
        payload: {
          aps: {
            'content-available': 1,
            'mutable-content': 1,
            sound: 'default'
          },
        }
      }
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log('FCM response:', response);
    return res.status(200).json(response);
  } catch (e) {
    console.error('Error sending notification:', e);
    return res.status(500).json({ error: e.message });
  }
}