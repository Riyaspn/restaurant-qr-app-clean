// pages/owner/analytics.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import { useRequireAuth } from '../../lib/useRequireAuth'
import { useRestaurant } from '../../context/RestaurantContext'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

export default function AnalyticsPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: restLoading } = useRestaurant()

  const [timeRange, setTimeRange] = useState('today')
  const [stats, setStats] = useState({
    orders: 0,
    revenue: 0,
    avgOrderValue: 0,
    topItems: [],
    hourlyData: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const restaurantId = restaurant?.id || ''

  useEffect(() => {
    if (checking || restLoading || !restaurantId) return
    loadAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checking, restLoading, restaurantId, timeRange])

  const loadAnalytics = async () => {
    setLoading(true)
    setError('')
    try {
      const { start, end } = getDateRange(timeRange)

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, total_inc_tax, created_at, status, items')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .neq('status', 'cancelled')

      if (ordersError) throw ordersError
      const orderData = Array.isArray(orders) ? orders : []

      const totalOrders = orderData.length
      // Prefer total_inc_tax (new column), fallback to total_amount
      const totalRevenue = orderData.reduce((sum, o) =>
        sum + Number(o.total_inc_tax ?? o.total_amount ?? 0), 0)
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

      // Top items from compact JSON (fallback); if not present you can join order_items
      const itemCounts = {}
      orderData.forEach(o => {
        if (Array.isArray(o.items)) {
          o.items.forEach(it => {
            const name = it.name || 'Unknown Item'
            itemCounts[name] = (itemCounts[name] || 0) + (Number(it.quantity) || 1)
          })
        }
      })
      const topItems = Object.entries(itemCounts)
        .sort(([,a],[,b]) => b - a).slice(0, 5)
        .map(([name, quantity]) => ({ name, quantity }))

      const hourlyData = generateHourlyData(orderData, timeRange === 'today')

      setStats({ orders: totalOrders, revenue: totalRevenue, avgOrderValue, topItems, hourlyData })
    } catch (e) {
      setError(e.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const getDateRange = (range) => {
    const now = new Date()
    const start = new Date()
    switch (range) {
      case 'today': start.setHours(0,0,0,0); return { start, end: now }
      case 'week':  start.setDate(now.getDate() - 7); return { start, end: now }
      case 'month': start.setDate(now.getDate() - 30); return { start, end: now }
      default:      start.setHours(0,0,0,0); return { start, end: now }
    }
  }

  const generateHourlyData = (orders, isToday) => {
    if (!isToday) return []
    const hourlyRevenue = new Array(24).fill(0)
    orders.forEach(o => {
      const hour = new Date(o.created_at).getHours()
      hourlyRevenue[hour] += Number(o.total_inc_tax ?? o.total_amount ?? 0)
    })
    return hourlyRevenue.map((revenue, hour) => ({
      hour: `${hour.toString().padStart(2,'0')}:00`,
      revenue: Math.round(revenue),
    }))
  }

  const formatCurrency = (n) => `₹${Number(n).toFixed(2)}`

  if (checking || restLoading) return <div style={{ padding: 24 }}>Loading…</div>
  if (!restaurantId) return <div style={{ padding: 24 }}>No restaurant found</div>

  return (
    <>
      <div className="analytics-page">
        <div className="page-header">
          <div>
            <h1>Analytics</h1>
            <p className="subtitle">Track your restaurant's performance</p>
          </div>
          <div className="time-filters">
            <Button variant={timeRange === 'today' ? 'primary' : 'outline'} onClick={() => setTimeRange('today')}>Today</Button>
            <Button variant={timeRange === 'week' ? 'primary' : 'outline'} onClick={() => setTimeRange('week')}>7 Days</Button>
            <Button variant={timeRange === 'month' ? 'primary' : 'outline'} onClick={() => setTimeRange('month')}>30 Days</Button>
          </div>
        </div>

        {error && (
          <Card padding="12px" style={{ marginBottom: 16, borderColor: '#fecaca', background: '#fff1f2' }}>
            <div style={{ color: '#b91c1c' }}>{error}</div>
          </Card>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading analytics…</div>
        ) : (
          <>
            <div className="kpi-grid">
              <Card padding="20px" className="kpi-card">
                <div className="kpi-label">Total Orders</div>
                <div className="kpi-value">{stats.orders}</div>
              </Card>
              <Card padding="20px" className="kpi-card">
                <div className="kpi-label">Revenue</div>
                <div className="kpi-value">{formatCurrency(stats.revenue)}</div>
              </Card>
              <Card padding="20px" className="kpi-card">
                <div className="kpi-label">Avg Order Value</div>
                <div className="kpi-value">{formatCurrency(stats.avgOrderValue)}</div>
              </Card>
            </div>

            <div className="charts-grid">
              <Card padding="20px" className="chart-card">
                <h3 className="chart-title">Top Items</h3>
                {stats.topItems.length === 0 ? (
                  <div className="empty-chart">No data available</div>
                ) : (
                  <div className="top-items-list">
                    {stats.topItems.map((item, index) => (
                      <div key={item.name} className="top-item">
                        <div className="item-rank">#{index + 1}</div>
                        <div className="item-info">
                          <div className="item-name">{item.name}</div>
                          <div className="item-quantity">{item.quantity} orders</div>
                        </div>
                        <div className="item-bar-container">
                          <div className="item-bar" style={{ width: `${(item.quantity / stats.topItems[0].quantity) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {timeRange === 'today' && (
                <Card padding="20px" className="chart-card">
                  <h3 className="chart-title">Hourly Revenue</h3>
                  {stats.hourlyData.length === 0 || stats.hourlyData.every(d => d.revenue === 0) ? (
                    <div className="empty-chart">No orders today</div>
                  ) : (
                    <div className="hourly-chart">
                      {stats.hourlyData.filter(d => d.revenue > 0).slice(0, 12).map(d => (
                        <div key={d.hour} className="hour-bar">
                          <div className="hour-label">{d.hour}</div>
                          <div className="revenue-amount">₹{d.revenue}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </div>

            <Card padding="20px" style={{ marginTop: 20 }}>
              <h3 style={{ marginTop: 0, color: '#6b7280' }}>Coming Soon</h3>
              <div style={{ color: '#9ca3af', fontSize: 14 }}>
                • Sales trend charts<br/>
                • Peak hours heatmap<br/>
                • HSN- and tax-slab-wise summaries<br/>
                • Order completion times<br/>
                • Revenue forecasting
              </div>
            </Card>
          </>
        )}
      </div>

      <style jsx>{`
        .analytics-page { max-width: 1200px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .page-header h1 { margin: 0; font-size: 2rem; }
        .subtitle { color: #6b7280; margin: 4px 0 0 0; }
        .time-filters { display: flex; gap: 8px; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .kpi-card { text-align: center; }
        .kpi-label { color: #6b7280; font-size: 14px; margin-bottom: 8px; }
        .kpi-value { font-size: 32px; font-weight: 800; color: #111827; }
        .charts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 16px; }
        .chart-card { min-height: 300px; }
        .chart-title { margin: 0 0 20px 0; font-size: 18px; font-weight: 600; }
        .empty-chart { display: flex; align-items: center; justify-content: center; height: 200px; color: #9ca3af; }
        .top-items-list { display: flex; flex-direction: column; gap: 12px; }
        .top-item { display: grid; grid-template-columns: 30px 1fr 100px; gap: 12px; align-items: center; }
        .item-rank { font-weight: 700; color: #f97316; }
        .item-name { font-weight: 500; }
        .item-quantity { font-size: 12px; color: #6b7280; }
        .item-bar-container { position: relative; height: 8px; background: #f3f4f6; border-radius: 4px; }
        .item-bar { height: 100%; background: #f97316; border-radius: 4px; }
        .hourly-chart { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; }
        .hour-bar { text-align: center; }
        .hour-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
        .revenue-amount { font-size: 14px; font-weight: 600; color: #111827; }
        @media (max-width: 768px) {
          .page-header { flex-direction: column; gap: 16px; align-items: stretch; }
          .time-filters { justify-content: center; }
          .charts-grid { grid-template-columns: 1fr; }
          .kpi-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  )
}
