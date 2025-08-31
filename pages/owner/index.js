// pages/owner/index.js
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../services/supabase'
import { useRequireAuth } from '../../lib/useRequireAuth'
import { useRestaurant } from '../../context/RestaurantContext'

function formatCurrency(n) {
  const num = Number(n || 0)
  return `₹${num.toFixed(2)}`
}
function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export default function OwnerOverview() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: restLoading, error: restError } = useRestaurant()

  const [stats, setStats] = useState({ liveOrders: 0, revenueToday: 0, avgTicket: 0, outOfStock: 0 })
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const restaurantId = restaurant?.id || ''

  useEffect(() => {
    if (checking || restLoading) return
    if (!restaurantId) {
      setLoading(false)
      return
    }
    let cancel = false

    async function fetchOverview() {
      try {
        setErr('')
        const startISO = startOfTodayISO()

        const { count: liveCount, error: liveErr } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .in('status', ['new', 'in_progress', 'ready'])
        if (liveErr) throw liveErr
        const liveOrders = typeof liveCount === 'number' ? liveCount : 0

        const { data: todayRows, error: todayErr } = await supabase
          .from('orders')
          .select('total_amount,total,status,created_at')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', startISO)
        if (todayErr) throw todayErr

        const rows = Array.isArray(todayRows) ? todayRows : []
        const totalFor = (o) => Number(o.total_amount ?? o.total ?? 0)
        const revenueToday = rows.reduce((a, o) => a + totalFor(o), 0)
        const completed = rows.filter((o) => String(o.status) === 'completed')
        const avgTicket = completed.length > 0
          ? completed.reduce((a, o) => a + totalFor(o), 0) / completed.length
          : 0

        const { count: outCount, error: outErr } = await supabase
          .from('menu_items')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurantId)
          .eq('is_available', false)
        if (outErr) throw outErr

        if (!cancel) setStats({ liveOrders, revenueToday, avgTicket, outOfStock: outCount || 0 })
      } catch (e) {
        if (!cancel) {
          setErr(e?.message || 'Failed to load KPIs')
          setStats({ liveOrders: 0, revenueToday: 0, avgTicket: 0, outOfStock: 0 })
        }
      }
    }

    async function fetchRecentOrders() {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('id,created_at,status,total_amount,total')
          .eq('restaurant_id', restaurantId)
          .order('created_at', { ascending: false })
          .limit(10)
        if (error) throw error
        if (!cancel) setOrders(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancel) {
          setErr((prev) => prev || e?.message || 'Failed to load recent orders')
          setOrders([])
        }
      } finally {
        if (!cancel) setLoading(false)
      }
    }

    fetchOverview()
    fetchRecentOrders()
    return () => { cancel = true }
  }, [checking, restLoading, restaurantId])

  if (checking || restLoading) return <div style={{ padding: 24 }}>Loading…</div>

  if (!restaurantId) {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>Dashboard Overview</h1>
        <div style={{ padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}>
          {restError
            ? `Unable to resolve your restaurant: ${restError}`
            : 'No restaurant is linked to this login (owner_email).'}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="dashboard-page">
        <div className="page-head">
          <h1>Dashboard Overview</h1>
          <div className="cta-wrap">
            <Link href="/owner/orders" className="btn-ghost">Orders</Link>
            <Link href="/owner/menu" className="btn-ghost">Menu</Link>
          </div>
        </div>

        {err && (
          <div className="alert-error">{err}</div>
        )}

        <KpiGrid stats={stats} />
        <QuickActions />
        <RecentOrders orders={orders} loading={loading} />
      </div>

      <style jsx>{`
        .dashboard-page { max-width: 1200px; margin: 0 auto; padding: 0 8px 20px; }
        .page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        h1 { margin: 12px 0; font-size: clamp(20px, 2.4vw, 32px); }
        .cta-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
        .btn-ghost {
          border: 1px solid #e5e7eb; border-radius: 10px; padding: 8px 12px; background: #fff; text-decoration: none;
        }
        .alert-error {
          padding: 12px; border-radius: 8px; border: 1px solid #fecaca; background: #fff1f2; color: #b91c1c; margin-bottom: 12px;
        }
        @media (max-width: 640px) {
          .page-head { flex-direction: column; align-items: flex-start; }
          .cta-wrap { width: 100%; }
        }
      `}</style>
    </>
  )
}

function KpiGrid({ stats }) {
  const tiles = [
    { label: 'Live Orders', value: stats.liveOrders },
    { label: 'Revenue Today', value: formatCurrency(stats.revenueToday) },
    { label: 'Avg Ticket', value: formatCurrency(stats.avgTicket) },
    { label: 'Out of Stock', value: stats.outOfStock },
  ]
  return (
    <div className="kpi-grid">
      {tiles.map((t) => (
        <div key={t.label} className="kpi">
          <div className="kpi-label">{t.label}</div>
          <div className="kpi-value">{t.value}</div>
        </div>
      ))}
      <style jsx>{`
        .kpi-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 16px;
        }
        .kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; min-height: 88px; }
        .kpi-label { color: #6b7280; margin-bottom: 6px; }
        .kpi-value { font-size: clamp(20px, 3.2vw, 28px); font-weight: 800; }
        @media (max-width: 1024px) {
          .kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          .kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}

function QuickActions() {
  return (
    <>
      <div className="qa">
        <Link href="/owner/orders" className="btn">View Orders</Link>
        <Link href="/owner/menu" className="btn">Manage Menu</Link>
        <Link href="/owner/promotions" className="btn">Create Promotion</Link>
      </div>
      <style jsx>{`
        .qa { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; }
        .btn {
          background: #f97316; color: #fff; padding: 10px 14px; border-radius: 10px;
          border: 1px solid #ea580c; text-decoration: none; box-shadow: 0 6px 16px rgba(249,115,22,.15);
          min-height: 44px;
        }
        @media (max-width: 480px) {
          .btn { flex: 1 1 auto; text-align: center; }
        }
      `}</style>
    </>
  )
}

function RecentOrders({ orders, loading }) {
  return (
    <>
      <div className="card">
        <div className="card-head">Recent Orders</div>
        {loading ? (
          <div className="pad subtle">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="pad subtle">No recent orders.</div>
        ) : (
          orders.map((o) => (
            <div key={o.id} className="row">
              <span className="id">#{String(o.id).slice(0, 8)}</span>
              <span className="date">{o.created_at ? new Date(o.created_at).toLocaleString() : '--'}</span>
              <span className={`status ${String(o.status || 'new')}`}>{String(o.status || 'new')}</span>
              <span className="total">{formatCurrency(o.total_amount ?? o.total ?? 0)}</span>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .card { border: 1px solid #e5e7eb; border-radius: 12px; background: #fff; overflow: hidden; }
        .card-head { padding: 16px; border-bottom: 1px solid #e5e7eb; font-weight: 700; }
        .pad { padding: 16px; }
        .subtle { color: #6b7280; }

        .row {
          display: grid;
          grid-template-columns: 1fr 180px 120px 100px;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #f3f4f6;
        }
        .id { color: #111827; min-width: 0; overflow-wrap: anywhere; }
        .date { color: #6b7280; }
        .status { justify-self: start; padding: 4px 10px; font-size: 12px; border-radius: 999px; text-transform: capitalize; border: 1px solid #e5e7eb; }
        .status.new { background: #eef2ff; color: #3730a3; border-color: #3730a322; }
        .status.in_progress { background: #fff7ed; color: #9a3412; border-color: #9a341222; }
        .status.ready { background: #ecfeff; color: #155e75; border-color: #155e7522; }
        .status.completed { background: #ecfdf5; color: #065f46; border-color: #065f4622; }
        .status.cancelled { background: #fef2f2; color: #991b1b; border-color: #991b1b22; }
        .total { font-weight: 600; }

        @media (max-width: 760px) {
          .row {
            grid-template-columns: 1fr;
            gap: 4px;
          }
          .date { order: 3; font-size: 13px; }
          .status { order: 2; justify-self: start; }
          .total { order: 4; }
        }
      `}</style>
    </>
  )
}
