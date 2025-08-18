// pages/orders.js
import { useEffect, useState } from 'react'
import Shell from '../components/Shell'
import Alert from '../components/Alert'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../services/supabase'

const COLUMNS = ['new', 'in_progress', 'ready', 'completed']

export default function OrdersPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: loadingRestaurant } = useRestaurant()
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCancelled, setShowCancelled] = useState(false)

  useEffect(() => {
    if (!restaurant?.id) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('orders')
        .select('id, table_number, status, total, created_at, items')
        .eq('restaurant_id', restaurant.id)
        .order('created_at', { ascending: false })
      setLoading(false)
      if (error) setError(error.message)
      else setOrders(data || [])
    }
    load()
  }, [restaurant?.id])

  const move = async (id, nextStatus) => {
    const prev = orders.find(o => o.id === id)?.status
    setOrders(list => list.map(o => (o.id === id ? { ...o, status: nextStatus } : o)))
    const { error } = await supabase
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
    if (error) {
      setError(error.message)
      setOrders(list => list.map(o => (o.id === id ? { ...o, status: prev } : o)))
    }
  }

  if (checking || loadingRestaurant) return <Shell><p>Loading…</p></Shell>

  const cancelled = orders.filter(o => o.status === 'cancelled')

  return (
    <Shell>
      <h1>Orders</h1>
      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <p>Loading orders…</p>
      ) : (
        <>
          <div className="columns-5">
            {COLUMNS.map(col => (
              <Column
                key={col}
                title={col.replaceAll('_', ' ')}
                items={orders.filter(o => o.status === col)}
                onMove={move}
              />
            ))}
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0 }}>Cancelled ({cancelled.length})</h3>
              <button onClick={() => setShowCancelled(v => !v)}>
                {showCancelled ? 'Hide' : 'View'}
              </button>
            </div>
            {showCancelled && (
              <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
                {cancelled.length === 0 ? (
                  <p style={{ color: '#666' }}>No cancelled orders.</p>
                ) : (
                  cancelled.map(o => (
                    <div key={o.id} className="card" style={{ padding: 10 }}>
                      <div><strong>Table:</strong> {o.table_number}</div>
                      <div><strong>Total:</strong> ₹{Number(o.total || 0).toFixed(2)}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </Shell>
  )
}

function Column({ title, items, onMove }) {
  return (
    <div className="card" style={{ minHeight: 220 }}>
      <h3 style={{ marginTop: 0, textTransform: 'capitalize' }}>{title}</h3>

      {items.length === 0 ? (
        <p style={{ color: '#666' }}>No orders</p>
      ) : (
        items.map(o => (
          <div key={o.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 8, marginBottom: 8 }}>
            <div><strong>Table:</strong> {o.table_number}</div>
            <div><strong>Total:</strong> ₹{Number(o.total || 0).toFixed(2)}</div>

            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {title !== 'in progress' && (
                <button onClick={() => onMove(o.id, 'in_progress')}>Start</button>
              )}
              {title !== 'ready' && (
                <button onClick={() => onMove(o.id, 'ready')}>Ready</button>
              )}
              {title !== 'completed' && (
                <button onClick={() => onMove(o.id, 'completed')}>Done</button>
              )}
              {title !== 'cancelled' && (
                <button onClick={() => onMove(o.id, 'cancelled')}>Cancel</button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
