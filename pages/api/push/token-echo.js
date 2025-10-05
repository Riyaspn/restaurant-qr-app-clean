// pages/api/push/token-echo.js
// Returns whatever token the client believes is current (from localStorage fetch)
export default async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const { deviceToken } = req.body || {};
      if (!deviceToken) return res.status(400).json({ ok: false, error: 'no_token' });
      // Return it so callers (server or client) can chain it
      return res.status(200).json({ ok: true, deviceToken });
    }
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'error' });
  }
}
