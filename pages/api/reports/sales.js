// pages/api/reports/sales.js
import { createClient } from '@supabase/supabase-js'
import { Parser } from 'json2csv'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    const { from, to, restaurant_id } = req.query
    if (!from || !to || !restaurant_id) {
      return res.status(400).json({ error: 'from, to, and restaurant_id are required' })
    }

    // Pull rows from the flattened export view
    const { data, error } = await supabase
      .from('v_gst_sales_export')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .gte('invoice_date', from)
      .lte('invoice_date', to)
      .order('invoice_date', { ascending: true })
      .order('invoice_no', { ascending: true })

    if (error) throw error

    const rows = data || []

    // Define explicit column headers and field mapping (stable order)
    const fields = [
      { label: 'Invoice No', value: 'invoice_no' },
      { label: 'Date', value: (r) => r.invoice_date }, // already date in view
      { label: 'Customer GSTIN', value: 'customer_gstin' },
      { label: 'HSN/SAC', value: 'hsn' },
      { label: 'Description', value: 'description' },
      { label: 'Qty', value: 'qty' },
      { label: 'Rate', value: 'rate' },
      { label: 'Taxable Value', value: 'taxable_value' },
      { label: 'Tax %', value: 'tax_rate' },
      { label: 'CGST', value: 'cgst_amount' },
      { label: 'SGST', value: 'sgst_amount' },
      { label: 'IGST', value: 'igst_amount' },
      { label: 'Line Total', value: 'line_total' },
      { label: 'Invoice Total', value: 'invoice_total' },
      { label: 'Payment', value: 'payment_method' },
    ]

    const parser = new Parser({ fields })
    const csv = parser.parse(rows)

    res.setHeader('Content-Disposition', `attachment; filename="gst_sales_${from}_to_${to}.csv"`)
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.status(200).send(csv)
  } catch (e) {
    console.error('GST CSV export error:', e)
    res.status(500).json({ error: e.message || 'Failed to export GST CSV' })
  }
}
