// pages/api/push/subscribe.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { deviceToken, restaurantId, userEmail, platform } = req.body;

    // Validate required fields
    if (!restaurantId || !platform) {
      return res.status(400).json({
        error: 'Missing required fields: restaurantId and platform are required'
      });
    }

    // Build payload
    const now = new Date().toISOString();
    const payload = {
      device_token: deviceToken || null,
      restaurant_id: restaurantId,
      user_email: userEmail || null,
      platform,
      created_at: now,
      updated_at: now
    };

    // Upsert subscription record
    const { data, error: upsertError } = await supabase
      .from('push_subscription_restaurants')
      .upsert(payload, {
        onConflict: 'device_token,restaurant_id',
        ignoreDuplicates: false
      })
      .select();

    if (upsertError) {
      console.error('Subscribe error:', upsertError);
      return res.status(500).json({ error: upsertError.message });
    }

    return res.status(200).json({
      message: 'Subscribed successfully',
      subscription: data[0] || null
    });
  } catch (err) {
    console.error('Unexpected error in subscribe handler:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
