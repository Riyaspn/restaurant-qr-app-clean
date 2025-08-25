// pages/api/payments/create-order.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const {
      amount,
      currency = 'INR',
      customer_name,
      customer_email,
      customer_phone,
      metadata = {} // e.g., { restaurantId, tableNo }
    } = req.body || {}

    if (!amount || !customer_email || !customer_phone) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Build Cashfree order payload
    const orderId = 'ord_' + Date.now()
    const payload = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: currency,
      customer_details: {
        customer_id: customer_email,
        customer_name,
        customer_email,
        customer_phone
      },
      order_note: metadata?.note || '',
      // Optional: return_url, notify_url
    }

    const cfBase =
      process.env.CF_ENV === 'PROD'
        ? 'https://api.cashfree.com/pg/orders'
        : 'https://sandbox.cashfree.com/pg/orders'

    const r = await fetch(cfBase, {
      method: 'POST',
      headers: {
        'x-client-id': process.env.CF_APP_ID,
        'x-client-secret': process.env.CF_SECRET_KEY,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await r.json()
    if (!r.ok) {
      console.error('Cashfree create order error:', data)
      return res.status(400).json({ error: 'Cashfree create order failed', details: data })
    }

    // Persist order in DB (pseudo; plug in Supabase/Prisma)
    // await db.orders.insert({ orderId, amount, currency, status: 'created', cf_order_id: data.order_id, cf_order_token: data.order_token, metadata })

    return res.status(200).json({
      order_id: data.order_id,
      order_token: data.order_token,
      order_status: data.order_status
    })
  } catch (e) {
    console.error('create-order error', e)
    return res.status(500).json({ error: 'Server error' })
  }
}
