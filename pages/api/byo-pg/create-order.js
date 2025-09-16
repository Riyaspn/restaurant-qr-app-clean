import { getRazorpayClient } from '../../../services/byoPg';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    console.log('create-order called with body:', req.body);

    const { restaurant_id, amount, metadata } = req.body;

    if (!restaurant_id || !amount) {
      console.log('Missing restaurant_id or amount in request body');
      return res.status(400).json({ error: 'Missing restaurant_id or amount' });
    }

    // Use getRazorpayClient which fetches keys internally
    const razorpay = await getRazorpayClient(restaurant_id);

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
      notes: metadata || {},
    });

    console.log('Created Razorpay order:', order);

    return res.status(200).json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error('create-order error:', err);
    return res.status(500).json({ error: err.message || 'Order creation failed' });
  }
}
