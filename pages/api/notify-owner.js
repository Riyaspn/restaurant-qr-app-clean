// pages/api/notify-owner.js
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  privateKey = privateKey.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send({ error: 'Method not allowed' });

  const { restaurantId, orderId, table_number, total_inc_tax, total } = req.body || {};
  if (!restaurantId || !orderId) return res.status(400).send({ error: 'Missing restaurantId or orderId' });

  const { data: rows, error: fetchErr } = await supabase
    .from('push_subscription_restaurants')
    .select('device_token')
    .eq('restaurant_id', restaurantId);
  if (fetchErr) {
    console.error('Fetch tokens error:', fetchErr);
    return res.status(500).send({ error: 'Failed to fetch push subscriptions' });
  }
  const tokens = rows.map(r => r.device_token).filter(Boolean);
  if (tokens.length === 0) {
    return res.status(200).send({ message: 'No subscriptions', successCount: 0 });
  }

  const title = '🔔 New Order!';
  const body = `Table ${table_number}${total_inc_tax || total ? ` • ₹${Number(total_inc_tax || total).toFixed(2)}` : ''}`;
  const message = {
    tokens,
    notification: {
      title,
      body,
    },
    data: {
      orderId: String(orderId),
      restaurantId: String(restaurantId),
      url: `/owner/orders?highlight=${orderId}`,
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders',
        sound: 'beep.wav',
        priority: 'high',
      },
    },
    webpush: {
      headers: { Urgency: 'high' },
      fcm_options: { link: `/owner/orders?highlight=${orderId}` },
      notification: {
        requireInteraction: true,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      },
    },
    apns: {
      headers: { 'apns-priority': '5' },
      payload: {
        aps: {
          'content-available': 1,
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    const invalidTokens = [];
    response.responses.forEach((resp, i) => {
      if (!resp.success) {
        const code = resp.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalidTokens.push(tokens[i]);
        }
      }
    });

    if (invalidTokens.length) {
      await supabase.from('push_subscription_restaurants').delete().in('device_token', invalidTokens);
    }

    return res.status(200).send({
      successCount: response.successCount,
      failureCount: response.failureCount,
      pruned: invalidTokens.length,
    });
  } catch (error) {
    console.error('notify-owner error:', error);
    return res.status(500).send({ error: 'Failed to send notifications' });
  }
}
