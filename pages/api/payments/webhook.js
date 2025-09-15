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
  if (restErr || !rest?.route_account_id) return null;

  return rest.route_account_id;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).send('Method not allowed');
  }

  try {
    const raw = await readRawBody(req);
    const signature = req.headers['x-razorpay-signature'];
    
    if (!signature) {
      console.log('Missing signature header');
      return res.status(400).send('Signature missing');
    }

    // Validate webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(raw)
      .digest('hex');

    if (expectedSignature !== signature) {
      console.log('Invalid signature - Expected:', expectedSignature, 'Received:', signature);
      return res.status(400).send('Invalid signature');
    }

    // Always respond 200 first to acknowledge receipt
    res.status(200).send('OK');

    // Process the webhook payload
    const { event, payload } = JSON.parse(raw);
    console.log('Received webhook event:', event);

    // Handle different event types
    switch (event) {
      case 'payment.captured':
        const payment = payload.payment.entity;
        const orderId = payment.order_id;
        console.log('Payment captured:', payment.id, 'for order', orderId);

        const routeAccount = await getRouteAccount(orderId);
        if (!routeAccount) {
          console.warn('No Route account for order', orderId);
          return;
        }

        try {
          const transferPayload = {
            account: routeAccount,
            amount: payment.amount,
            currency: payment.currency,
            source: payment.id,
            on_hold: false,
          };

          const transfer = await razorpay.transfers.create(transferPayload);
          console.log('Transfer created:', transfer.id);
        } catch (transferError) {
          console.error('Transfer creation failed:', transferError);
        }
        break;

      case 'payment.downtime.started':
      case 'payment.downtime.resolved':
        // Just log these informational events
        console.log('Payment downtime event:', event, payload);
        break;

      default:
        console.log('Unhandled event type:', event);
    }

  } catch (err) {
    console.error('Webhook handler error:', err);
    // Still return 200 to prevent Razorpay from retrying
    res.status(200).send('Error logged');
  }
}
