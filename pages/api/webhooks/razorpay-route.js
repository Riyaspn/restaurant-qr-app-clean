import crypto from 'crypto';
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const raw = await readRawBody(req);
  const signature = req.headers['x-razorpay-signature'];
  const webhookSecret = process.env.RAZORPAY_ROUTE_WEBHOOK_SECRET;

  if (!signature) return res.status(400).send('Signature missing');

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(raw)
    .digest('hex');

  if (expectedSignature !== signature) return res.status(400).send('Invalid signature');

  const event = JSON.parse(raw);

  // Log all incoming events for audit or debugging
  console.log('Razorpay Route Webhook Event:', event.event);

  try {
    switch (event.event) {
      case 'product.route.under_review':
      case 'product.route.needs_clarification':
      case 'product.route.activated': {
        const accountId = event.payload.merchant_product.entity.id;
        const activationStatus = event.payload.merchant_product.entity.activation_status;

        // Update activation status in your DB
        const { error } = await supabase
          .from('restaurants')
          .update({
            route_account_activation_status: activationStatus
          })
          .eq('route_account_id', accountId);

        if (error) {
          console.error('Failed to update route account status:', error.message);
          // Optionally send alert email here
        } else {
          console.log(`Route account ${accountId} status updated to ${activationStatus}`);
        }
        break;
      }
      case 'transfer.processed': {
        const transfer = event.payload.transfer.entity;
        // Update your DB or notify owner of successful transfer
        console.log(`Transfer processed: ID ${transfer.id}, Amount ${transfer.amount}`);
        break;
      }
      case 'transfer.failed': {
        const transfer = event.payload.transfer.entity;
        console.error(`Transfer failed: ID ${transfer.id}, Reason: ${transfer.error.description || 'Unknown'}`);

        // Optionally alert admin or owner by email/notification

        break;
      }
      default:
        console.log(`Unhandled event: ${event.event}`);
    }
    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).send('Internal Server Error');
  }
}
