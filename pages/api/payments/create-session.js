// pages/api/payments/create-session.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { amount, payment_method } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

    const order_id = `ORDER_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const sessionData = {
      order_id,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        // Provide minimal anonymous details if required by PSP
        customer_id: order_id,
        customer_name: 'Guest',
        customer_email: 'guest@example.com'
      },
      order_meta: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/order/payment-callback?order_id=${order_id}`,
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payments/webhook`,
        payment_methods: payment_method === 'upi' ? 'upi' : 'cc,dc,nb,upi'
      }
    }

    const resp = await fetch(process.env.CASHFREE_API_URL || 'https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
        'x-api-version': '2022-09-01'
      },
      body: JSON.stringify(sessionData)
    })
    const result = await resp.json()
    if (!resp.ok) {
      console.error('Cashfree error:', result)
      return res.status(500).json({ error: 'Payment session creation failed' })
    }
    return res.status(200).json({
      session_id: result.cf_order_id,
      payment_url: result.payment_link,
      order_id
    })
  } catch (e) {
    console.error(e)
    return res.status(500).json({ error: 'Internal error' })
  }
}
