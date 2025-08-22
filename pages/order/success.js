/* eslint-disable react-hooks/exhaustive-deps */
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

export default function OrderSuccess() {
  const { query } = useRouter()
  const { id: orderId, method } = query
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (orderId) loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, created_at, subtotal, tax, total_amount,
          payment_status, payment_method,
          restaurant_name, table_number
        `)
        .eq('id', orderId)
        .single()
      setOrder(data)
    } catch (e) {
      console.error(e)
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
        <Link href="/">Go Home</Link>
      </div>
    )
  }

  const paidOnline = order.payment_status === 'completed'

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', padding: 20, fontFamily: 'sans-serif' }}>
      <header style={{ marginBottom: 20 }}>
        <h1>Thank you, your order is placed!</h1>
        <p>
          Restaurant: <strong>{order.restaurant_name}</strong> | Table: <strong>{order.table_number}</strong>
        </p>
      </header>

      <div style={{ background: '#fff', padding: 20, borderRadius: 8 }}>
        <h2>Order Summary</h2>
        <p>Order ID: <strong>{order.id}</strong></p>
        <p>Placed At: <strong>{new Date(order.created_at).toLocaleString()}</strong></p>
        <p>Subtotal: ₹{order.subtotal.toFixed(2)}</p>
        <p>Tax: ₹{order.tax.toFixed(2)}</p>
        <p><strong>Total: ₹{order.total_amount.toFixed(2)}</strong></p>
      </div>

      {paidOnline ? (
        <div style={{ marginTop: 20 }}>
          <Link href={`/order/bill/${order.id}`} style={{ display: 'inline-block', background: '#3b82f6', color: '#fff', padding: '12px 24px', borderRadius: 6, textDecoration: 'none' }} > View / Download Bill </Link>
        </div>
      ) : (
        <div style={{ marginTop: 20, padding: 20, background: '#fff', borderRadius: 8 }}>
          <p>Your payment is pending. Please collect and pay the bill at the counter.</p>
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <Link href="/" style={{ color: '#3b82f6' }}>🏠 Back to Home</Link>
      </div>
    </div>
  )
}
