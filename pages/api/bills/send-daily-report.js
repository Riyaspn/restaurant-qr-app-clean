// pages/api/bills/send-daily-report.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { restaurant_id } = req.body || {}
    if (!restaurant_id) {
      return res.status(400).json({ error: 'restaurant_id is required' })
    }

    const todayDate = new Date()
    const yyyy = todayDate.getUTCFullYear()
    const mm = String(todayDate.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(todayDate.getUTCDate()).padStart(2, '0')
    const today = `${yyyy}-${mm}-${dd}`

    const startUTC = `${today}T00:00:00Z`
    const endUTC = `${today}T23:59:59Z`

    // Check for existing report
    const { data: existing } = await supabase
      .from('billing_reports')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('report_date', today)
      .maybeSingle()

    if (existing) {
      return res.status(200).json({ mailed: false, reason: 'already_sent' })
    }

    // Fetch today's invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('invoice_no, order_id, payment_method, invoice_date, pdf_url, total_inc_tax')
      .eq('restaurant_id', restaurant_id)
      .gte('invoice_date', startUTC)
      .lte('invoice_date', endUTC)

    const safeInvoices = Array.isArray(invoices) ? invoices : []
    const totalRevenue = safeInvoices.reduce((sum, inv) => sum + Number(inv?.total_inc_tax || 0), 0)

    // Email report (optional - won't fail if mailer missing)
    let emailSent = false
    try {
      const { sendMail } = await import('../../lib/email')
      if (sendMail && process.env.OWNER_EMAIL) {
        const lines = safeInvoices.map(inv => {
          const invNo = inv?.invoice_no || '-'
          const orderShort = inv?.order_id ? inv.order_id.slice(0, 8).toUpperCase() : '—'
          const method = inv?.payment_method || '—'
          const amount = Number(inv?.total_inc_tax || 0).toFixed(2)
          return `${invNo} • Order #${orderShort} • ${method} • ₹${amount}`
        })

        const body = [
          `Daily Invoice Report for ${today}`,
          `Total Invoices: ${safeInvoices.length}`,
          `Total Revenue: ₹${totalRevenue.toFixed(2)}`,
          '',
          'Invoice Details:',
          lines.length ? lines.join('\n') : 'No invoices today'
        ].join('\n')

        await sendMail({
          to: process.env.OWNER_EMAIL,
          subject: `Daily Invoice Report – ${today}`,
          text: body
        })
        emailSent = true
      }
    } catch (err) {
      console.log('Email skipped:', err.message)
    }

    // Log that we processed the day's report
    await supabase
      .from('billing_reports')
      .insert({ restaurant_id, report_date: today })

    return res.status(200).json({ 
      mailed: emailSent, 
      count: safeInvoices.length, 
      total: Number(totalRevenue.toFixed(2)) 
    })
  } catch (err) {
    console.error('send-daily-report error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
