// pages/api/notify-owner.js

import admin from 'firebase-admin'
import { createClient } from '@supabase/supabase-js'

/**
 * Initialize Firebase Admin once per runtime
 * - Requires env: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * - PRIVATE KEY must include full PEM with BEGIN/END and escaped newlines in Vercel ("\\n")
 */
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    // Fail fast with a helpful message
    throw new Error('Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY')
  }

  // Convert escaped newlines to real newlines
  privateKey = privateKey.replace(/\\n/g, '\n')

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  })
}

/**
 * Supabase service client
 * - Uses service role for server-side reads
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { restaurantId, orderId, orderItems } = req.body || {}

    // Basic validation
    if (!restaurantId || !orderId) {
      return res.status(400).json({ error: 'Missing restaurantId or orderId' })
    }

    // Fetch device tokens for the restaurant
    const { data: rows, error: fetchErr } = await supabase
      .from('push_subscription_restaurants')
      .select('device_token')
      .eq('restaurant_id', restaurantId)

    if (fetchErr) {
      console.error('Fetch tokens error:', fetchErr)
      return res.status(500).json({ error: 'Failed to fetch push subscriptions' })
    }

    const tokens = (rows || [])
      .map(r => r?.device_token)
      .filter(Boolean)

    if (!tokens.length) {
      return res.status(200).json({ message: 'No subscriptions', successCount: 0, failureCount: 0 })
    }

    // Build notification body
    const itemCount = Array.isArray(orderItems) ? orderItems.length : 0
    const body = `Order #${String(orderId).slice(0, 8)} placed${itemCount ? ` • ${itemCount} items` : ''}`

    // Admin SDK supports a top-level "notification" and platform-specific overrides
    // Web Push payload is included for rich options; data is used by SW click navigation
    const message = {
      tokens,
      notification: {
        title: '🔔 New Order!',
        body
      },
      data: {
        url: `/owner/orders?highlight=${orderId}`,
        orderId: String(orderId),
        restaurantId: String(restaurantId)
      },
      webpush: {
        notification: {
          requireInteraction: true,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'new-order'
        },
        fcmOptions: {
          // Optionally set a link that opens when notification is clicked if SW isn’t handling clicks
          link: `/owner/orders?highlight=${orderId}`
        }
      }
    }

    const response = await admin.messaging().sendMulticast(message)

    // Optional: prune invalid tokens
    const invalidTokens = []
    response.responses.forEach((r, idx) => {
      if (!r.success) {
        const code = r.error?.code || ''
        // Typical codes to prune: registration-token-not-registered, invalid-argument
        if (code.includes('registration-token-not-registered') || code.includes('invalid-argument')) {
          invalidTokens.push(tokens[idx])
        }
      }
    })
    if (invalidTokens.length) {
      await supabase
        .from('push_subscription_restaurants')
        .delete()
        .in('device_token', invalidTokens)
        .eq('restaurant_id', restaurantId)
        .catch(() => {}) // best effort
    }

    return res.status(200).json({
      successCount: response.successCount,
      failureCount: response.failureCount,
      pruned: invalidTokens.length
    })
  } catch (err) {
    console.error('notify-owner error:', err)
    return res.status(500).json({ error: err?.message || 'Internal error' })
  }
}
