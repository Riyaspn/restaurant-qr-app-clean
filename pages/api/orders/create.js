// pages/api/orders/create.js
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    return res.status(500).json({ error: 'Server configuration error' });
  }
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const {
      restaurant_id,
      table_number,
      items,
      payment_method = 'cash',
      payment_status = 'pending',
      special_instructions = null,
      restaurant_name = null
    } = req.body;

    if (!restaurant_id || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Load menu item attributes needed for tax/packaged rules
    const itemIds = items.map((it) => it.id).filter(Boolean);
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, is_packaged_good, tax_rate')
      .in('id', itemIds);
    if (menuError) {
      if (process.env.NODE_ENV !== 'production') console.error('Menu items fetch error:', menuError);
      return res.status(500).json({ error: 'Failed to load menu items' });
    }

    // Load restaurant profile for service lines
    const { data: profile, error: profileErr } = await supabase
      .from('restaurant_profiles')
      .select('gst_enabled, default_tax_rate, prices_include_tax')
      .eq('restaurant_id', restaurant_id)
      .maybeSingle();
    if (profileErr) {
      if (process.env.NODE_ENV !== 'production') console.error('Profile fetch error:', profileErr);
      return res.status(500).json({ error: 'Failed to load settings' });
    }


    const gstEnabled = !!profile?.gst_enabled;
    const baseRate = Number(profile?.default_tax_rate ?? 5);
    const serviceRate = gstEnabled ? baseRate : 0;
    const gstEnabled = !!profile?.gst_enabled
    const baseRate = Number(profile?.default_tax_rate ?? 5)
    const serviceRate = gstEnabled ? baseRate : 0
    const serviceInclude = gstEnabled ? (profile?.prices_include_tax === true || profile?.prices_include_tax === 'true' || profile?.prices_include_tax === 1 || profile?.prices_include_tax === '1') : false

    // Compute totals and normalized order_items
    let subtotalEx = 0;
    let totalTax = 0;
    let totalInc = 0;

    const preparedItems = items.map((it) => {
      const qty = Number(it.quantity ?? 1);
      const unit = Number(it.price ?? 0);

      const menuItem = menuItems?.find((mi) => mi.id === it.id);
      const isPackaged = !!(menuItem?.is_packaged_good || it.is_packaged_good);
      const itemTaxRate = Number(menuItem?.tax_rate ?? it.tax_rate ?? 0);

      let unitEx, unitInc, lineEx, tax, lineInc, effectiveRate;

      if (isPackaged) {
        effectiveRate = itemTaxRate;
        unitInc = unit;
        unitEx = effectiveRate > 0 ? unitInc / (1 + effectiveRate / 100) : unitInc;
        lineInc = unitInc * qty;
        lineEx = unitEx * qty;
        tax = lineInc - lineEx;
      } else {
        effectiveRate = serviceRate;
        if (serviceInclude) {
          unitInc = unit;
          unitEx = effectiveRate > 0 ? unitInc / (1 + effectiveRate / 100) : unitInc;
          lineInc = unitInc * qty;
          lineEx = unitEx * qty;
          tax = lineInc - lineEx;
        } else {
          unitEx = unit;
          lineEx = unitEx * qty;
          tax = (effectiveRate / 100) * lineEx;
          lineInc = lineEx + tax;
          unitInc = effectiveRate > 0 ? unitEx * (1 + effectiveRate / 100) : unitEx;
        }
      }

      subtotalEx += lineEx;
      totalTax += tax;
      totalInc += lineInc;
      // Use item's own tax rate if packaged, otherwise restaurant base rate
      effectiveRate = isPackaged ? itemTaxRate : serviceRate
      if (serviceInclude) {
        unitInc = unit
        unitEx = effectiveRate > 0 ? unitInc / (1 + effectiveRate / 100) : unitInc
        lineInc = unitInc * qty
        lineEx = unitEx * qty
        tax = lineInc - lineEx
      } else {
        unitEx = unit
        lineEx = unitEx * qty
        tax = (effectiveRate / 100) * lineEx
        lineInc = lineEx + tax
        unitInc = effectiveRate > 0 ? unitEx * (1 + effectiveRate / 100) : unitEx
      }

      // Round at line level to avoid floating drift
      const lineExR = Number(lineEx.toFixed(2))
      const taxR = Number(tax.toFixed(2))
      const lineIncR = Number(lineInc.toFixed(2))
      const unitExR = Number(unitEx.toFixed(2))
      const unitIncR = Number(unitInc.toFixed(2))

      subtotalEx += lineExR
      totalTax += taxR
      totalInc += lineIncR

      return {
        order_id: null,
        menu_item_id: it.id,
        quantity: qty,
        price: unit,
        item_name: it.name,
        unit_price_ex_tax: unitExR,
        unit_price_inc_tax: unitIncR,
        unit_tax_amount: Number((unitIncR - unitExR).toFixed(2)),
        tax_rate: effectiveRate,
        hsn: it.hsn || null,
        is_packaged_good: isPackaged
      };
    });

    // Insert order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([
        {
          restaurant_id,
          table_number: table_number || 1,
          status: 'new',
          payment_method,
          payment_status,
          special_instructions,
          restaurant_name,
          subtotal_ex_tax: Number(subtotalEx.toFixed(2)),
          total_tax: Number(totalTax.toFixed(2)),
          total_inc_tax: Number(totalInc.toFixed(2)),
          total_amount: Number(totalInc.toFixed(2)),
          prices_include_tax: serviceInclude,
          gst_enabled: gstEnabled
        }
      ])
      .select('id')
      .single();
    if (orderError) {
      if (process.env.NODE_ENV !== 'production') console.error('Order creation error:', orderError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    // Insert order items
    const orderItems = preparedItems.map((oi) => ({ ...oi, order_id: order.id }));
    const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
    if (itemsError) {
      if (process.env.NODE_ENV !== 'production') console.error('Order items error:', itemsError);
      await supabase.from('orders').delete().eq('id', order.id);
      return res.status(500).json({ error: 'Failed to create order items' });
    }

    // Send push to owner devices (non-blocking)
    try {
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      await fetch(`${base}/api/notify-owner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant_id,
          orderId: order.id,
          orderItems: items
        })
      }).catch((e) => console.warn('notify-owner failed (non-blocking):', e?.message || e));
    } catch (e) {
      console.warn('Notification dispatch failed (non-blocking):', e?.message || e);
    }

    return res.status(200).json({
      success: true,
      id: order.id,
      order_id: order.id,
      order_number: order.id.slice(0, 8).toUpperCase()
    });
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('API error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
