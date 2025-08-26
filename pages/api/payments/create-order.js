// pages/api/payments/create-order.js

// Generate a simple request id to correlate logs
function rid() {
  return 'cf_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36)
}

export default async function handler(req, res) {
  const reqId = rid()
  const startedAt = Date.now()
  const log = (...args) => console.log(`[create-order][${reqId}]`, ...args)
  const warn = (...args) => console.warn(`[create-order][${reqId}]`, ...args)
  const err = (...args) => console.error(`[create-order][${reqId}]`, ...args)

  try {
    if (req.method !== 'POST') {
      warn('Method not allowed:', req.method)
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Check env presence (do not print secrets)
    const hasAppId = !!process.env.CF_APP_ID
    const hasSecret = !!process.env.CF_SECRET_KEY
    const envMode = process.env.CF_ENV || 'TEST'
    if (!hasAppId || !hasSecret) {
      err('Missing envs', { hasAppId, hasSecret })
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Parse and validate body
    const {
      order_amount,
      order_currency = 'INR',
      customer_name,
      customer_email,
      customer_phone,
      // These URLs are used by Cashfree; they can be overridden by the client
      return_url = `${req.headers.origin || ''}/payment-success`,
      notify_url = `${req.headers.origin || ''}/api/payments/webhook`,
    } = req.body || {}

    log('Input received', {
      order_amount,
      order_currency,
      has_customer_name: !!customer_name,
      has_customer_email: !!customer_email,
      has_customer_phone: !!customer_phone,
      return_url,
      notify_url,
    })

    if (!order_amount || !customer_email || !customer_phone) {
      warn('Validation failed: required fields missing')
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (!return_url || !notify_url) {
      warn('Validation failed: URLs missing', { return_url_ok: !!return_url, notify_url_ok: !!notify_url })
      return res.status(400).json({ error: 'Missing return_url or notify_url' })
    }

    // Build order payload for Cashfree
    const order_id = 'ord_' + Date.now()
    const payload = {
      order_id,
      order_amount: Number(order_amount),
      order_currency,
      customer_details: {
        customer_id: customer_email,
        customer_name,
        customer_email,
        customer_phone,
      },
      order_meta: {
        return_url,
        notify_url,
      },
    }

    // Select base URL based on CF_ENV
    const isProd = envMode === 'PROD'
    const baseUrl = isProd ? 'https://api.cashfree.com/pg/orders' : 'https://sandbox.cashfree.com/pg/orders'
    log('Calling Cashfree Orders API', { envMode, url: baseUrl }) // [web:451][web:448]

    // Prepare headers (x-api-version 2022-09-01)
    const headers = {
      'x-client-id': process.env.CF_APP_ID,
      'x-client-secret': process.env.CF_SECRET_KEY,
      'x-api-version': '2022-09-01',
      'Content-Type': 'application/json',
    }
    log('Headers ready', {
      have_client_id: !!headers['x-client-id'],
      have_client_secret: !!headers['x-client-secret'],
      api_version: headers['x-api-version'],
    }) // [web:451][web:448]

    // Execute request
    const cfRes = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    const text = await cfRes.text()
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      err('Cashfree response not JSON', { status: cfRes.status, text_len: text?.length })
      return res.status(502).json({ error: 'Invalid response from payment gateway' })
    }

    log('Cashfree response', {
      status: cfRes.status,
      ok: cfRes.ok,
      order_id: data?.order_id,
      order_status: data?.order_status,
      have_token: !!data?.order_token,
      errors: data?.errors || data?.message || null,
    }) // [web:451][web:448][web:450][web:453]

    if (!cfRes.ok) {
      return res.status(400).json({
        error: 'Order creation failed',
        details: data,
      })
    }

    const durationMs = Date.now() - startedAt
    log('Success', { durationMs })

    // Return the token (payment_session_id)
    return res.status(200).json({
      order_id: data.order_id,
      payment_session_id: data.order_token,
      order_status: data.order_status,
    })
  } catch (e) {
    const durationMs = Date.now() - startedAt
    err('Unhandled error', { message: e?.message, durationMs })
    return res.status(500).json({ error: 'Server error' })
  }
}
