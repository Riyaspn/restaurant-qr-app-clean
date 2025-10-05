// pages/api/push/echo.js
import { createClient } from '@supabase/supabase-js';
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
  const rid = req.query.rid;
  if (!rid) return res.status(400).json({ error: 'rid required' });
  const { data, error } = await db
    .from('push_subscription_restaurants')
    .select('device_token')
    .eq('restaurant_id', rid);
  if (error) return res.status(500).json({ error: error.message });
  const prefixes = (data || []).map(r => (r.device_token || '').slice(0, 24));
  return res.status(200).json({ prefixes, count: prefixes.length });
}
