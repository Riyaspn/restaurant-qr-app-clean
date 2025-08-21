// pages/api/orders/create.js
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  console.log('=== Order API Called ===')
  console.log('Method:', req.method)

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const {
      restaurant_id,
      restaurant_name,
      table_number,
      items,
      subtotal,
      total_amount,
      payment_method,
      payment_status,
      special_instructions
    } = req.body

    if (!restaurant_id || !items || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    console.log('Creating order for restaurant:', restaurant_id)

    const orderData = {
      restaurant_id,
      table_number: table_number || 1,
      status: 'new',
      payment_method: payment_method || 'cash',
      payment_status: payment_status || 'pending',
      subtotal: parseFloat(subtotal) || 0,
      tax: 0, // No tax
      total_amount: parseFloat(total_amount) || 0,
      special_instructions: special_instructions || null,
      restaurant_name: restaurant_name || null
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderData])
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return res.status(500).json({ 
        error: 'Failed to create order', 
        details: orderError.message
      })
    }

    console.log('Order created:', order.id)

    const orderItems = items.map(item => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: parseInt(item.quantity) || 1,
      price: parseFloat(item.price) || 0,
      item_name: item.name || 'Unknown Item'
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      await supabase.from('orders').delete().eq('id', order.id)
      return res.status(500).json({ 
        error: 'Failed to create order items', 
        details: itemsError.message
      })
    }

    console.log('Order completed successfully')

    return res.status(200).json({ 
      success: true, 
      order_id: order.id,
      order_number: order.id.slice(0, 8).toUpperCase()
    })

  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    })
  }
}
