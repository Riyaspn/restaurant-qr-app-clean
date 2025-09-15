const safeTrim = (val) => (typeof val === 'string' ? val.trim() : '')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    owner_id,
    email,
    phone,
    business_name,
    business_type,
    legal_name,
    profile,
    legal_info,
    beneficiary_name,
    account_number,
    ifsc,
  } = req.body

  if (
    !owner_id ||
    !email ||
    !phone ||
    !business_name ||
    !business_type ||
    !profile ||
    !legal_info ||
    !beneficiary_name ||
    !account_number ||
    !ifsc ||
    !legal_name
  ) {
    return res.status(400).json({ error: 'Missing required fields for creating Linked Account.' })
  }

  if (safeTrim(beneficiary_name) !== safeTrim(legal_name)) {
    return res.status(400).json({
      error: "'Beneficiary Name' must match 'Legal Name' (Business Name)."
    })
  }

  const payload = {
    email: safeTrim(email),
    phone: safeTrim(phone),
    legal_business_name: safeTrim(legal_name),
    customer_facing_business_name: safeTrim(legal_name),
    business_type: safeTrim(business_type).toLowerCase(),
    profile,
    legal_info,
    beneficiary_name: safeTrim(beneficiary_name),
    account_number: safeTrim(account_number),
    ifsc: safeTrim(ifsc).toUpperCase(),
    active: true,
    reference_id: owner_id.toString(),
  }

  try {
    const auth = 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')

    const response = await fetch('https://api.razorpay.com/v2/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(payload),
    })

    const text = await response.text()

    if (!response.ok) {
      return res.status(response.status).json({ error: JSON.parse(text) })
    }

    const data = JSON.parse(text)
    return res.status(201).json({ account_id: data.id, account: data })
  } catch (e) {
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
