// pages/api/push/ensure.js
// Server: asks client for its current token via token-echo payload and upserts.
import subscribeHandler from './subscribe';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  try {
    const { restaurantId, platform, deviceToken } = req.body || {};
    const rid = restaurantId;
    if (!rid) return res.status(400).json({ ok: false, error: 'no_restaurant' });

    // If caller already sent a token, use it; otherwise, fail fast (client will retry).
    const token = deviceToken;
    if (!token) return res.status(400).json({ ok: false, error: 'no_token' });

    // Reuse existing subscribe handler to upsert
    req.method = 'POST';
    req.body = { restaurantId: rid, platform: platform || 'android', deviceToken: token };
    return subscribeHandler(req, res);
  } catch (e) {
    console.error('[ensure] error', e?.message || e);
    return res.status(500).json({ ok: false, error: 'ensure_failed' });
  }
}
