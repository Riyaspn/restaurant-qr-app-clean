// services/invoiceService.js
import { createClient } from '@supabase/supabase-js'
import { generateBillPdf } from '../lib/generateBillPdf'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export class InvoiceService {
  static async createInvoiceFromOrder(orderId) {
    try {
      // 0) If an invoice already exists for this order, return it (idempotent short-circuit)
      const { data: existing, error: existingErr } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_date, pdf_url, restaurant_id, order_id')
        .eq('order_id', orderId)
        .maybeSingle()
      if (!existingErr && existing) {
        return { invoiceId: existing.id, invoiceNo: existing.invoice_no, pdfUrl: existing.pdf_url }
      } [attached_file:1]

      // 1) Order with items
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', orderId)
        .single()
      if (orderError || !order) throw new Error(`Order ${orderId} not found`)
      const rawItems = order.order_items || [] [attached_file:3]

      // 2) Restaurant + profile
      const { data: restaurant, error: restErr } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', order.restaurant_id)
        .single()
      if (restErr || !restaurant) throw new Error(`Restaurant ${order.restaurant_id} not found`)
      const { data: profile } = await supabase
        .from('restaurant_profiles')
        .select('*')
        .eq('restaurant_id', order.restaurant_id)
        .maybeSingle() [attached_file:3]

      // Effective flags for restaurant service items
      const gstEnabled = (order.gst_enabled ?? profile?.gst_enabled) ?? false
      const baseRate = Number(profile?.default_tax_rate ?? 5)
      const effectiveServiceRate = gstEnabled ? baseRate : 0
      const servicePricesIncludeTax = gstEnabled
        ? (order.prices_include_tax ?? profile?.prices_include_tax ?? true)
        : false [attached_file:3]

      // 3) Normalize items with packaged branching
      const enrichedItems = rawItems.map(oi => {
        const isPackaged = !!oi.is_packaged_good
        const qty = Number(oi.quantity ?? 1)
        const taxRate = Number(oi.tax_rate ?? 0)
        const unitIncStamped = Number(oi.unit_price_inc_tax ?? 0)
        const unitExStamped  = Number(oi.unit_price_ex_tax ?? 0)
        const legacy         = Number(oi.price ?? 0)
        let unitResolved
        if (isPackaged) {
          unitResolved = unitIncStamped || legacy
        } else {
          if (servicePricesIncludeTax) {
            unitResolved = unitIncStamped || legacy
          } else {
            unitResolved = unitExStamped || legacy
          }
        }
        return {
          name: oi.item_name || oi.name || 'Item',
          qty,
          taxRate,
          unitResolved: Number(unitResolved),
          hsn: oi.hsn || '',
          isPackaged
        }
      }) [attached_file:3]

      // 4) Compute totals with same branching
      const computed = enrichedItems.reduce((acc, it) => {
        const r = it.taxRate / 100
        if (it.isPackaged) {
          const inc = it.unitResolved * it.qty
          const ex  = r > 0 ? inc / (1 + r) : inc
          const tax = inc - ex
          acc.subtotal += ex
          acc.tax += tax
          acc.total += inc
        } else {
          if (servicePricesIncludeTax) {
            const inc = it.unitResolved * it.qty
            const ex  = r > 0 ? inc / (1 + r) : inc
            const tax = inc - ex
            acc.subtotal += ex
            acc.tax += tax
            acc.total += inc
          } else {
            const ex  = it.unitResolved * it.qty
            const tax = r * ex
            const inc = ex + tax
            acc.subtotal += ex
            acc.tax += tax
            acc.total += inc
          }
        }
        return acc
      }, { subtotal: 0, tax: 0, total: 0 }) [attached_file:3]

      const subtotalEx = Number(order.subtotal_ex_tax ?? order.subtotal ?? computed.subtotal)
      const totalTax   = Number(order.total_tax ?? order.tax_amount ?? computed.tax)
      const totalInc   = Number(order.total_inc_tax ?? order.total_amount ?? computed.total) [attached_file:3]

      // 5) Create or fetch invoice header via UPSERT to avoid unique-constraint errors
      // NOTE: onConflict requires a unique index/constraint on "order_id" (you already have invoices_order_id_key)
      const { data: inv, error: invError } = await supabase
        .from('invoices')
        .upsert({
          restaurant_id: restaurant.id,
          order_id: order.id,
          customer_name: order.customer_name || null,
          customer_gstin: order.customer_gstin || null,
          billing_address: order.billing_address || null,
          shipping_address: order.shipping_address || null,
          gst_enabled: gstEnabled,
          prices_include_tax: servicePricesIncludeTax,
          subtotal_ex_tax: subtotalEx,
          total_tax: totalTax,
          total_inc_tax: totalInc,
          cgst: gstEnabled ? totalTax / 2 : 0,
          sgst: gstEnabled ? totalTax / 2 : 0,
          igst: 0,
          payment_method: order.payment_method || 'cash'
        }, { onConflict: 'order_id' })
        .select()
        .single()
      if (invError || !inv) throw new Error(invError?.message || 'Failed to create invoice') [attached_file:1]

      // 6) Insert invoice line items (idempotent-ish): clear and re-insert to avoid duplicates
      // If you prefer not to delete, you could upsert with a composite key (invoice_id, line_no)
      await supabase.from('invoice_items').delete().eq('invoice_id', inv.id)
      let lineNo = 1
      for (const it of enrichedItems) {
        const r = it.taxRate / 100
        let ex, inc, tax, unitExResolved
        if (it.isPackaged) {
          inc = it.unitResolved * it.qty
          ex  = r > 0 ? inc / (1 + r) : inc
          tax = inc - ex
          unitExResolved = r > 0 ? it.unitResolved / (1 + r) : it.unitResolved
        } else if (servicePricesIncludeTax) {
          inc = it.unitResolved * it.qty
          ex  = r > 0 ? inc / (1 + r) : inc
          tax = inc - ex
          unitExResolved = r > 0 ? it.unitResolved / (1 + r) : it.unitResolved
        } else {
          ex  = it.unitResolved * it.qty
          tax = r * ex
          inc = ex + tax
          unitExResolved = it.unitResolved
        }
        await supabase.from('invoice_items').insert({
          invoice_id: inv.id,
          line_no: lineNo++,
          item_name: it.name,
          hsn: it.hsn || null,
          qty: it.qty,
          unit_rate_ex_tax: Number(unitExResolved.toFixed(2)),
          tax_rate: it.taxRate,
          tax_amount: Number(tax.toFixed(2)),
          line_total_ex_tax: Number(ex.toFixed(2)),
          line_total_inc_tax: Number(inc.toFixed(2))
        })
      } [attached_file:1]

      // 7) Generate PDF and update invoice with URL (safe to run multiple times)
      const pdfPayload = {
        invoice: {
          invoice_no: inv.invoice_no,
          invoice_date: inv.invoice_date,
          customer_name: inv.customer_name,
          customer_gstin: inv.customer_gstin,
          payment_method: inv.payment_method,
          subtotal_ex_tax: subtotalEx,
          total_tax: totalTax,
          total_inc_tax: totalInc,
          gst_enabled: gstEnabled,
          prices_include_tax: servicePricesIncludeTax
        },
        items: enrichedItems.map(it => ({
          item_name: it.name,
          quantity: it.qty,
          price: it.unitResolved,
          hsn: it.hsn,
          tax_rate: it.taxRate,
          is_packaged_good: it.isPackaged
        })),
        restaurant: {
          name: profile?.restaurant_name || restaurant.name || profile?.legal_name,
          address: [
            profile?.shipping_address_line1,
            profile?.shipping_address_line2,
            [profile?.shipping_city, profile?.shipping_state, profile?.shipping_pincode].filter(Boolean).join(' ')
          ].filter(Boolean).join(', '),
          gstin: profile?.gstin || '',
          phone: profile?.phone || '',
          email: profile?.support_email || ''
        }
      }
      const { pdfUrl } = await generateBillPdf(pdfPayload)
      await supabase.from('invoices').update({ pdf_url: pdfUrl }).eq('id', inv.id)
      return { invoiceId: inv.id, invoiceNo: inv.invoice_no, pdfUrl } [attached_file:1]
    } catch (error) {
      console.error('Invoice generation error:', error)
      throw error
    }
  }
}
