// pages/api/payments/webhook.js

import crypto from 'crypto';

export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const raw = await readRawBody(req);
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!signature) {
    console.error('Webhook signature missing');
    return res.status(400).send('Signature missing');
  }

  // Compute HMAC
  const expected = crypto
    .createHmac('sha256', secret)
    .update(raw)
    .digest('hex');

  if (expected !== signature) {
    console.error('Invalid webhook signature');
    return res.status(400).send('Invalid signature');
  }

  // Acknowledge immediately
  res.status(200).send('OK');

  // Then process asynchronously
  try {
    const event = JSON.parse(raw);

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      console.log('✅ Payment captured for order', orderId);
      // TODO: update your database: mark orderId as paid
    } else {
      console.log('📥 Received webhook event:', event.event);
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }
}
