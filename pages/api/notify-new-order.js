import notifyOwner from './notify-owner';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    // Delegate to robust handler
    await notifyOwner(req, res);
  } catch (e) {
    console.error('notify-new-order error:', e);
    res.status(500).send({ error: 'Notification dispatch failed' });
  }
}
