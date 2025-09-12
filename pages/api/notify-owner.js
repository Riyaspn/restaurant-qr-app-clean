// pages/api/notify-owner.js (robust HTTP v1 style via Admin SDK)
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin credentials');
  privateKey = privateKey.replace(/\\n/g, '\n');
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { restaurantId, orderId, table_number, total_inc_tax, total } = req.body || {};
    if (!restaurantId || !orderId) return res.status(400).json({ error: 'Missing restaurantId or orderId' });

    const { data: rows, error: fetchErr } = await supabase
      .from('push_subscription_restaurants')
      .select('device_token')
      .eq('restaurant_id', restaurantId);
    if (fetchErr) {
      console.error('Fetch tokens error:', fetchErr);
      return res.status(500).json({ error: 'Failed to fetch push subscriptions' });
    }

    const tokens = (rows || []).map((r) => r.device_token).filter(Boolean);
    if (!tokens.length) return res.status(200).json({ message: 'No subscriptions', successCount: 0 });

    const title = '🔔 New Order!';
    const body =
      `Table ${table_number || ''}` +
      (total_inc_tax || total ? ` • ₹${Number(total_inc_tax || total).toFixed(2)}` : '');

    // Build multicast message
    const message = {
      tokens,
      notification: { title, body },
      data: {
        url: `/owner/orders?highlight=${orderId}`,
        orderId: String(orderId),
        restaurantId: String(restaurantId),
      },
      webpush: {
        headers: { Urgency: 'high' },
        fcm_options: { link: `/owner/orders?highlight=${orderId}` },
        notification: {
          requireInteraction: true,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'new-order',
        },
      },
    };

    const messaging = admin.messaging();
    const result = await messaging.sendEachForMulticast(message);

    // Remove invalid tokens
    const invalidTokens = [];
    result.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalidTokens.push(tokens[idx]);
        }
      }
    });
    if (invalidTokens.length) {
      await supabase.from('push_subscription_restaurants').delete().in('device_token', invalidTokens);
    }

    return res.status(200).json({
      message: 'Notifications sent',
      successCount: result.successCount,
      failureCount: result.failureCount,
      pruned: invalidTokens.length,
    });
  } catch (error) {
    console.error('notify-owner error:', error);
    return res.status(500).json({ error: 'Failed to send notifications' });
  }
}
