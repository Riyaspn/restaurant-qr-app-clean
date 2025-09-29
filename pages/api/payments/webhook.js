import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getSupabase } from '../../../services/supabase';

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

async function getRouteAccount(supabase, orderId) {
  const { data: ord, error: ordErr } = await supabase
    .from('orders')
    .select('restaurant_id')
    .eq('id', orderId)
    .single();
  if (ordErr || !ord) return null;

  const { data: rest, error: restErr } = await supabase
    .from('restaurants')
    .select('route_account_id')
    .eq('id', ord.restaurant_id)
    .single();
  if (restErr || !rest) return null;

  return rest.route_account_id;
}

export default async function handler(req, res) {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase client not initialized');
    return res.status(500).send('Internal Server Error');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const raw = await readRawBody(req);
  const signature = req.headers['x-razorpay-signature'];
  if (!signature) {
    return res.status(400).send('Signature missing');
  }

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const expected = crypto
    .createHmac('sha256', webhookSecret)
    .update(raw)
    .digest('hex');
  if (expected !== signature) {
    console.log('Invalid signature:', signature);
    return res.status(400).send('Invalid signature');
  }

  res.status(200).send('OK'); // Acknowledge immediately

  const { event, payload } = JSON.parse(raw);
  if (event === 'payment.captured') {
    const { id: payId, order_id, amount, currency } = payload.payment.entity;
    const routeAccount = await getRouteAccount(supabase, order_id);
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
  } else if (
    event === 'payment.downtime.started' ||
    event === 'payment.downtime.resolved'
  ) {
    console.log(`Payment downtime event received: ${event}`);
  } else {
    console.log('Unhandled event:', event);
  }
}
