import { getSupabase } from '../../services/supabase';

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not initialized');
    return res.status(500).json({ error: 'Supabase not initialized' });
  }

  if (req.method === 'POST') {
    const { restaurant_id, table_number, items, total, customer_notes } = req.body;
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([{ restaurant_id, table_number, items, total, customer_notes }])
        .select();

      if (error) {
        console.error('Insert order error:', error);
        return res.status(400).json({ error: error.message });
      }
      return res.status(200).json({ success: true, order: data[0] });
    } catch (e) {
      console.error('Unexpected error creating order:', e);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
