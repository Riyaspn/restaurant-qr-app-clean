// components/OrdersBoard.js
import React, { useEffect, useState } from 'react'
import Card from './ui/Card'
import OrderCard from './OrderCard'
import { supabase } from '../services/supabase'

const STATUSES = ['new', 'in_progress', 'ready', 'completed', 'cancelled']
const DEFAULT_BUCKETS = { new: [], in_progress: [], ready: [], completed: [], cancelled: [] }
const PAGE = 20

export default function OrdersBoard({ restaurantId }) {
  const [orders, setOrders] = useState(DEFAULT_BUCKETS)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) return
    let cancel = false
    const load = async () => {
      setLoading(true); setError('')
      try {
        const buckets = { ...DEFAULT_BUCKETS }

        const fetchBucket = async (status) => {
          const base = supabase.from('orders').select('*').eq('restaurant_id', restaurantId).eq('status', status)
          if (status === 'completed') {
            // Newest first by created_at
            const { data, error } = await base
              .order('created_at', { ascending: false })
              .order('id', { ascending: false })
              .range(0, PAGE - 1)
            if (error) throw error
            buckets.completed = data || []
          } else {
            const { data, error } = await base
              .order('created_at', { ascending: true })
              .order('id', { ascending: true })
            if (error) throw error
            buckets[status] = data || []
          }
        }

        await Promise.all(['new','in_progress','ready','completed','cancelled'].map(fetchBucket))
        if (!cancel) setOrders(buckets)
      } catch (e) {
        if (!cancel) {
          setError(e.message || 'Failed to load orders')
          setOrders(DEFAULT_BUCKETS)
        }
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    load()
    return () => { cancel = true }
  }, [restaurantId])

  const updateStatus = async (order, next) => {
    if (!STATUSES.includes(next)) return
    const id = order.id
    setOrders((prev) => {
      const copy = { ...DEFAULT_BUCKETS }
      STATUSES.forEach((s) => { copy[s] = prev[s].filter((o) => o.id !== id) })
      const updated = { ...order, status: next }
      copy[next] = [updated, ...copy[next]]
      return copy
    })
    const { error } = await supabase.from('orders').update({ status: next }).eq('id', id)
    if (error) {
      const { data } = await supabase.from('orders').select('*').eq('restaurant_id', restaurantId)
      const rows = Array.isArray(data) ? data : []
      const grouped = { ...DEFAULT_BUCKETS }
      rows.forEach((o) => {
        const key = STATUSES.includes(String(o.status)) ? String(o.status) : 'new'
        grouped[key].push(o)
      })
      grouped.completed.sort((a, b) => {
        const tb = new Date(b.created_at).getTime()
        const ta = new Date(a.created_at).getTime()
        if (tb !== ta) return tb - ta
        return String(b.id).localeCompare(String(a.id))
      })
      grouped.completed = grouped.completed.slice(0, PAGE)
      setOrders(grouped)
    }
  }

  return (
    <div>
      {error && <div style={{ color: 'red', padding: 8 }}>{error}</div>}
      {loading ? (
        <div style={{ padding: 16 }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 16 }}>
          {['new','in_progress','ready','completed'].map((status) => (
            <Card key={status} padding={12}>
              <div style={{ fontWeight: 700, marginBottom: 8, textTransform: 'capitalize' }}>{status.replace('_',' ')}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '70vh', overflow: 'auto' }}>
                {(orders[status] || []).map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    status={status}
                    onStatusChange={(id, next) => updateStatus(o, next)}
                    onClick={() => {}}
                  />
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
