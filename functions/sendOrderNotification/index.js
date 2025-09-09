// functions/sendOrderNotification/index.js
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { order } = req.body;
  // Fetch all device tokens for this restaurant
  const { data: tokens, error: tokenError } = await supabase
    .from('push_subscriptions')
    .select('device_token')
    .eq('restaurant_id', order.restaurant_id);

  if (tokenError) {
    console.error('Error fetching tokens:', tokenError);
    return res.status(500).json({ error: tokenError.message });
  }
  if (!tokens || tokens.length === 0) {
    return res.status(200).json({ message: 'No tokens found' });
  }

  const message = {
    registration_ids: tokens.map(t => t.device_token),
    notification: {
      title: 'New Order Received',
      body: `Order #${order.id.slice(0,8)} has been placed.`,
    },
  };

  const response = await fetch(
    'https://fcm.googleapis.com/fcm/send',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${process.env.FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify(message),
    }
  );
  const result = await response.json();
  console.log('FCM response:', result);
  return res.status(200).json(result);
}
