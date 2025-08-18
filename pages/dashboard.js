// pages/dashboard.js
import { useEffect, useState } from 'react'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../services/supabase'
import Shell from '../components/Shell'

export default function Dashboard() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: loadingRestaurant } = useRestaurant()

  const [stats, setStats] = useState({ live: 0, revenue: 0, avg: 0, oos: 0 })
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!restaurant?.id) return

    const load = async () => {
      setError('')
      const start = new Date()
      start.setHours(0, 0, 0, 0)
      const fromISO = start.toISOString()

      // Orders today (non-cancelled) for revenue and avg
      const { data: nonCancelled, error: e1 } = await supabase
        .from('orders')
        .select('total')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', fromISO)
        .neq('status', 'cancelled')
      if (e1) return setError(e1.message)

      const totals = (nonCancelled || []).map(r => Number(r.total || 0))
      const revenue = totals.reduce((a, b) => a + b, 0)
      const ordersCount = totals.length
      const avg = ordersCount ? revenue / ordersCount : 0

      // Live orders: new, in_progress, ready (today)
      const { data: liveOrders, error: e2 } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', fromISO)
        .in('status', ['new', 'in_progress', 'ready'])
      if (e2) return setError(e2.message)

      // Out of stock items
      const { count: oosCount, error: e3 } = await supabase
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'out_of_stock')
      if (e3) return setError(e3.message)

      setStats({
        live: (liveOrders || []).length,
        revenue,
        avg,
        oos: oosCount || 0,
      })
    }

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('restaurant_profiles')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle()
      if (!error) setProfile(data || null)
    }

    load()
    loadProfile()
  }, [restaurant?.id])

  if (checking || loadingRestaurant) {
    return (
      <Shell>
        <h1>Loading…</h1>
        <p>Please wait while we verify your session.</p>
      </Shell>
    )
  }

  const needsSetup =
    !profile ||
    !profile.phone ||
    !profile.shipping_address_line1 ||
    !profile.shipping_city ||
    !profile.shipping_pincode ||
    !profile.upi_id ||
    (Number(profile.tables_count || 0) <= 0)

  return (
    <Shell>
      <h1>Dashboard Overview</h1>
      {error && <p style={{ color: '#a00' }}>{error}</p>}

      {needsSetup && (
        <div className="card" style={{ marginBottom: 16, borderColor: '#ffe58f', background: '#fffbe6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <strong>Complete your setup</strong>
              <div style={{ color: '#666', marginTop: 4 }}>
                Add contact, shipping address, tables count, and UPI in Settings to ship QR stands and start orders.
              </div>
            </div>
            <a href="/settings">
              <button>Open Settings</button>
            </a>
          </div>
        </div>
      )}

      <div className="grid-4" style={{ marginBottom: 16 }}>
        <KpiCard label="Live Orders" value={stats.live} />
        <KpiCard label="Revenue Today" value={`₹${stats.revenue.toFixed(2)}`} />
        <KpiCard label="Avg Order" value={`₹${stats.avg.toFixed(2)}`} />
        <KpiCard label="Out of Stock" value={stats.oos} />
      </div>

      <div className="grid-2-1">
        <div className="card">
          <h3>Recent Orders</h3>
          <p style={{ color: '#666' }}>No orders yet. Share your QR code to start receiving orders.</p>
        </div>
        <div className="card">
          <h3>Quick Actions</h3>
          <button style={{ display: 'block', width: '100%', marginBottom: 8, padding: 10 }}>
            Mark Item Out of Stock
          </button>
          <button style={{ display: 'block', width: '100%', padding: 10 }}>
            Create Promotion
          </button>
        </div>
      </div>
    </Shell>
  )
}

function KpiCard({ label, value }) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600 }}>{value}</div>
    </div>
  )
}
