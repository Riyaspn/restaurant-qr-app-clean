// pages/api/push/test-send.js
import admin from 'firebase-admin';

function normalizePrivateKey(raw) {
  if (!raw) return '';
  let key = raw.trim();

  // Remove surrounding quotes if present
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // If the key contains literal "\n", convert them to real newlines
  if (key.includes('\\n')) {
    key = key.replace(/\\n/g, '\n');
  }

  // If the key is all on one line without BEGIN/END line breaks, try to insert them
  const hasBegin = key.includes('-----BEGIN PRIVATE KEY-----');
  const hasEnd = key.includes('-----END PRIVATE KEY-----');
  if (hasBegin && hasEnd && !key.includes('\n') && key.includes('\\n') === false) {
    // Nothing to do; but most one-line keys should have \n sequences; leave as is
  }

  // Ensure it ends with a newline after footer (firebase-admin tolerates without, but we normalize)
  if (hasEnd && !key.endsWith('\n')) key = key + '\n';

  // Normalize CRLF -> LF
  key = key.replace(/\r\n/g, '\n');

  return key;
}

// Initialize Admin once
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = normalizePrivateKey(privateKeyRaw);

  // Safe visibility
  console.log('[push:init]', {
    hasProjectId: !!projectId,
    hasClientEmail: !!clientEmail,
    rawHasSlashN: typeof privateKeyRaw === 'string' && privateKeyRaw.includes('\\n'),
    rawHasRealNL: typeof privateKeyRaw === 'string' && privateKeyRaw.includes('\n'),
    finalHasRealNL: privateKey.includes('\n'),
    begins: privateKey.startsWith('-----BEGIN PRIVATE KEY-----'),
    ends: privateKey.trimEnd().endsWith('-----END PRIVATE KEY-----')
  });

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin envs (projectId/clientEmail/privateKey)');
  }

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
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
        ...(data || {})
      },
      android: {
        priority: 'high',
        notification: { channelId: 'orders_v3', sound: 'beep', priority: 'high' }
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: { aps: { sound: 'default', badge: 1 } }
      }
    };

    const resp = await admin.messaging().send(message, false);
    return res.status(200).json({ ok: true, messageId: resp });
  } catch (err) {
    console.error('[push:test-send] error', { name: err?.name, code: err?.code, message: err?.message });
    return res.status(500).json({ ok: false, error: err?.message || 'Unknown error' });
  }
}
