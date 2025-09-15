import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    owner_id,
    email,
    phone,
    business_name,
    display_name,
    business_type,
    beneficiary_name,
    account_number,
    ifsc,
    profile,
    legal_info,
  } = req.body;

  if (!owner_id || !email || !phone || !business_name || !business_type || !profile || !legal_info) {
    return res.status(400).json({ error: 'Missing required fields for linked account.' });
  }

  const payload = {
    email: email.trim(),
    phone: phone.trim(),
    legal_business_name: business_name.trim(),
    customer_facing_business_name: display_name?.trim() || business_name.trim(),
    business_type: business_type.trim().toLowerCase(),
    reference_id: owner_id.toString(),
    beneficiary_name: beneficiary_name,
    account_number: account_number,
    ifsc: ifsc.toUpperCase(),
    profile,
    legal_info,
    active: true
  };

  console.log('Creating Razorpay Route Account with payload:', payload);

  try {
    const auth = 'Basic ' + Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const response = await fetch('https://api.razorpay.com/v2/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: auth },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error('Razorpay Route KYC account creation error:', text);
      return res.status(response.status).json({ error: JSON.parse(text) });
    }

    const data = JSON.parse(text);
    return res.status(201).json({ account_id: data.id, account: data });
  } catch (err) {
    console.error('Failed to create Razorpay Route account:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
