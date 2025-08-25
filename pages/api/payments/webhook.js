// pages/api/payments/webhook.js
import crypto from 'crypto'

export const config = {
  api: { bodyParser: false } // IMPORTANT: use raw body for signature
}

async function readRawBody(req) {
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

    // Cashfree sends signature header; support both possible keys
    const sig =
      req.headers['x-webhook-signature'] ||
      req.headers['x-cf-signature'] ||
      ''

    if (!sig) {
      console.error('Missing signature header')
      return res.status(400).send('Missing signature')
    }

    // Compute HMAC over raw body using your Sandbox secret
    const expected = crypto
      .createHmac('sha256', process.env.CF_SECRET_KEY || '')
      .update(raw)
      .digest('base64')

    if (expected !== sig) {
      console.error('Signature mismatch')
      return res.status(400).send('Invalid signature')
    }

    // Signature ok — acknowledge quickly
    res.status(200).send('OK')

    // Process event asynchronously (don’t block 200)
    try {
      const event = JSON.parse(raw)
      const orderId = event?.data?.order?.order_id
      const status =
        event?.data?.payment?.payment_status ||
        event?.data?.order?.order_status ||
        'UNKNOWN'

      // TODO: upsert/update your order by orderId with status
      // await db.orders.update({ orderId }, { status })
      console.log('Webhook processed:', orderId, status)
    } catch (e) {
      console.error('Post-ack processing error:', e)
    }
  } catch (e) {
    console.error('Webhook error:', e)
    return res.status(500).send('Server error')
  }
}
