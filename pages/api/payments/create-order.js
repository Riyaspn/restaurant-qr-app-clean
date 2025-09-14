// pages/api/payments/create-order.js

import Razorpay from 'razorpay';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    amount,
    currency = 'INR',
    customer_name,
    customer_email,
    customer_phone,
    metadata,
  } = req.body;

  if (!amount || !customer_name || !customer_email || !customer_phone) {
    return res.status(400).json({
      error:
        'Missing required fields: amount, customer_name, customer_email, customer_phone',
    });
  }

  try {
    // Razorpay expects amount in paise
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: `rcpt_${Date.now()}`,
      payment_capture: 1,
      notes: {
        customer_name,
        customer_email,
        customer_phone,
        ...(metadata || {}),
      },
    });

    return res.status(200).json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (err) {
    console.error('Razorpay order creation failed:', err);
    return res
      .status(500)
      .json({ error: 'Failed to create Razorpay order' });
  }
}
