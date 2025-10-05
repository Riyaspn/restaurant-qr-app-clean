// pages/api/push/subscribe-bridge.js
// Tiny bridge to avoid client-side routing races in dev and ensure upsert.
import subscribeHandler from './subscribe';

export default async function handler(req, res) {
  // Accept only POST, mirror the same body the client sends
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }
  try {
    // Delegate to the existing handler to do the Supabase upsert
    return subscribeHandler(req, res);
  } catch (e) {
    console.error('[subscribe-bridge] error', e?.message || e);
    return res.status(500).json({ ok: false, error: 'bridge_failed' });
  }
}
