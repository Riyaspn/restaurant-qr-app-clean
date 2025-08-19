// pages/analytics.js
import { useEffect, useState } from 'react'
import Alert from '../components/Alert'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../services/supabase'

export default function AnalyticsPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading } = useRestaurant()
  const [error, setError] = useState('')
  const [range, setRange] = useState('today')
  const [stats, setStats] = useState({ orders: 0, revenue: 0, avg: 0 })

  useEffect(() => {
    if (!restaurant?.id) return
    const load = async () => {
      let from = new Date()
      if (range === 'today') {
        from.setHours(0, 0, 0, 0)
      } else if (range === '7d') {
        from.setDate(from.getDate() - 7)
      } else if (range === '30d') {
        from.setDate(from.getDate() - 30)
      }
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', from.toISOString())
        .neq('status', 'cancelled')

      if (error) { setError(error.message); return }

      const totals = Array.isArray(data) ? data.map(r => Number(r.total || 0)) : []
      const revenue = totals.reduce((a, b) => a + b, 0)
      const orders = totals.length
      const avg = orders ? revenue / orders : 0
      setStats({ orders, revenue, avg })
    }
    load()
  }, [restaurant?.id, range])

  if (checking || loading) return <p>Loading…</p>

  return (
    <>
      <h1>Analytics</h1>
      {error && <Alert type="error">{error}</Alert>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setRange('today')} disabled={range === 'today'}>Today</button>
        <button onClick={() => setRange('7d')} disabled={range === '7d'}>Last 7 days</button>
        <button onClick={() => setRange('30d')} disabled={range === '30d'}>Last 30 days</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <Kpi label="Orders" value={stats.orders} />
        <Kpi label="Revenue" value={`₹${stats.revenue.toFixed(2)}`} />
        <Kpi label="Avg order value" value={`₹${stats.avg.toFixed(2)}`} />
      </div>

      <p style={{ color: '#666', marginTop: 16 }}>
        Charts coming soon: sales trend, peak hours heatmap, top items, cancellations.
      </p>
    </>
  )
}

function Kpi({ label, value }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
      <div style={{ color: '#666', fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  )
}
