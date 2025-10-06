// pages/api/push/test-send.js
import admin from 'firebase-admin';

function normalizePrivateKey(raw) {
  if (!raw) return '';
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
  key = key.replace(/\r\n/g, '\n');
  return key.endsWith('\n') ? key : key + '\n';
}

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!projectId || !clientEmail || !privateKey) throw new Error('Missing Firebase Admin envs');
  admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, title, body, url, data } = req.body || {};
    if (!token) return res.status(400).json({ error: 'Missing token' });

    const message = {
      token,
      notification: {
        title: title || '🔔 Test order',
        body: body || 'Background/killed banner test',
      },
      data: {
        type: 'new_order',
        url: url || '/owner/orders',
        ...(data || {}),
      },
      android: {
        priority: 'high',
        notification: { channelId: 'orders_v2', sound: 'beep', priority: 'high' },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    };

    const resp = await admin.messaging().send(message, false);
    return res.status(200).json({ ok: true, messageId: resp });
  } catch (err) {
    console.error('[push:test-send] error', { name: err?.name, code: err?.code, message: err?.message });
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
