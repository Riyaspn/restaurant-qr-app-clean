import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { method } = req
  const { restaurant_id } = req.query
  if (!restaurant_id) return res.status(400).json({ error: 'Missing restaurant_id' })

  try {
    if (method === 'GET') {
      const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .eq('restaurant_id', restaurant_id)
      if (error) throw error
      return res.status(200).json(data)
    }

    if (method === 'POST') {
      const { name, unit, current_stock, reorder_threshold } = req.body
      const { data, error } = await supabase
        .from('ingredients')
        .insert([{ restaurant_id, name, unit, current_stock, reorder_threshold }])
        .single()
      if (error) throw error
      return res.status(201).json(data)
    }

    if (method === 'PUT') {
      const { id, current_stock, reorder_threshold } = req.body
      const { data, error } = await supabase
        .from('ingredients')
        .update({ current_stock, reorder_threshold, updated_at: new Date() })
        .eq('id', id)
        .single()
      if (error) throw error
      return res.status(200).json(data)
    }

    if (method === 'DELETE') {
      const { id } = req.body
      const { error } = await supabase
        .from('ingredients')
        .delete()
        .eq('id', id)
      if (error) throw error
      return res.status(204).end()
    }

    res.setHeader('Allow', ['GET','POST','PUT','DELETE'])
    res.status(405).end(`Method ${method} Not Allowed`)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
