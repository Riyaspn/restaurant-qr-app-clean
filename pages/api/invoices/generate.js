import { InvoiceService } from '../../../services/invoiceService'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { order_id } = req.body
  if (!order_id) {
    return res.status(400).json({ error: 'Order ID is required' })
  }

  try {
    const result = await InvoiceService.createInvoiceFromOrder(order_id)
    res.status(200).json(result)
  } catch (error) {
    console.error('Invoice generation error:', error)
    res.status(500).json({ error: error.message || 'Failed to generate invoice' })
  }
}
