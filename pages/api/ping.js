// Create this new API endpoint pages/api/ping.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Simple ping response to keep connection alive
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
}
