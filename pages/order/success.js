// pages/order/success.js

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

export default function OrderSuccess() {
  const { query } = useRouter()
  const orderId = typeof query.id === 'string' ? query.id : undefined

  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (orderId) loadOrder()
  }, [orderId])

  const log = (...args) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args)
  }

  const loadOrder = async () => {
    setLoading(true)
    setErrMsg('')
    try {
      if (!orderId) {
        setErrMsg('Missing order id in URL')
        setOrder(null)
        return
      }

      const { data: rows, error: selError } = await supabase
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

      log('Order fetch result:', { rows, selError })

      if (selError) {
        setErrMsg(`Query failed: ${selError.message}`)
        setOrder(null)
        return
      }

      if (!rows || rows.length === 0) {
        setErrMsg('No order matches this ID')
        setOrder(null)
        return
      }

      const base = rows[0]

      let restaurantName = 'Restaurant'
      if (base.restaurant_id) {
        const { data: restRows, error: restError } = await supabase
          .from('restaurants')
          .select('name')
          .eq('id', base.restaurant_id)
          .limit(1)

        log('Restaurant fetch:', { restRows, restError })

        if (!restError && Array.isArray(restRows) && restRows[0]?.name) {
          restaurantName = restRows.name
        }
      }

      setOrder({ ...base, restaurant_name: restaurantName })
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') console.error('Load order error:', e)
      setErrMsg('Unexpected error loading order')
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
        {errMsg && <p style={{ color: '#ef4444' }}>{errMsg}</p>}
        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none' }}>Go Home</Link>
      </div>
    )
  }

  const paidOnline = order.payment_status === 'completed'

  return (
    <div style={{ padding: 20 }}>
      <h1>Thank you, your order is placed!</h1>
      <p>Restaurant: <strong>{order.restaurant_name}</strong></p>
      <p>Table: <strong>{order.table_number}</strong></p>

      <div style={{ marginTop: 20, padding: 20, background: '#f5f5f5', borderRadius: 6 }}>
        <h2>Order Summary</h2>
        <p>Order ID: <strong>{order.id}</strong></p>
        <p>Placed At: <strong>{new Date(order.created_at).toLocaleString()}</strong></p>
        <p>Subtotal: ₹{Number(order.subtotal).toFixed(2)}</p>
        <p>Tax: ₹{Number(order.tax).toFixed(2)}</p>
        <p><strong>Total: ₹{Number(order.total_amount).toFixed(2)}</strong></p>
      </div>

      {paidOnline ? (
        <Link
          href={`/order/bill/${order.id}`}
          style={{ display: 'inline-block', marginTop: 20, padding: '12px 24px', background: '#3b82f6', color: '#fff', borderRadius: 6, textDecoration: 'none' }}
        >
          View / Download Bill
        </Link>
      ) : (
        <div style={{ marginTop: 20, padding: 20, background: '#fff', borderRadius: 6 }}>
          <p>Your payment is pending. Please collect and pay at the counter.</p>
        </div>
      )}

      <Link
        href={`/order?r=${order.restaurant_id}&t=${order.table_number}`}
        style={{ display: 'inline-block', marginTop: 40, padding: '12px 24px', background: '#fff', color: '#3b82f6', border: '1px solid #e5e7eb', borderRadius: 6, textDecoration: 'none' }}
      >
        🍽️ Back to Menu
      </Link>
    </div>
  )
}
