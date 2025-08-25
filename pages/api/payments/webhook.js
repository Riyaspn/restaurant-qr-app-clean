// pages/api/payments/webhook.js
import crypto from 'crypto'

export const config = {
  api: {
    bodyParser: false // read raw body for signature verification
  }
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => (data += chunk))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  try {
    const raw = await readRawBody(req)
    const signature = req.headers['x-webhook-signature'] || req.headers['x-cf-signature']
    if (!signature) return res.status(400).send('Missing signature')

    const computed = crypto
      .createHmac('sha256', process.env.CF_SECRET_KEY)
      .update(raw)
      .digest('base64')

    if (computed !== signature) {
      return res.status(400).send('Invalid signature')
    }

    const event = JSON.parse(raw)
    // Sample: event.type, event.data.order.order_id, event.data.payment.payment_status
    const orderId = event?.data?.order?.order_id
    const status =
      event?.data?.payment?.payment_status ||
      event?.data?.order?.order_status ||
      'UNKNOWN'

    // Update DB idempotently (pseudo)
    // await db.orders.update({ orderId }, { status })

    res.status(200).send('OK')
  } catch (e) {
    console.error('webhook error', e)
    res.status(500).send('Server error')
  }
}
