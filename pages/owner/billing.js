//pages/owner/billing.js
import React, { useEffect, useState } from 'react'
import { useRestaurant } from '../../context/RestaurantContext'
import { supabase } from '../../services/supabase'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function BillingPage() {
  const { restaurant } = useRestaurant()
  const today = new Date().toISOString().slice(0, 10)

  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reload = async () => {
    if (!restaurant?.id) return
    setLoading(true)
    setError('')
    try {
      const start = `${from}T00:00:00Z`
      const end = `${to}T23:59:59Z`
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_date, total_inc_tax, pdf_url')
        .eq('restaurant_id', restaurant.id)
        .gte('invoice_date', start)
        .lte('invoice_date', end)
        .order('invoice_date', { ascending: false })
      if (error) throw error
      setInvoices(data || [])
    } catch (e) {
      setError(e.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id, from, to])

  const exportCsv = () => {
    if (!restaurant?.id) return
    const qs = new URLSearchParams({
      from,
      to,
      restaurant_id: restaurant.id,
    }).toString()
    window.location.href = `/api/reports/sales?${qs}`
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Billing & GST Management</h1>

      <Card padding={16} style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <label>From:&nbsp;
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </label>
        <label>To:&nbsp;
          <input type="date" value={to} onChange={e => setTo(e.target.value)} />
        </label>
        <Button onClick={reload} disabled={loading}>{loading ? 'Loading…' : 'Load Invoices'}</Button>
        <div style={{ flex: 1 }} />
        <Button variant="outline" onClick={exportCsv}>Download GST CSV</Button>
      </Card>

      {error && (
        <Card padding={12} style={{ background: '#fee2e2', borderColor: '#fecaca', marginBottom: 16 }}>
          <div style={{ color: '#b91c1c' }}>{error}</div>
        </Card>
      )}

      <Card padding={16}>
        <h3>Invoices ({invoices.length})</h3>
        {invoices.length === 0 ? (
          <p>No invoices for selected dates.</p>
        ) : (
          invoices.map(inv => (
            <div key={inv.id} style={{ marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <strong>{inv.invoice_no || inv.id.slice(0, 8).toUpperCase()}</strong>
              <span>—</span>
              <span>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleString() : '-'}</span>
              <span>—</span>
              <span>₹{Number(inv.total_inc_tax ?? 0).toFixed(2)}</span>
              <div style={{ flex: 1 }} />
              {inv.pdf_url ? (
                <Button size="sm" onClick={() => window.open(inv.pdf_url, '_blank')}>View PDF</Button>
              ) : (
                <span style={{ color: '#f87171' }}>No PDF available</span>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
