//pages/api/invoices/generate.js


import { InvoiceService } from '../../../services/invoiceService'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { order_id } = req.body
  if (!order_id || typeof order_id !== 'string') {
    return res.status(400).json({ error: 'Valid Order ID is required' })
  }

  try {
    const result = await InvoiceService.createInvoiceFromOrder(order_id)
    return res.status(200).json({ pdf_url: result?.pdf_url })
  } catch (error) {
    const msg = error?.message || ''
    const isDuplicate =
      error?.code === '23505' ||
      msg.includes('duplicate key value violates unique constraint') ||
      msg.includes('invoices_order_id_key')

    if (isDuplicate) {
      // Fetch and return existing invoice
      const { data, error: fetchErr } = await supabase
        .from('invoices')
        .select('pdf_url')
        .eq('order_id', order_id)
        .single()

      if (fetchErr) {
        console.error('Error fetching existing invoice:', fetchErr)
        return res.status(500).json({ error: 'Could not retrieve existing invoice' })
      }

      return res.status(200).json({ pdf_url: data?.pdf_url })
    }

    console.error('Invoice generation error:', error)
    return res.status(500).json({ error: msg || 'Failed to generate invoice' })
  }
}
