// pages/api/route/create-account.js
import fetch from 'node-fetch'

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
    owner_id,
  } = req.body;

  if (!account_holder_name || !account_number || !ifsc) {
    return res.status(400).json({ error: 'Missing required bank details.' });
  }

  try {
    const payload = {
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

    const username = process.env.RAZORPAY_KEY_ID;
    const password = process.env.RAZORPAY_KEY_SECRET;
    const basicAuth = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/payments/route/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': basicAuth,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Razorpay Route API error:', errorBody);
      return res.status(response.status).json({ error: errorBody });
    }

    const data = await response.json();
    return res.status(201).json({ account_id: data.id, account: data });
  } catch (error) {
    console.error('Failed to create Razorpay Route account:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
