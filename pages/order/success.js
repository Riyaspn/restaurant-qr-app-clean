/* eslint-disable react-hooks/exhaustive-deps */
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

export default function OrderSuccess() {
  const { query } = useRouter()
  const { id: orderId } = query

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    setLoading(true)
    try {
      // 1) Fetch the order record (anonymous SELECT policy must allow this)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          subtotal,
          tax,
          total_amount,
          payment_status,
          payment_method,
          restaurant_id,
          table_number
        `)
        .eq('id', orderId)
        .single()

      if (orderError) throw orderError

      // 2) Fetch the restaurant name separately
      const { data: restData, error: restError } = await supabase
        .from('restaurants')
        .select('name')
        .eq('id', orderData.restaurant_id)
        .single()

      if (restError) throw restError

      // 3) Combine and set
      setOrder({
        ...orderData,
        restaurant_name: restData.name
      })
    } catch (e) {
      console.error('Failed to load order:', e)
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading order...</div>
  }

  if (!order) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Order not found</h2>
        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Go Home</Link>
      </div>
    )
  }

  const paidOnline = order.payment_status === 'completed'

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: 20, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>Thank you, your order is placed!</h1>
        <p style={{ marginTop: 8 }}>
          Restaurant: <strong>{order.restaurant_name}</strong> | Table: <strong>{order.table_number}</strong>
        </p>
      </header>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <h2 style={{ marginTop: 0 }}>Order Summary</h2>
        <p>Order ID: <strong>{order.id}</strong></p>
        <p>Placed At: <strong>{new Date(order.created_at).toLocaleString()}</strong></p>
        <p>Subtotal: ₹{Number(order.subtotal || 0).toFixed(2)}</p>
        <p>Tax: ₹{Number(order.tax || 0).toFixed(2)}</p>
        <p><strong>Total: ₹{Number(order.total_amount || 0).toFixed(2)}</strong></p>
      </div>

      {paidOnline ? (
        <div style={{ marginTop: 20 }}>
          <Link
            href={`/order/bill/${order.id}`}
            style={{
              display: 'inline-block',
              background: '#3b82f6',
              color: '#fff',
              padding: '12px 24px',
              borderRadius: 6,
              textDecoration: 'none'
            }}
          >
            View / Download Bill
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 20, padding: 20, background: '#fff', borderRadius: 8 }}>
          <p style={{ margin: 0 }}>Your payment is pending. Please collect and pay the bill at the counter.</p>
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <Link
          href={`/order?r=${order.restaurant_id || ''}&t=${order.table_number || 1}`}
          style={{
            display: 'inline-block',
            color: '#3b82f6',
            background: '#fff',
            border: '1px solid #e5e7eb',
            padding: '12px 24px',
            borderRadius: 6,
            textDecoration: 'none'
          }}
        >
          🍽️ Back to Menu
        </Link>
      </div>
    </div>
  )
}
