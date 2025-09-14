// pages/api/route/create-account.js

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
    account_holder_name,
    account_number,
    ifsc,
    email,
    phone,
    owner_id, // your internal owner ID or user id
  } = req.body;

  if (!account_holder_name || !account_number || !ifsc) {
    return res.status(400).json({ error: 'Missing required bank details.' });
  }

  try {
    const accountPayload = {
      name: account_holder_name,
      email: email || '',
      type: 'bank_account',
      description: 'Restaurant Owner Account',
      reference_id: owner_id?.toString() || '',
      active: true,
      contact: phone || '',
      bank_account: {
        name: account_holder_name,
        ifsc,
        account_number,
      },
    };

    const account = await razorpay.route.accounts.create(accountPayload);

    return res.status(201).json({ account_id: account.id, account });
  } catch (error) {
    console.error('Failed to create Razorpay Route account:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
