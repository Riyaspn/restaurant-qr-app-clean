import { getSupabase } from '../../../services/supabase';

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not initialized');
    return res.status(500).json({ error: 'Supabase not initialized' });
  }

  const { orderId, status } = req.body;
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    if (error) {
      console.error('Update status error:', error);
      return res.status(500).json({ error: error.message });
    }
    res.status(200).end();
  } catch (e) {
    console.error('Unexpected error updating status:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
