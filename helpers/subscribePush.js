// helpers/subscribePush.js
export async function subscribeOwnerDevice({ restaurantId, token, platform }) {
  const body = { restaurantId, deviceToken: token, platform };
  const tokenPrefix = (token || '').slice(0, 24);
  console.log('[push] subscribeOwnerDevice →', { restaurantId, platform, tokenPrefix });

  const resp = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await resp.json();
  if (!resp.ok) {
    console.error('[push] subscribe failed', json?.error);
    throw new Error(json?.error || 'subscribe failed');
  }

  console.log('[push] subscribe ok', { row: json?.subscription, tokenPrefix });
  return json;
}
