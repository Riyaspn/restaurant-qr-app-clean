// pages/api/notify-owner.js
import admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  };
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { restaurantId, orderId, orderItems } = req.body;
  if (!restaurantId || !orderId) {
    return res.status(400).json({ error: 'Missing restaurantId or orderId' });
  }

  // Fetch all tokens for this restaurant
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: rows, error } = await supabase
    .from('push_subscription_restaurants')
    .select('device_token')
    .eq('restaurant_id', restaurantId);

  if (error) {
    console.error('Fetch tokens error:', error);
    return res.status(500).json({ error: error.message });
  }

  const tokens = rows.map(r => r.device_token);
  if (tokens.length === 0) {
    return res.status(200).json({ message: 'No subscriptions' });
  }

  const itemCount = Array.isArray(orderItems) ? orderItems.length : 0;
  const body = `Order #${orderId.slice(0,8)} placed` +
    (itemCount > 0 ? ` • ${itemCount} items` : '');

  const message = {
    notification: { title: '🔔 New Order!', body },
    webpush: {
      notification: {
        sound: 'default',
        requireInteraction: true,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'new-order',
        data: { orderId, restaurantId, url: `/owner/orders?highlight=${orderId}` }
      }
    },
    tokens
  };

  const response = await admin.messaging().sendMulticast(message);
  return res.status(200).json({
    successCount: response.successCount,
    failureCount: response.failureCount
  });
}
