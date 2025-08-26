// pages/api/payments/webhook.js
import crypto from 'crypto'

export const config = {
  api: { bodyParser: false }
}

function rid() {
  return 'wh_' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36)
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
  const reqId = rid()
  const log = (...a) => console.log(`[webhook][${reqId}]`, ...a)
  const err = (...a) => console.error(`[webhook][${reqId}]`, ...a)

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed')
  }

  try {
    const raw = await readRawBody(req)
    const secret = process.env.CF_SECRET_KEY || ''
    const sig = req.headers['x-webhook-signature'] || ''
    const ts = req.headers['x-webhook-timestamp'] || ''

    log('Headers present', {
      hasSig: !!sig,
      hasTs: !!ts,
      secretLen: secret.length,
      rawLen: raw.length
    })

    if (!secret) {
      err('Missing CF_SECRET_KEY')
      return res.status(500).send('Server misconfigured')
    }
    if (!sig) {
      err('Missing signature header')
      return res.status(400).send('Missing signature')
    }

    // Per Cashfree docs: timestamp + rawBody
    const signedPayload = ts + raw
    const computed = crypto.createHmac('sha256', secret).update(signedPayload).digest('base64')
    const match = crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sig))

    log('Signature compare', { match, computedLen: computed.length, receivedLen: sig.length })

    if (!match) {
      err('Signature mismatch')
      return res.status(400).send('Invalid signature')
    }

    // Success - acknowledge quickly
    res.status(200).send('OK')

    // Process async
    try {
      const event = JSON.parse(raw)
      const orderId = event?.data?.order?.order_id
      const status = event?.data?.payment?.payment_status || event?.data?.order?.order_status
      log('Processed', { orderId, status })
      // TODO: Update database
    } catch (e) {
      err('Post-ack error', e?.message)
    }
  } catch (e) {
    err('Handler error', e?.message)
    return res.status(500).send('Server error')
  }
}
