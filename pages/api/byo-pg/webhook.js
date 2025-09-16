import crypto from 'crypto';
import { supabase } from '../../../services/supabase';

export const config = { api: { bodyParser: false } };

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  try {
    const body = await readBody(req);
    const sig = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_BYO_WEBHOOK_SECRET;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (sig !== expected) {
      res.status(400).end('Invalid signature');
      return;
    }

    const { event, payload } = JSON.parse(body);

    if (event === 'payment.captured') {
      const { order_id, id: paymentId, amount } = payload.payment.entity;

      await supabase
        .from('orders')
        .update({ payment_status: 'completed', payment_details: { paymentId, amount } })
        .eq('razorpay_order_id', order_id);

      res.status(200).send('OK');
      return;
    }

    res.status(200).send('Ignored');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
}
