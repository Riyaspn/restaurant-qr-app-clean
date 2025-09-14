import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { account_holder_name, account_number, ifsc, email, phone, owner_id } = req.body;
  
  if (!account_holder_name || !account_number || !ifsc) {
    return res.status(400).json({ error: 'Missing required bank details.' });
  }
  
  const formattedIfsc = ifsc.trim().toUpperCase();
  
  // Use the correct Route Bank Account API payload format
  const payload = {
    name: account_holder_name.trim(),
    email: email?.trim() || '',
    type: 'bank_account',
    description: 'Restaurant Owner Account',
    reference_id: owner_id.toString(),
    active: true,
    contact: phone?.trim() || '',
    bank_account: {
      name: account_holder_name.trim(),
      ifsc: formattedIfsc,
      account_number: account_number.trim(),
    },
  };
  
  console.log('Payload sent to Razorpay Route API:', JSON.stringify(payload, null, 2));
  
  try {
    const auth = 'Basic ' + Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');
    
    // Use the correct Route Bank Account endpoint
    const response = await fetch(
      'https://api.razorpay.com/v1/payments/route/accounts',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: auth,
        },
        body: JSON.stringify(payload),
      }
    );
    
    if (!response.ok) {
      const body = await response.text();
      console.error('Razorpay Route API error response:', body);
      return res.status(response.status).json({ error: body });
    }
    
    const data = await response.json();
    return res.status(201).json({ account_id: data.id, account: data });
  } catch (err) {
    console.error('Failed to create Razorpay Route account:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
