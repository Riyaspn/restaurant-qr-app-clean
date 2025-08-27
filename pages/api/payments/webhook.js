// pages/api/payments/webhook.js
import crypto from 'crypto'

export const config = { api: { bodyParser: false } }

// Read raw request body
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  const reqId = Math.random().toString(36).slice(2, 8) + Date.now().toString(36)
  const log = (...args) => console.log(`[webhook][${reqId}]`, ...args)
  const err = (...args) => console.error(`[webhook][${reqId}]`, ...args)

  if (req.method !== 'POST') {
    log('Method not allowed:', req.method)
    return res.status(405).send('Method not allowed')
  }

  try {
    const raw = await readRawBody(req)
    const { CF_SECRET_KEY } = process.env
    const sig = req.headers['x-webhook-signature'] || ''
    const ts = req.headers['x-webhook-timestamp'] || ''

    // Log raw payload details
    const buf = Buffer.from(raw, 'utf8')
    log('Raw payload hex:', buf.toString('hex'))
    log('Raw payload utf8 preview:', raw.substring(0, 200))
    log('Headers', { ts, sig })

    if (!CF_SECRET_KEY) {
      err('Missing CF_SECRET_KEY')
      return res.status(500).send('Server misconfigured')
    }
    if (!sig) {
      err('Missing signature header')
      return res.status(400).send('Missing signature')
    }

    // Try three HMAC methods
    const methods = {
      'ts+body': ts + raw,
      'body+ts': raw + ts,
      'body': raw
    }

    const computed = {}
    const matches = {}
    for (const [name, payload] of Object.entries(methods)) {
      computed[name] = crypto
        .createHmac('sha256', CF_SECRET_KEY)
        .update(payload)
        .digest('base64')
      matches[name] = computed[name] === sig
    }

    log('Attempted signatures', { computed, matches, receivedSig: sig })

    // If none matched, reject
    if (!Object.values(matches).some(Boolean)) {
      err('All signature methods failed')
      return res.status(400).send('Invalid signature')
    }

    // Acknowledge success
    res.status(200).send('OK')

    // Asynchronously process event
    try {
      const event = JSON.parse(raw)
      const orderId = event?.data?.order?.order_id
      const status =
        event?.data?.payment?.payment_status ||
        event?.data?.order?.order_status ||
        'UNKNOWN'
      log('Processed event', { orderId, status })
      // TODO: update your database order record by orderId
    } catch (e) {
      err('Post-ack processing error', e.message)
    }
  } catch (e) {
    err('Handler error', e.message)
    return res.status(500).send('Server error')
  }
}
