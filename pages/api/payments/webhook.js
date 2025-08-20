// pages/api/payments/webhook.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // TODO: Verify Cashfree signature and update payment status if using server confirmation
  res.status(200).json({ ok: true })
}
