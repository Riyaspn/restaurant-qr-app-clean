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
      metadata = {} // e.g. { restaurantId, tableNo, note }
    } = req.body || {}

    if (!amount || !customer_email || !customer_phone) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

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
      order_note: metadata?.note || ''
    }

    const isProd = process.env.CF_ENV === 'PROD'
    const base = isProd
      ? 'https://api.cashfree.com/pg/orders'
      : 'https://sandbox.cashfree.com/pg/orders'

    const r = await fetch(base, {
      method: 'POST',
      headers: {
        'x-client-id': process.env.CF_APP_ID || '',
        'x-client-secret': process.env.CF_SECRET_KEY || '',
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

    // TODO: persist order with data.order_id and data.order_token in DB if needed.

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
