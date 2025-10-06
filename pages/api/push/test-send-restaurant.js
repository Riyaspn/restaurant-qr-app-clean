// pages/api/push/test-send-restaurant.js
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

function normalizePrivateKey(raw) {
  if (!raw) return '';
  let key = raw.trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) key = key.slice(1, -1);
  key = key.replace(/\r\n/g, '\n');
  return key.endsWith('\n') ? key : key + '\n';
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

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
    const { restaurantId, title = 'Test: All tokens', body = 'Expect tray banner + sound', url = '/owner/orders' } = req.body || {};
    if (!restaurantId) return res.status(400).json({ error: 'restaurantId required' });

    const { data: rows, error } = await supabase
      .from('push_subscription_restaurants')
      .select('device_token')
      .eq('restaurant_id', restaurantId);

    if (error) return res.status(500).json({ error: error.message });

    const tokens = (rows || []).map(r => r.device_token).filter(Boolean);
    if (!tokens.length) return res.status(200).json({ sent: 0, successCount: 0, failureCount: 0, errors: [], prefixes: [] });

    const message = {
      notification: { title, body },
      data: { url, kind: 'test-restaurant' },
      android: {
        notification: { channelId: 'orders_v2', sound: 'beep', priority: 'high' },
        priority: 'high',
      },
      tokens,
    };

    const resp = await admin.messaging().sendEachForMulticast(message);
    const errors = resp.responses.map((r) => (r.success ? null : r.error?.message)).filter(Boolean).slice(0, 5);

    return res.status(200).json({
      sent: tokens.length,
      successCount: resp.successCount,
      failureCount: resp.failureCount,
      errors,
      prefixes: tokens.map(t => t.slice(0, 24)),
    });
  } catch (e) {
    console.error('[push:test-send-restaurant] error', { name: e?.name, code: e?.code, message: e?.message });
    return res.status(500).json({ error: e?.message || 'Internal server error' });
  }
}
