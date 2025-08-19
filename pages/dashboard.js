// pages/dashboard.js
import { useEffect, useState } from 'react'
import KpiGrid from '../components/KpiGrid'
import RecentOrders from '../components/RecentOrders'
import QuickActions from '../components/QuickActions'
import { supabase } from '../services/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    liveOrders: 0,
    revenueToday: 0,
    avgTicket: 0,
    outOfStock: 0
  })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverview()
    fetchRecentOrders()
  }, [])

  async function fetchOverview() {
    try {
      // Today (local timezone) start timestamp
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const startISO = startOfToday.toISOString()

      // 1) Live orders count
      const { count: liveCount, error: liveErr } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
      if (liveErr) throw liveErr
      const liveOrders = typeof liveCount === 'number' ? liveCount : 0

      // 2) Today revenue and average
      const { data: todayRows, error: todayErr } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', startISO)
      if (todayErr) throw todayErr
      const safeToday = Array.isArray(todayRows) ? todayRows : []
      const revenueToday = safeToday.reduce((sum, o) => sum + Number(o.total_amount || 0), 0)
      const avgTicket = safeToday.length ? revenueToday / safeToday.length : 0

      // 3) Out-of-stock count
      const { count: outCount, error: outErr } = await supabase
        .from('menu_items')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'out_of_stock')
      if (outErr) throw outErr
      const outOfStock = typeof outCount === 'number' ? outCount : 0

      setStats({ liveOrders, revenueToday, avgTicket, outOfStock })
    } catch (e) {
      setStats({ liveOrders: 0, revenueToday: 0, avgTicket: 0, outOfStock: 0 })
      console.error('fetchOverview error:', e)
    }
  }

  async function fetchRecentOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('id,created_at,status,total_amount')
        .order('created_at', { ascending: false })
        .limit(5)
      if (error) throw error
      setOrders(Array.isArray(data) ? data : [])
    } catch (e) {
      setOrders([])
      console.error('fetchRecentOrders error:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="dashboard-page">
        <h1>Dashboard Overview</h1>
        <KpiGrid stats={stats} />
        <QuickActions />
        <RecentOrders orders={orders} loading={loading} />
      </div>

      <style jsx>{`
        .dashboard-page {
          max-width: 1200px;
          margin: 0 auto;
        }
        h1 {
          margin-bottom: 1rem;
          font-size: 2rem;
        }
      `}</style>
    </>
  )
}
