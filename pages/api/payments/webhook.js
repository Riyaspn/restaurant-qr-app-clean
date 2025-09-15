import crypto from 'crypto';
import Razorpay from 'razorpay';
import { supabase } from '../../../services/supabase';

export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function getRouteAccount(orderId) {
  const { data: ord } = await supabase
    .from('orders')
    .select('restaurant_id')
    .eq('id', orderId)
    .single();
  if (!ord) return null;

  const { data: rest } = await supabase
    .from('restaurants')
    .select('route_account_id')
    .eq('id', ord.restaurant_id)
    .single();
  return rest?.route_account_id || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }
  const raw = await readRawBody(req);
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).send('Signature missing');
  }

  // Use the payment webhook secret
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(raw)
    .digest('hex');
  if (expected !== signature) {
    console.log('Invalid signature:', signature);
    return res.status(400).send('Invalid signature');
  }

  // Acknowledge receipt
  res.status(200).send('OK');

  const { event, payload } = JSON.parse(raw);
  if (event === 'payment.captured') {
    const { id: payId, order_id, amount, currency } = payload.payment.entity;
    const routeAccount = await getRouteAccount(order_id);
    if (!routeAccount) {
      console.warn('No Route account for order', order_id);
      return;
    }
    try {
      const transfer = await razorpay.transfers.create({
        account: routeAccount,
        amount,
        currency,
        source: payId,
        on_hold: false,
      });
      console.log('Transfer created:', transfer.id);
    } catch (e) {
      console.error('Transfer creation failed:', e);
    }
  } else {
    console.log('Unhandled event:', event);
  }
}
