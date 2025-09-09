// pages/api/push/subscribe.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  const { deviceToken, restaurantId, userEmail, platform } = req.body;
  if (!deviceToken || !restaurantId || !platform) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const now = new Date().toISOString();
  const payload = {
    device_token: deviceToken,
    restaurant_id: restaurantId,
    user_email: userEmail || null,
    platform,
    updated_at: now
  };

  // Upsert mapping
  const { data, error } = await supabase
    .from('push_subscription_restaurants')
    .upsert(payload, {
      onConflict: 'device_token,restaurant_id'
    })
    .select();

  if (error) {
    console.error('Subscribe error:', error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ message: 'Subscribed', subscription: data[0] });
}
