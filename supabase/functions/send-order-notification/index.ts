import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const fcmKey      = Deno.env.get('FCM_SERVER_KEY')!;

const supabase = createClient(supabaseUrl, serviceKey);

serve(async (req) => {
  try {
    const { type, table, record } = await req.json();
    if (type !== 'INSERT' || table !== 'orders' || record?.status !== 'new') {
      return new Response('skip');
    }

    const { id, restaurant_id, total_amount, items } = record;

    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('device_token')
      .eq('restaurant_id', restaurant_id)
      .eq('platform', 'android');

    if (!subs?.length) return new Response('no subs');

    const count = Array.isArray(items) ? items.reduce((s, it) => s + (it.quantity || 1), 0) : 0;
    const total = Number(total_amount || 0).toFixed(2);
    const title = 'New Order';
    const body  = `#${String(id).slice(0,8)} • ${count} items • ₹${total}`;

    const results = await Promise.allSettled(
      subs.map(s => sendFCM(s.device_token, title, body))
    );

    return new Response(JSON.stringify(results));
  } catch (e) {
    console.error(e);
    return new Response('err', { status: 500 });
  }
});

async function sendFCM(token: string, title: string, body: string) {
  // Using default sound: either omit "sound" or set "default"
  const payload = {
    to: token,
    priority: 'high',
    notification: {
      title,
      body,
      // If you created the "orders_default" channel, include it; else omit channel and FCM default is used.
      channel_id: 'orders_default',
      sound: 'default' // use system default sound
    },
    data: { url: 'owner/orders' }
  };

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      'Authorization': `key=${fcmKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) throw new Error(`FCM ${res.status}`);
}
