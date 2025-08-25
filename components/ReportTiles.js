// components/ReportTiles.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/ownerApi'

export default function ReportTiles({ restaurantId }) {
  const [stats, setStats] = useState({
    liveOrders: 0,
    revenueToday: 0,
    avgTicket: 0,
    outOfStock: 0
  })

  useEffect(() => {
    fetchOverview()
  }, [restaurantId])

  async function fetchOverview() {
    const today = new Date(); today.setHours(0,0,0,0)
    const iso = today.toISOString()

    const [{ count: liveCount }] = await supabase
      .from('orders').select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'new')
    const revenueRows = await supabase
      .from('orders').select('total_amount')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', iso)
    const revenue = revenueRows.data.reduce((s, o) => s + Number(o.total_amount||0), 0)
    const avg = revenueRows.data.length ? revenue/revenueRows.data.length : 0
    const [{ count: oosCount }] = await supabase
      .from('menu_items').select('id', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', 'out_of_stock')

    setStats({
      liveOrders: liveCount||0,
      revenueToday: revenue,
      avgTicket: avg,
      outOfStock: oosCount||0
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', gap: 16, padding: 16 }}>
      {[
        { label: 'Live Orders', value: stats.liveOrders },
        { label: 'Revenue Today', value: `₹${stats.revenueToday.toFixed(2)}` },
        { label: 'Avg Ticket', value: `₹${stats.avgTicket.toFixed(2)}` },
        { label: 'Out of Stock', value: stats.outOfStock }
      ].map((tile) => (
        <div key={tile.label} style={{ background: '#fff', padding: 16, borderRadius: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#6b7280' }}>{tile.label}</div>
          <div style={{ fontSize: 24, fontWeight: 600 }}>{tile.value}</div>
        </div>
      ))}
    </div>
  )
}
