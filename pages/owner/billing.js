// pages/owner/billing.js
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
    const qs = new URLSearchParams({ from, to, restaurant_id: restaurant.id }).toString()
    window.location.href = `/api/reports/sales?${qs}`
  }

  return (
    <div className="container" style={{ padding: '20px 8px 40px' }}>
      <h1 className="h1">Billing & GST Management</h1>

      <Card padding={16} style={{ marginBottom: 16 }}>
        <div className="filters">
          <label className="field">
            <span className="label">From:</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ fontSize: 16 }} /> {/* prevent iOS zoom [web:199][web:198][web:208] */}
          </label>
          <label className="field">
            <span className="label">To:</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ fontSize: 16 }} /> {/* [web:199][web:198][web:208] */}
          </label>
          <div className="cta">
            <Button onClick={reload} disabled={loading}>{loading ? 'Loading…' : 'Load Invoices'}</Button>
            <Button variant="outline" onClick={exportCsv}>Download GST CSV</Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card padding={12} style={{ background: '#fee2e2', borderColor: '#fecaca', marginBottom: 16 }}>
          <div style={{ color: '#b91c1c' }}>{error}</div>
        </Card>
      )}

      <Card padding={16}>
        <h3 style={{ marginTop: 0 }}>Invoices ({invoices.length})</h3>
        {invoices.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No invoices for selected dates.</p>
        ) : (
          <div className="invoice-list">
            {invoices.map(inv => (
              <div key={inv.id} className="invoice-row">
                <strong className="inv-no">{inv.invoice_no || inv.id.slice(0, 8).toUpperCase()}</strong>
                <span className="sep">—</span>
                <span className="inv-date">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleString() : '-'}</span>
                <span className="sep">—</span>
                <span className="inv-amt">₹{Number(inv.total_inc_tax ?? 0).toFixed(2)}</span>
                <div className="spacer" />
                {inv.pdf_url ? (
                  <Button size="sm" onClick={() => window.open(inv.pdf_url, '_blank')}>View PDF</Button>
                ) : (
                  <span style={{ color: '#f87171' }}>No PDF available</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <style jsx>{`
        .filters {
          display: grid;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 10px;
          align-items: end;
        }
        .field { display: grid; grid-template-columns: auto 1fr; gap: 8px; align-items: center; }
        .label { color: #374151; }
        .cta { display: flex; gap: 8px; justify-content: flex-end; grid-column: 3 / -1; flex-wrap: wrap; }
        .invoice-list { display: grid; gap: 12px; }
        .invoice-row {
          display: grid;
          grid-template-columns: auto auto 1fr auto auto auto;
          gap: 8px; align-items: center;
        }
        .spacer { flex: 1; }
        .sep { color: #9ca3af; }
        .inv-no { overflow-wrap: anywhere; }
        .inv-date { color: #6b7280; }
        .inv-amt { font-weight: 600; }

        @media (max-width: 900px) {
          .filters { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .cta { grid-column: 1 / -1; justify-content: flex-start; }
        }
        @media (max-width: 560px) {
          .invoice-row { grid-template-columns: 1fr; }
          .sep { display: none; }
          .spacer { display: none; }
        }
      `}</style>
    </div>
  )
}
