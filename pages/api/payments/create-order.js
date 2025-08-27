function rid() {
  return 'cf_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36)
}

export default async function handler(req, res) {
  const reqId = rid()
  const log = (...args) => console.log(`[create-order][${reqId}]`, ...args)
  const err = (...args) => console.error(`[create-order][${reqId}]`, ...args)

  if (req.method !== 'POST') {
    log('Method not allowed:', req.method)
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { CF_APP_ID, CF_SECRET_KEY, CF_ENV } = process.env
  if (!CF_APP_ID || !CF_SECRET_KEY) {
    err('Missing CF_APP_ID or CF_SECRET_KEY')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const {
    order_amount,
    order_currency = 'INR',
    customer_name,
    customer_email,
    customer_phone,
    order_id = 'ord_' + Date.now(),
  } = req.body || {}

  // Construct return_url with proper double curly braces placeholders for Cashfree
  const origin = req.headers.origin || ''
  const return_url = `${origin}/payment-success?order_id={{order_id}}&payment_session_id={{payment_session_id}}`
  const notify_url = `${origin}/api/payments/webhook`

  log('Input received', {
    order_amount,
    order_currency,
    has_customer_name: !!customer_name,
    has_customer_email: !!customer_email,
    has_customer_phone: !!customer_phone,
    return_url,
    notify_url
  })

  if (!order_amount || !customer_name || !customer_email || !customer_phone) {
    err('Validation failed: missing required fields')
    return res.status(400).json({
      error: 'Missing required fields: order_amount, customer_name, customer_email, customer_phone'
    })
  }

  const payload = {
    order_id,
    order_amount: Number(order_amount),
    order_currency,
    customer_details: {
      customer_id: 'guest_' + Date.now(),
      customer_name,
      customer_email,
      customer_phone
    },
    order_meta: { return_url, notify_url }
  }

  const isProd = CF_ENV === 'PROD'
  const baseUrl = isProd
    ? 'https://api.cashfree.com/pg/orders'
    : 'https://sandbox.cashfree.com/pg/orders'

  const headers = {
    'x-client-id': CF_APP_ID,
    'x-client-secret': CF_SECRET_KEY,
    'x-api-version': '2025-01-01',
    'Content-Type': 'application/json'
  }

  try {
    log('Calling Cashfree Orders API', { url: baseUrl })
    const cfRes = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })
    const text = await cfRes.text()

    let data
    try {
      data = JSON.parse(text)
    } catch (parseErr) {
      err('Cashfree response not JSON', { status: cfRes.status, text })
      return res.status(502).json({ error: 'Invalid response from payment gateway' })
    }

    log('Cashfree response', {
      status: cfRes.status,
      ok: cfRes.ok,
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      errors: data.errors || data.message
    })

    if (!cfRes.ok) {
      return res.status(400).json({ error: 'Order creation failed', details: data })
    }

    log('Success')
    return res.status(200).json({
      order_id: data.order_id,
      payment_session_id: data.payment_session_id,
      order_status: data.order_status
    })
  } catch (e) {
    err('Unhandled error', e.message)
    return res.status(500).json({ error: 'Server error' })
  }
}
