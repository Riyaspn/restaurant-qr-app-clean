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
        .from('recipes')
        .select(`
          id,
          menu_item_id,
          recipe_items ( id, ingredient_id, quantity, ingredients ( name, unit ) )
        `)
        .eq('restaurant_id', restaurant_id)
      if (error) throw error
      return res.status(200).json(data)
    }

    if (method === 'POST') {
      const { menu_item_id, items } = req.body
      // Upsert recipe
      const { data: rec, error: recErr } = await supabase
        .from('recipes')
        .upsert({ restaurant_id, menu_item_id }, { onConflict: ['restaurant_id','menu_item_id'] })
        .select('id')
        .single()
      if (recErr) throw recErr

      // Delete old items, insert new
      await supabase.from('recipe_items').delete().eq('recipe_id', rec.id)
      const itemsToInsert = items.map(i => ({ recipe_id: rec.id, ingredient_id: i.ingredient_id, quantity: i.quantity }))
      const { error: itemsErr } = await supabase.from('recipe_items').insert(itemsToInsert)
      if (itemsErr) throw itemsErr

      return res.status(200).json({ recipe_id: rec.id })
    }

    res.setHeader('Allow', ['GET','POST'])
    res.status(405).end(`Method ${method} Not Allowed`)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
