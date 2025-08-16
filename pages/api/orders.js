import { supabase } from '../../services/supabase'

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { restaurant_id, table_number, items, total, customer_notes } = req.body
    const { data, error } = await supabase
      .from('orders')
      .insert([{ restaurant_id, table_number, items, total, customer_notes }])
      .select()

    if (error) return res.status(400).json({ error: error.message })
    return res.status(200).json({ success: true, order: data[0] })
  }
  res.status(405).json({ error: 'Method not allowed' })
}
