// pages/api/orders/create.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      restaurant_id,
      restaurant_name,
      table_number,
      items,
      subtotal,
      tax,
      total_amount,
      payment_method,
      payment_status,
      special_instructions
    } = req.body

    // Validation
    if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    console.log('Creating order:', { restaurant_id, table_number, items_count: items.length })

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        restaurant_id,
        table_number: table_number || 1,
        status: 'new',
        payment_method: payment_method || 'cash',
        payment_status: payment_status || 'pending',
        subtotal: subtotal || 0,
        tax: tax || 0,
        total_amount: total_amount || 0,
        special_instructions: special_instructions || null,
        restaurant_name: restaurant_name || null,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return res.status(500).json({ error: 'Failed to create order', details: orderError.message })
    }

    console.log('Order created:', order.id)

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: item.quantity || 1,
      price: item.price || 0,
      item_name: item.name || 'Unknown Item'
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      // Try to rollback order
      await supabase.from('orders').delete().eq('id', order.id)
      return res.status(500).json({ error: 'Failed to create order items', details: itemsError.message })
    }

    console.log('Order items created successfully')

    return res.status(200).json({ 
      success: true, 
      order_id: order.id,
      order_number: order.id.slice(0, 8).toUpperCase()
    })

  } catch (error) {
    console.error('Order creation API error:', error)
    return res.status(500).json({ 
      error: 'Failed to create order',
      details: error.message 
    })
  }
}
