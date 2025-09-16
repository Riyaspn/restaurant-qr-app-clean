import { supabase } from '../../../services/supabase';
import { getRazorpayClient } from '../../../services/byoPg';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { restaurant_id, amount, metadata } = req.body;

    if (!restaurant_id || !amount) {
      return res.status(400).json({ error: 'Missing restaurant_id or amount' });
    }

    // Fetch Razorpay keys for this restaurant
    const { data: restaurant, error } = await supabase
      .from('restaurant_profiles')
      .select('razorpay_key_id, razorpay_key_secret')
      .eq('restaurant_id', restaurant_id)
      .single();

    if (error || !restaurant || !restaurant.razorpay_key_id || !restaurant.razorpay_key_secret) {
      return res.status(400).json({ error: 'Payment gateway not configured for this restaurant' });
    }

    // Get Razorpay client using fetched keys
    const razorpay = getRazorpayClient(restaurant.razorpay_key_id, restaurant.razorpay_key_secret);

    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
      notes: metadata || {},
    });

    return res.status(200).json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Order creation failed' });
  }
}
