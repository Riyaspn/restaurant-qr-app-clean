// pages/owner/reports.js
import React, { useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../lib/useRequireAuth'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function OwnerReports() {
  const { checking } = useRequireAuth()
  const router = useRouter()
  const restaurantId = useMemo(() => router.query.r || process.env.NEXT_PUBLIC_RESTAURANT_ID, [router.query.r])

  const today = new Date().toISOString().slice(0, 10)
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)

  if (checking) return <div style={{ padding: 24 }}>Loading…</div>

  const exportGstCsv = () => {
    if (!restaurantId) return
    const qs = new URLSearchParams({ from, to, restaurant_id: restaurantId }).toString()
    window.location.href = `/api/reports/sales?${qs}`
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <header style={{ background: '#fff', padding: 16, borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
      </header>

      <div style={{ maxWidth: 1000, margin: '16px auto', padding: '0 16px' }}>
        <Card padding={16} style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>GST Sales Report</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label>From: <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
            <label>To: <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
            <Button onClick={exportGstCsv}>Download CSV</Button>
          </div>
          <div className="muted" style={{ marginTop: 8 }}>
            Exports from the invoices table via v_gst_sales_export. Import into Tally/Zoho or share with CA.
          </div>
        </Card>

        <Card padding={16}>
          <h3 style={{ marginTop: 0 }}>More Reports (coming soon)</h3>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>HSN-wise sales summary</li>
            <li>Tax-slab summary</li>
            <li>Payment-mode summary</li>
            <li>Daily/weekly sales trend</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
