// pages/order/success.js
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function OrderSuccess() {
  const router = useRouter()
  const { id: orderId, method } = router.query

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [checkingInvoice, setCheckingInvoice] = useState(false)
  const [timer, setTimer] = useState(120) // countdown in seconds
  const channelRef = useRef(null)

  // Initial fetch of order and invoice
  useEffect(() => {
    if (!orderId) return
    let cancelled = false

    async function fetchData() {
      setLoading(true)
      try {
        const { data: orderData, error: orderErr } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()
        if (orderErr || !orderData) throw orderErr || new Error('Order not found')

        const { data: invoiceData } = await supabase
          .from('invoices')
          .select('*')
          .eq('order_id', orderId)
          .single()

        if (!cancelled) {
          setOrder({ ...orderData, invoice: invoiceData || null })
        }
      } catch (e) {
        if (!cancelled) setError('Failed to load order details')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [orderId])

  // Realtime subscription to invoice changes
  useEffect(() => {
    if (!orderId) return

    // Unsubscribe if exists
    if (channelRef.current) {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }

    const channel = supabase
      .channel(`order-invoice-${orderId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'invoices',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const inv = payload.new
          setOrder(prev => prev ? { ...prev, invoice: inv } : prev)
        }
      })
      .subscribe()

    channelRef.current = channel
    return () => {
      channelRef.current.unsubscribe()
      channelRef.current = null
    }
  }, [orderId])

  // Manual invoice check
  const checkForInvoice = async () => {
    if (!orderId || checkingInvoice) return
    setCheckingInvoice(true)
    try {
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .single()
      if (inv) setOrder(prev => prev ? { ...prev, invoice: inv } : prev)
    } catch {
      // ignore
    } finally {
      setCheckingInvoice(false)
    }
  }

  // Countdown timer and auto-close logic
  useEffect(() => {
    if (timer <= 0) {
      window.close()
      window.location.href = 'pages/order/thank-you'
      return
    }
    const id = setTimeout(() => setTimer(timer - 1), 1000)
    return () => clearTimeout(id)
  }, [timer])

  if (!orderId) return <div style={{ padding: 20 }}>No order found.</div>
  if (loading) return <div style={{ padding: 20 }}>Loading order details...</div>
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>

  const invoiceUrl = order?.invoice?.pdf_url || null
  const isCompleted = order?.status === 'completed'
  const amount = Number(order?.total_inc_tax ?? order?.total_amount ?? 0)

  return (
    <div style={{ maxWidth: 600, margin: '3rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1>Thank you for your order!</h1>
      <p>Your order #{order.id.slice(0, 8).toUpperCase()} has been successfully placed.</p>
      <p>Payment Method: <strong>{method || order.payment_method}</strong></p>
      <p>Total Amount: <strong>₹{amount.toFixed(2)}</strong></p>

      <div style={{ margin: '20px 0', padding: '16px', background: '#f3f4f6', borderRadius: '8px' }}>
        <p><strong>Order Status:</strong> {order.status?.replace('_', ' ').toUpperCase()}</p>

        {invoiceUrl ? (
          <div>
            <p style={{ color: 'green', margin: '10px 0' }}>✅ Your bill is ready!</p>
            <a
              href={invoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#059669',
                color: '#fff',
                borderRadius: 8,
                textDecoration: 'none',
                margin: '10px'
              }}
            >
              📄 View / Download Bill
            </a>
          </div>
        ) : isCompleted ? (
          <div>
            <p style={{ color: '#f59e0b', margin: '6px 0' }}>Bill is being generated…</p>
            <button
              onClick={checkForInvoice}
              disabled={checkingInvoice}
              style={{
                padding: '8px 16px',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: checkingInvoice ? 'not-allowed' : 'pointer',
                opacity: checkingInvoice ? 0.6 : 1
              }}
            >
              {checkingInvoice ? 'Checking…' : 'Check for Bill'}
            </button>
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>Your bill will be available once the order is marked completed and payment is confirmed.</p>
        )}

        <p style={{ marginTop: 20, color: '#6b7280' }}>
          This window will close in {timer} second{timer !== 1 ? 's' : ''}.
        </p>
      </div>

      <button
        onClick={() => {
          const rId = typeof window !== 'undefined' && localStorage.getItem('restaurantId')
          const tNum = typeof window !== 'undefined' && localStorage.getItem('tableNumber')
          if (rId && tNum) router.push(`/order?r=${rId}&t=${tNum}`)
          else router.push('/')
        }}
        style={{
          padding: '12px 24px',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          marginTop: '20px'
        }}
      >
        Order More Items
      </button>
    </div>
  )
}
