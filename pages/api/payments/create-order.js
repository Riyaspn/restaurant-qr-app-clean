// pages/api/payments/create-order.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const {
      order_amount,
      order_currency = 'INR', 
      customer_name,
      customer_email,
      customer_phone,
      return_url = `${req.headers.origin}/payment-success`, // Add return URL
      notify_url = `${req.headers.origin}/api/payments/webhook` // Add notify URL
    } = req.body

    if (!order_amount || !customer_email || !customer_phone) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const order_id = 'ord_' + Date.now()
    
    const payload = {
      order_id,
      order_amount: Number(order_amount),
      order_currency,
      customer_details: {
        customer_id: customer_email,
        customer_name,
        customer_email, 
        customer_phone
      },
      order_meta: {
        return_url,
        notify_url
      }
    }

    // Use sandbox endpoint
    const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'POST',
      headers: {
        'x-client-id': process.env.CF_APP_ID,
        'x-client-secret': process.env.CF_SECRET_KEY,
        'x-api-version': '2022-09-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()
    
    if (!response.ok) {
      console.error('Cashfree order creation failed:', data)
      return res.status(400).json({ error: 'Order creation failed', details: data })
    }

    // Return payment_session_id (order_token)
    return res.status(200).json({
      order_id: data.order_id,
      payment_session_id: data.order_token, // This is what the video calls payment_session_id
      order_status: data.order_status
    })

  } catch (error) {
    console.error('Order creation error:', error)
    return res.status(500).json({ error: 'Server error' })
  }
}
