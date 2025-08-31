//pages/api/invoices/list.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { restaurant_id } = req.query
  if (!restaurant_id) {
    return res.status(400).json({ error: 'restaurant_id is required' })
  }

  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, invoice_no, order_id, payment_method, invoice_date, pdf_url, total_inc_tax')
      .eq('restaurant_id', restaurant_id)
      .order('invoice_date', { ascending: false })

    if (error) throw error

    const invoices = (data || []).map(inv => ({
      id: inv.id,
      invoice_no: inv.invoice_no,
      order_id: inv.order_id,
      payment_method: inv.payment_method,
      invoice_date: inv.invoice_date,
      pdf_url: inv.pdf_url,
      amount: inv.total_inc_tax
    }))

    res.status(200).json({ invoices })
  } catch (e) {
    console.error('Fetch invoices error:', e)
    res.status(500).json({ error: e.message || 'Failed to fetch invoices' })
  }
}
