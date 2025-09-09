// pages/api/notify-new-order.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, restaurantId, total } = req.body;

  try {
    // Here you would:
    // 1. Get the restaurant owner's FCM token from database
    // 2. Send FCM notification using Firebase Admin SDK
    
    // For now, just return success
    console.log(`New order ${orderId} for restaurant ${restaurantId}, total: ₹${total}`);
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notification failed:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
}
