// pages/api/kitchen/update-status.js
import { supabase } from '../../../services/supabase';

export default async function handler(req, res) {
  const { orderId, status } = req.body;
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId);
  if (error) return res.status(500).json({ error: error.message });
  res.status(200).end();
}
