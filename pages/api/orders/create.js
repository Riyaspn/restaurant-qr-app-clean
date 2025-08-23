// pages/api/orders/create.js

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const {
      restaurant_id,
      table_number,
      items,
      subtotal,
      total_amount,
      payment_method = 'cash',
      payment_status = 'pending',
      special_instructions = null,
      restaurant_name = null
    } = req.body

    if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        restaurant_id,
        table_number: table_number || 1,
        status: 'new',
        payment_method,
        payment_status,
        subtotal: Number(subtotal) || 0,
        tax: 0,
        total_amount: Number(total_amount) || 0,
        special_instructions,
        restaurant_name
      }])
      .select('id')
      .single()

    if (orderError) {
      if (process.env.NODE_ENV !== 'production') console.error('Order creation error:', orderError)
      return res.status(500).json({ error: 'Failed to create order' })
    }

    const orderItems = items.map(item => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: Number(item.quantity) || 1,
      price: Number(item.price) || 0,
      item_name: item.name
    }))

    const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

    if (itemsError) {
      if (process.env.NODE_ENV !== 'production') console.error('Order items error:', itemsError)
      await supabase.from('orders').delete().eq('id', order.id)
      return res.status(500).json({ error: 'Failed to create order items' })
    }

    return res.status(200).json({
      success: true,
      id: order.id,
      order_id: order.id,
      order_number: order.id.slice(0, 8).toUpperCase()
    })
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('API error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
