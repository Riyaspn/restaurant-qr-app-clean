export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { CF_APP_ID, CF_SECRET_KEY, CF_ENV } = process.env
  if (!CF_APP_ID || !CF_SECRET_KEY) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const { order_id, payment_session_id } = req.body || {}
  if (!order_id || !payment_session_id) {
    return res.status(400).json({ error: 'Missing order_id or payment_session_id' })
  }

  const isProd = CF_ENV === 'PROD'
  const url = isProd
    ? `https://api.cashfree.com/pg/orders/${order_id}`
    : `https://sandbox.cashfree.com/pg/orders/${order_id}`

  try {
    const cfRes = await fetch(url, {
      method: 'GET',
      headers: {
        'x-client-id': CF_APP_ID,
        'x-client-secret': CF_SECRET_KEY,
        'x-api-version': '2025-01-01'
      }
    })

    if (!cfRes.ok) {
      const text = await cfRes.text()
      throw new Error(`Gateway error ${cfRes.status}: ${text}`)
    }

    const data = await cfRes.json()
    return res.status(200).json({ order_status: data.order_status })
  } catch (error) {
    console.error('[verify-order]', error)
    return res.status(502).json({ error: 'Failed to verify payment status' })
  }
}
