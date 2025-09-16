import { getRazorpayClient } from '../../../services/byoPg';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { restaurant_id, amount, metadata } = req.body;
  if (!restaurant_id || !amount) {
    return res.status(400).json({ error: 'Missing restaurant_id or amount' });
  }

  try {
    const razorpay = await getRazorpayClient(restaurant_id);
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
      notes: metadata || {},
    });
    res.status(200).json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Order creation failed' });
  }
}
