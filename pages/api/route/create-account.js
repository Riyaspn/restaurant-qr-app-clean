import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const {
    business_name,
    business_type,
    beneficiary_name,
    account_number,
    ifsc,
    email,
    phone,
    owner_id
  } = req.body;

  if (!business_name || !business_type || !beneficiary_name || !account_number || !ifsc) {
    return res.status(400).json({ error: 'Missing required fields for KYC linked account.' });
  }

  const payload = {
    business_name: business_name.trim(),
    business_type: business_type.trim(),
    beneficiary_name: beneficiary_name.trim(),
    account_number: account_number.trim(),
    ifsc: ifsc.trim().toUpperCase(),
    email: email?.trim() || '',
    contact: phone?.trim() || '',
    reference_id: owner_id.toString(),
    active: true,
  };

  console.log('Creating Razorpay Route Account with payload:', payload);

  try {
    const auth = 'Basic ' + Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');
    const response = await fetch('https://api.razorpay.com/v2/route/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(payload),
    });
    const body = await response.text();
    if (!response.ok) {
      console.error('Razorpay Route KYC account creation error:', body);
      return res.status(response.status).json({ error: body });
    }
    const data = JSON.parse(body);
    return res.status(201).json({ account_id: data.id, account: data });
  } catch (err) {
    console.error('Failed to create Razorpay Route account:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
