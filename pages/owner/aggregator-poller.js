import React, { useState } from 'react'
import Button from '../../components/ui/Button'

export default function AggregatorPoller() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const pollOrders = async (source) => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/${source}/poll`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setResult(data.orders || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h3>Aggregator Order Polling</h3>
      <Button onClick={() => pollOrders('swiggy')} disabled={loading}>Poll Swiggy Orders</Button>
      <Button onClick={() => pollOrders('zomato')} disabled={loading} style={{ marginLeft: 10 }}>Poll Zomato Orders</Button>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {result && (
        <ul>
          {result.map(order => (
            <li key={order.order_id}>
              #{order.order_id} - ₹{order.total_amount} - {order.payment_status}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
