// pages/api/notify-owner.js
import admin from 'firebase-admin'
import { getMessaging } from 'firebase-admin/messaging'  // ← NEW: Modern messaging import
import { createClient } from '@supabase/supabase-js'

// Initialize Firebase Admin once
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY
  
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Missing Firebase Admin credentials')
  }
  
  privateKey = privateKey.replace(/\\n/g, '\n')
  
  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey })
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const { restaurantId, orderId, orderItems } = req.body || {}
    
    if (!restaurantId || !orderId) {
      return res.status(400).json({ error: 'Missing restaurantId or orderId' })
    }
    
    // Fetch device tokens
    const { data: rows, error: fetchErr } = await supabase
      .from('push_subscription_restaurants')
      .select('device_token')
      .eq('restaurant_id', restaurantId)
    
    if (fetchErr) {
      console.error('Fetch tokens error:', fetchErr)
      return res.status(500).json({ error: 'Failed to fetch push subscriptions' })
    }
    
    const tokens = (rows || [])
      .map(r => r.device_token)
      .filter(Boolean)
    
    if (!tokens.length) {
      return res.status(200).json({ message: 'No subscriptions', successCount: 0 })
    }
    
    const itemCount = Array.isArray(orderItems) ? orderItems.length : 0
    const body = `Order #${String(orderId).slice(0, 8)} placed${itemCount ? ` • ${itemCount} items` : ''}`
    
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
        }
      }
    }
    
    // ← UPDATED: Use modern getMessaging().sendMulticast instead of admin.messaging()
    const response = await getMessaging().sendMulticast(message)
    
    return res.status(200).json({
      successCount: response.successCount,
      failureCount: response.failureCount
    })
  } catch (err) {
    console.error('notify-owner error:', err)
    return res.status(500).json({ error: err?.message || 'Internal error' })
  }
}
