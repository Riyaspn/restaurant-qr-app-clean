// functions/sendOrderNotification/index.js
import { createClient } from '@supabase/supabase-js';
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

// Initialize Firebase Admin SDK - once
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials in env.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
}

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { order } = req.body || {};
  if (!order || !order.restaurant_id || !order.id) {
    return res.status(400).json({ error: 'Missing order or essential fields.' });
  }

  // Fetch device tokens
  const { data: subs, error: tokenError } = await supabase
    .from('push_subscription_restaurants')
    .select('device_token')
    .eq('restaurant_id', order.restaurant_id);

  if (tokenError) {
    console.error('[sendOrderNotification] token fetch error', tokenError);
    return res.status(500).json({ error: tokenError.message });
  }

  const tokens = (subs || []).map(s => s.device_token).filter(Boolean);
  if (!tokens.length) {
    console.log(`[sendOrderNotification] no tokens for restaurant ${order.restaurant_id}`);
    return res.status(200).json({ message: 'No subscribed devices', successCount: 0, failureCount: 0 });
  }

  const itemCount = Array.isArray(order.items)
    ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
    : 0;
  const totalAmount = Number(order.total_amount || 0).toFixed(2);
  const title = 'New Order Received';
  const body = `Order #${String(order.id).slice(-4)} • ${itemCount} items • ₹${totalAmount}`;

  const message = {
    tokens,
    notification: { title, body },
    data: {
      type: 'new_order',
      orderId: String(order.id),
      url: '/owner/orders'
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'orders_v3',
        sound: 'beep',
        priority: 'high'
      }
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'beep.wav', 'content-available': 1 } }
    }
  };

  try {
    // Use the supported multicast API
    const response = await admin.messaging().sendEachForMulticast(message);

    // Prune invalid tokens
    const invalid = [];
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || '';
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalid.push(tokens[idx]);
        }
      }
    });
    if (invalid.length) {
      await supabase.from('push_subscription_restaurants').delete().in('device_token', invalid);
    }

    return res.status(200).json({
      successCount: response.successCount,
      failureCount: response.failureCount,
      pruned: invalid.length
    });
  } catch (err) {
    console.error('[sendOrderNotification] FCM send error', err);
    return res.status(500).json({ error: err?.message || 'FCM send failed' });
  }
}
