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
  // 1. Fetch restaurant_id for this order
  const { data: ord, error: ordErr } = await supabase
    .from('orders')
    .select('restaurant_id')
    .eq('id', orderId)
    .single();
  if (ordErr || !ord) return null;

  // 2. Fetch route_account_id for that restaurant
  const { data: rest, error: restErr } = await supabase
    .from('restaurants')
    .select('route_account_id')
    .eq('id', ord.restaurant_id)
    .single();
  if (restErr || !rest.route_account_id) return null;
  return rest.route_account_id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const raw = await readRawBody(req);
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) return res.status(400).send('Signature missing');
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(raw)
    .digest('hex');
  if (expected !== signature) return res.status(400).send('Invalid signature');

  res.status(200).send('OK'); // Acknowledge

  try {
    const { event, payload } = JSON.parse(raw);
    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      console.log('Payment captured:', payment.id, 'for order', orderId);

      const routeAccount = await getRouteAccount(orderId);
      if (!routeAccount) {
        console.warn('No Route account for order', orderId);
        return;
      }

      // Create transfer to linked account
      const transfer = await razorpay.transfers.create({
        account: routeAccount,
        amount: payment.amount,
        currency: payment.currency,
        source: payment.id,
        on_hold: false,
      });
      console.log('Transfer created:', transfer.id);
      // Optionally record transfer in your DB here
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }
}
