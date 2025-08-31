// pages/api/bills/send-daily-report.js
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '../../lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { restaurant_id } = req.body
  const today = new Date().toISOString().slice(0, 10)

  // Create billing_reports table if it doesn't exist (run this SQL once)
  // CREATE TABLE billing_reports (
  //   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  //   restaurant_id UUID REFERENCES restaurants(id),
  //   report_date DATE,
  //   created_at TIMESTAMPTZ DEFAULT NOW(),
  //   UNIQUE(restaurant_id, report_date)
  // );

  // Check for existing report
  const { data: existing } = await supabase
    .from('billing_reports')
    .select('*')
    .eq('restaurant_id', restaurant_id)
    .eq('report_date', today)
    .maybeSingle()

  if (existing) return res.status(200).json({ mailed: false })

  // Fetch today's invoices
  const { data: invoices } = await supabase
    .from('invoices')  // Changed from 'bills' to 'invoices'
    .select('invoice_no, order_id, payment_method, invoice_date, pdf_url, total_inc_tax')
    .eq('restaurant_id', restaurant_id)
    .gte('invoice_date', `${today}T00:00:00Z`)
    .lte('invoice_date', `${today}T23:59:59Z`)

  // Compose email body
  const totalRevenue = invoices?.reduce((sum, inv) => sum + Number(inv.total_inc_tax || 0), 0) || 0
  
  const body = `
Daily Invoice Report for ${today}

Total Invoices: ${invoices?.length || 0}
Total Revenue: ₹${totalRevenue.toFixed(2)}

Invoice Details:
${invoices?.map(inv => 
  `${inv.invoice_no} • Order #${inv.order_id.slice(0,8)} • ${inv.payment_method} • ₹${inv.total_inc_tax} • ${inv.pdf_url}`
).join('\n') || 'No invoices today'}
  `.trim()

  await sendEmail({
    to: process.env.OWNER_EMAIL,
    subject: `Daily Invoice Report – ${today}`,
    text: body
  })

  // Log report
  await supabase
    .from('billing_reports')
    .insert({ restaurant_id, report_date: today })

  res.status(200).json({ mailed: true })
}
