// lib/placeOrder.js
import { supabase } from '../services/supabase';

export async function placeOrder({ restaurantId, tableNumber = '1', cart }) {
  const items = (Array.isArray(cart) ? cart : []).map(it => ({
    name: String(it.name || '').trim(),
    quantity: Number(it.qty ?? it.quantity ?? 1) || 1,
    price: Number(it.price ?? 0) || 0,
    notes: it.notes ? String(it.notes) : null,
  }));

  const subtotal = items.reduce((s, it) => s + it.quantity * it.price, 0);
  const tax_amount = 0; // compute per your rules
  const total = subtotal + tax_amount;

  const { data, error } = await supabase
    .from('orders')
    .insert([{
      restaurant_id: restaurantId,
      table_number: String(tableNumber),
      items,                      // write as JSONB (array of objects)
      subtotal,
      tax_amount,
      total,
      total_amount: total,
      status: 'new',
      payment_status: 'pending',
    }])
    .select('id')
    .single();

  if (error) throw error;

  // Optional: also persist normalized rows
  const rows = (cart || []).map(it => ({
    order_id: data.id,
    menu_item_id: it.id || null,
    item_name: it.name || null,
    quantity: Number(it.qty ?? 1) || 1,
    price: Number(it.price ?? 0) || 0,
  }));
  if (rows.length) {
    const { error: oiErr } = await supabase.from('order_items').insert(rows);
    if (oiErr) throw oiErr;
  }
  return data;
}
