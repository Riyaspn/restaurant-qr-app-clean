import React, { useEffect, useState } from 'react'
import { useRequireAuth } from '../../lib/useRequireAuth'
import { useRestaurant } from '../../context/RestaurantContext'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import DateRangePicker from '../../components/ui/DateRangePicker'
import { getSupabase } from '../../services/supabase'

export default function SalesPage() {
  const supabase = getSupabase()
  const { checking } = useRequireAuth(supabase)
  const { restaurant, loading: restLoading } = useRestaurant()
  const restaurantId = restaurant?.id || ''

  const [range, setRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)),
    end: new Date()
  })
  const [salesData, setSalesData] = useState([])
  const [totals, setTotals] = useState({
    totalQuantity: 0,
    totalRevenue: 0,
    totalOrders: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (checking || restLoading || !restaurantId || !supabase) return
    loadSalesData()
  }, [checking, restLoading, restaurantId, range, supabase])

  const loadSalesData = async () => {
    if (!supabase) return
    setLoading(true)
    setError('')
    try {
      // Fetch orders data exactly like analytics page
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, total_amount, total_inc_tax, created_at, status, items')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', range.start.toISOString())
        .lte('created_at', range.end.toISOString())
        .neq('status', 'cancelled')

      if (ordersError) throw ordersError
      const orderData = Array.isArray(orders) ? orders : []

      // Calculate totals
      const totalOrders = orderData.length
      const totalRevenue = orderData.reduce((sum, o) =>
        sum + Number(o.total_inc_tax ?? o.total_amount ?? 0), 0)

      // Process items data exactly like analytics
      const itemCounts = {}
      const itemRevenue = {}
      let totalQuantity = 0

      orderData.forEach(o => {
        if (Array.isArray(o.items)) {
          o.items.forEach(item => {
            const name = item.name || 'Unknown Item'
            const quantity = Number(item.quantity) || 1
            const price = Number(item.price) || 0
            const itemTotal = quantity * price

            itemCounts[name] = (itemCounts[name] || 0) + quantity
            itemRevenue[name] = (itemRevenue[name] || 0) + itemTotal
            totalQuantity += quantity
          })
        }
      })

      // Convert to array format for table
      const salesArray = Object.entries(itemCounts)
        .map(([name, quantity]) => ({
          item_name: name,
          quantity_sold: quantity,
          revenue: itemRevenue[name] || 0
        }))
        .sort((a, b) => b.quantity_sold - a.quantity_sold)

      setSalesData(salesArray)
      setTotals({
        totalQuantity,
        totalRevenue,
        totalOrders
      })
    } catch (err) {
      setError(err.message || 'Failed to load sales data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (n) => `₹${Number(n).toFixed(2)}`

  if (checking || restLoading) return <div style={{ padding: 24 }}>Loading…</div>
  if (!restaurantId) return <div style={{ padding: 24 }}>No restaurant selected</div>

  return (
    <div className="sales-page">
      <div className="header">
        <h1>Sales Report</h1>
        <div className="controls">
          <DateRangePicker
            start={range.start}
            end={range.end}
            onChange={setRange}
          />
        </div>
      </div>

      {error && (
        <Card style={{ marginBottom: 16, borderColor: '#fecaca', background: '#fff1f2' }}>
          <div style={{ color: '#b91c1c' }}>{error}</div>
        </Card>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>Loading sales…</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="totals-grid">
            <Card className="total-card">
              <div className="label">Total Orders</div>
              <div className="value">{totals.totalOrders}</div>
            </Card>
            <Card className="total-card">
              <div className="label">Total Items Sold</div>
              <div className="value">{totals.totalQuantity}</div>
            </Card>
            <Card className="total-card">
              <div className="label">Total Revenue</div>
              <div className="value">{formatCurrency(totals.totalRevenue)}</div>
            </Card>
          </div>

          {/* Sales Table */}
          <Card style={{ marginTop: 24 }}>
            <h3 style={{ margin: '0 0 16px 0', padding: '0 16px', paddingTop: '16px' }}>Item-wise Sales</h3>
            <Table
              columns={[
                { header: 'Item Name', accessor: 'item_name' },
                { header: 'Quantity Sold', accessor: 'quantity_sold' },
                { 
                  header: 'Revenue', 
                  accessor: 'revenue',
                  cell: (row) => formatCurrency(row.revenue)
                }
              ]}
              data={salesData}
            />
            {salesData.length === 0 && (
              <div style={{ padding: 24, color: '#666', textAlign: 'center' }}>
                No sales in selected date range.
              </div>
            )}
          </Card>
        </>
      )}

      <style jsx>{`
        .sales-page { max-width: 1000px; margin: 0 auto; padding: 1rem; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .controls { display: flex; gap: 10px; }
        .totals-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
          gap: 16px; 
          margin-bottom: 24px; 
        }
        .total-card { 
          text-align: center; 
          padding: 20px; 
        }
        .label { 
          font-size: 14px; 
          color: #6b7280; 
          margin-bottom: 8px; 
        }
        .value { 
          font-size: 28px; 
          font-weight: 700; 
          color: #111827; 
        }
        @media (max-width: 600px) {
          .header { flex-direction: column; gap: 16px; }
          .totals-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  )
}
