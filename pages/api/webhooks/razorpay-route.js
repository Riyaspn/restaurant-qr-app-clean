import crypto from 'crypto';
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
  const secret = process.env.RAZORPAY_ROUTE_WEBHOOK_SECRET;
  const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  if (expected !== signature) {
    return res.status(400).send('Invalid signature');
  }

  res.status(200).send('OK');
  const { event, payload } = JSON.parse(raw);

  switch (event) {
    case 'product.route.under_review':
    case 'product.route.needs_clarification':
    case 'product.route.activated': {
      const acct = payload.merchant_product.entity;
      const status = acct.activation_status;
      const { error } = await supabase
        .from('restaurants')
        .update({ route_account_activation_status: status })
        .eq('route_account_id', acct.id);
      if (error) console.error('Route update error:', error);
      else console.log(`Account ${acct.id} status: ${status}`);
      break;
    }
    case 'transfer.processed':
      console.log('Transfer succeeded:', payload.transfer.entity.id);
      break;
    case 'transfer.failed':
      console.error('Transfer failed:', payload.transfer.entity.error);
      break;
    default:
      console.log('Unhandled Route event:', event);
  }
}
