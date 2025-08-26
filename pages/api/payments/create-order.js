// pages/api/payments/create-order.js

function rid() {
  return 'cf_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36)
}

export default async function handler(req, res) {
  const reqId = rid()
  const log = (...args) => console.log(`[create-order][${reqId}]`, ...args)
  const err = (...args) => console.error(`[create-order][${reqId}]`, ...args)

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Check env vars
    const hasAppId = !!process.env.CF_APP_ID
    const hasSecret = !!process.env.CF_SECRET_KEY
    if (!hasAppId || !hasSecret) {
      err('Missing envs', { hasAppId, hasSecret })
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Parse body - customer_name is now required per v2025-01-01 docs
    const {
      order_amount,
      order_currency = 'INR',
      customer_name,      // Required in new API version
      customer_email,
      customer_phone,
      order_id = 'ord_' + Date.now(),
      return_url = `${req.headers.origin || ''}/payment-success`,
      notify_url = `${req.headers.origin || ''}/api/payments/webhook`,
    } = req.body || {}

    log('Input received', {
      order_amount,
      order_currency,
      has_customer_name: !!customer_name,
      has_customer_email: !!customer_email,
      has_customer_phone: !!customer_phone,
    })

    // Validate required fields per v2025-01-01
    if (!order_amount || !customer_name || !customer_email || !customer_phone) {
      return res.status(400).json({ error: 'Missing required fields: order_amount, customer_name, customer_email, customer_phone' })
    }

    // Build payload per v2025-01-01 schema
    const payload = {
      order_id,
      order_amount: Number(order_amount),
      order_currency,
      customer_details: {
        customer_id: customer_email,
        customer_name,        // Required field
        customer_email,
        customer_phone,
      },
      order_meta: {
        return_url,
        notify_url,
      },
    }

    // Use v2025-01-01 API
    const baseUrl = process.env.CF_ENV === 'PROD' 
      ? 'https://api.cashfree.com/pg/orders' 
      : 'https://sandbox.cashfree.com/pg/orders'

    const headers = {
      'x-client-id': process.env.CF_APP_ID,
      'x-client-secret': process.env.CF_SECRET_KEY,
      'x-api-version': '2025-01-01',  // Updated to current version
      'Content-Type': 'application/json',
    }

    log('Calling Cashfree v2025-01-01', { url: baseUrl })

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const data = await response.json()

    log('Cashfree response', {
      status: response.status,
      ok: response.ok,
      order_id: data?.order_id,
      have_payment_session_id: !!data?.payment_session_id,
    })

    if (!response.ok) {
      return res.status(400).json({
        error: 'Order creation failed',
        details: data,
      })
    }

    return res.status(200).json({
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,  // Field name per v2025-01-01
      order_status: data.order_status,
    })

  } catch (error) {
    err('Unhandled error', error?.message)
    return res.status(500).json({ error: 'Server error' })
  }
}
