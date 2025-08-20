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
      table_number,
      items,
      subtotal,
      tax,
      total_amount,
      payment_method,
      payment_status,
      special_instructions,
      payment_details
    } = req.body

    // Validation
    if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Get restaurant and profile data
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select(`
        id, name,
        restaurant_profiles(phone, shipping_address_line1, shipping_city, shipping_state, shipping_pincode)
      `)
      .eq('id', restaurant_id)
      .single()

    if (restError || !restaurant) {
      return res.status(404).json({ error: 'Restaurant not found' })
    }

    const profile = restaurant.restaurant_profiles || {}
    const fullAddress = [
      profile.shipping_address_line1,
      profile.shipping_city,
      profile.shipping_state,
      profile.shipping_pincode
    ].filter(Boolean).join(', ')

    // Create order with denormalized restaurant data
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        restaurant_id,
        table_number,
        status: 'new',
        payment_method: payment_method || 'cash',
        payment_status: payment_status || 'pending',
        subtotal: subtotal || 0,
        tax: tax || 0,
        total_amount: total_amount || 0,
        special_instructions: special_instructions || null,
        payment_details: payment_details || null,
        restaurant_name: restaurant.name,
        restaurant_phone: profile.phone,
        restaurant_address: fullAddress,
        created_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      throw new Error('Failed to create order')
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      menu_item_id: item.id,
      quantity: item.quantity,
      price: item.price,
      item_name: item.name
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      // Rollback order if items creation fails
      await supabase.from('orders').delete().eq('id', order.id)
      throw new Error('Failed to create order items')
    }

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
