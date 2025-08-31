// pages/api/bills/send-daily-report.js
import { createClient } from '@supabase/supabase-js'
import { sendMail } from '../../lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * POST /api/bills/send-daily-report
 * Body: { restaurant_id: string }
 * Sends a daily invoice summary and logs to billing_reports to avoid duplicates.
 */
export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { restaurant_id } = req.body || {}
    if (!restaurant_id) {
      return res.status(400).json({ error: 'restaurant_id is required' })
    }

    // Determine the "today" window (UTC). If you want IST specifically,
    // uncomment the IST block and use those bounds instead.
    const todayDate = new Date()
    const yyyy = todayDate.getUTCFullYear()
    const mm = String(todayDate.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(todayDate.getUTCDate()).padStart(2, '0')
    const today = `${yyyy}-${mm}-${dd}`

    const startUTC = `${today}T00:00:00Z`
    const endUTC = `${today}T23:59:59Z`

    // If you prefer IST (UTC+5:30), use this window instead:
    // const ist = new Date(todayDate.getTime() + 5.5 * 60 * 60 * 1000)
    // const yyyyI = ist.getUTCFullYear()
    // const mmI = String(ist.getUTCMonth() + 1).padStart(2, '0')
    // const ddI = String(ist.getUTCDate()).padStart(2, '0')
    // const istDay = `${yyyyI}-${mmI}-${ddI}`
    // const startIST = new Date(`${istDay}T00:00:00+05:30`).toISOString()
    // const endIST = new Date(`${istDay}T23:59:59+05:30`).toISOString()

    // Avoid duplicate sending for the same restaurant/date
    const { data: existing, error: existingErr } = await supabase
      .from('billing_reports')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .eq('report_date', today)
      .maybeSingle()

    if (existingErr) {
      console.error('billing_reports select error:', existingErr)
      return res.status(500).json({ error: 'Failed to check report log' })
    }

    if (existing) {
      return res.status(200).json({ mailed: false, reason: 'already_sent' })
    }

    // Pull today’s invoices
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('invoice_no, order_id, payment_method, invoice_date, pdf_url, total_inc_tax')
      .eq('restaurant_id', restaurant_id)
      .gte('invoice_date', startUTC)
      .lte('invoice_date', endUTC)

    if (invErr) {
      console.error('invoices select error:', invErr)
      return res.status(500).json({ error: 'Failed to fetch invoices' })
    }

    const safeInvoices = Array.isArray(invoices) ? invoices : []
    const totalRevenue = safeInvoices.reduce((sum, inv) => sum + Number(inv?.total_inc_tax || 0), 0)

    // Compose text body
    const lines = safeInvoices.map(inv => {
      const invNo = inv?.invoice_no || '-'
      const orderShort = inv?.order_id ? inv.order_id.slice(0, 8).toUpperCase() : '—'
      const method = inv?.payment_method || '—'
      const amount = Number(inv?.total_inc_tax || 0).toFixed(2)
      const pdf = inv?.pdf_url || '—'
      return `${invNo} • Order #${orderShort} • ${method} • ₹${amount} • ${pdf}`
    })

    const body = [
      `Daily Invoice Report for ${today}`,
      `Total Invoices: ${safeInvoices.length}`,
      `Total Revenue: ₹${totalRevenue.toFixed(2)}`,
      '',
      'Invoice Details:',
      lines.length ? lines.join('\n') : 'No invoices today'
    ].join('\n')

    // Email recipient
    const to = process.env.OWNER_EMAIL
    if (!to) {
      console.warn('OWNER_EMAIL not set; skipping email send')
    } else {
      const result = await sendMail({
        to,
        subject: `Daily Invoice Report – ${today}`,
        text: body
      })
      if (result?.skipped) {
        console.warn('Email skipped:', result?.reason)
      }
    }

    // Log that we sent (or at least processed) the day’s report
    const { error: logErr } = await supabase
      .from('billing_reports')
      .insert({ restaurant_id, report_date: today })

    if (logErr) {
      console.error('billing_reports insert error:', logErr)
      // Still consider mailed=true to prevent repeated attempts in the same day
    }

    return res.status(200).json({ mailed: true, count: safeInvoices.length, total: Number(totalRevenue.toFixed(2)) })
  } catch (err) {
    console.error('send-daily-report error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
