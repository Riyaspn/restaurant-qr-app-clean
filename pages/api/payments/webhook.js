// pages/api/payments/webhook.js
import crypto from 'crypto'

export const config = {
  api: { bodyParser: false } // critical: use raw body for HMAC
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  try {
    const raw = await readRawBody(req)

    // Cashfree sends signature in one of these headers
    const signature =
      req.headers['x-webhook-signature'] ||
      req.headers['x-cf-signature'] ||
      ''

    if (!signature) {
      console.error('Webhook: missing signature header')
      return res.status(400).send('Missing signature')
    }

    const secret = process.env.CF_SECRET_KEY || ''
    if (!secret) {
      console.error('Webhook: missing CF_SECRET_KEY env')
      return res.status(500).send('Server misconfigured')
    }

    // Compute Base64(HMAC_SHA256(rawBody, secret))
    const computed = crypto.createHmac('sha256', secret).update(raw).digest('base64')

    if (computed !== signature) {
      console.error('Signature mismatch')
      // You can log both hashes for debugging, but never return them to the client
      return res.status(400).send('Invalid signature')
    }

    // ACK quickly
    res.status(200).send('OK')

    // Process event asynchronously (non-blocking)
    try {
      const event = JSON.parse(raw)
      const orderId = event?.data?.order?.order_id
      const status =
        event?.data?.payment?.payment_status ||
        event?.data?.order?.order_status ||
        'UNKNOWN'

      // TODO: upsert/update your order record by orderId with status
      console.log('Webhook processed:', orderId, status)
    } catch (e) {
      console.error('Post-ack processing error:', e)
    }
  } catch (e) {
    console.error('Webhook handler error:', e)
    return res.status(500).send('Server error')
  }
}
