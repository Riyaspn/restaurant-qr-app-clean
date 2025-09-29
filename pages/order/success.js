import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
// 1. IMPORT the singleton function
import { getSupabase } from '../../services/supabase'

// 2. REMOVE the supabase prop
export default function OrderSuccess() {
  const router = useRouter()
  // 3. GET the singleton instance
  const supabase = getSupabase();
  const { id: orderId, method } = router.query
  
  // 2. REMOVE the useRequireAuth hook
  // const { checking } = useRequireAuth(supabase)

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [checkingInvoice, setCheckingInvoice] = useState(false)
  const [timer, setTimer] = useState(120)
  const [invoiceArrived, setInvoiceArrived] = useState(false)
  const subscriptionRef = useRef(null)

  // 1. Fetch order & invoice
  useEffect(() => {
    if (!orderId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        // 3. USE the singleton instance
        const { data: o, error: e } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()
        if (e || !o) throw e || new Error('Order not found')

        // 3. USE the singleton instance
        const { data: inv } = await supabase
          .from('invoices')
          .select('*')
          .eq('order_id', orderId)
          .single()
          
        if (!cancelled) {
          setOrder({ ...o, invoice: inv || null })
          if (inv?.pdf_url) setInvoiceArrived(true)
        }
      } catch {
        if (!cancelled) setError('Failed to load order details')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId]) // supabase is no longer a dependency

  // 2. Real-time subscription for invoice arrival
  useEffect(() => {
    if (!orderId) return
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }
    // 3. USE the singleton instance
    const channel = supabase
      .channel(`invoice-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `order_id=eq.${orderId}`,
        },
        ({ new: inv }) => {
          setOrder((prev) => (prev ? { ...prev, invoice: inv } : prev))
          if (inv?.pdf_url) setInvoiceArrived(true)
        }
      )
      .subscribe()
    subscriptionRef.current = channel
    return () => {
      channel.unsubscribe()
    }
  }, [orderId]) // supabase is no longer a dependency

  // 3. Manual invoice check
  const checkForInvoice = async () => {
    if (!orderId || checkingInvoice) return
    setCheckingInvoice(true)
    try {
      // 3. USE the singleton instance
      const { data: inv } = await supabase
        .from('invoices')
        .select('*')
        .eq('order_id', orderId)
        .single()
      if (inv) {
        setOrder((prev) => (prev ? { ...prev, invoice: inv } : prev))
        setInvoiceArrived(Boolean(inv.pdf_url))
      }
    } catch {
      // ignore
    } finally {
      setCheckingInvoice(false)
    }
  }

  // The functions below do not use supabase and need no changes.
  useEffect(() => {
    if (!invoiceArrived) return
    const id = setTimeout(() => {
      router.push('/order/thank-you')
    }, 5000)
    return () => clearTimeout(id)
  }, [invoiceArrived, router])

  useEffect(() => {
    if (invoiceArrived) return
    if (timer <= 0) {
      setTimer(0)
      return
    }
    const id = setTimeout(() => setTimer((t) => t - 1), 1000)
    return () => clearTimeout(id)
  }, [timer, invoiceArrived])

  const handleMore = () => {
    const rId = order?.restaurant_id
    const tNum = order?.table_number
    if (rId && tNum) {
      router.push(`/order?r=${rId}&t=${tNum}`)
    } else {
      router.push('/')
    }
  }

  if (!orderId) return <div style={{ padding: 20 }}>No order found.</div>
  // 2. REMOVE the checking condition
  if (loading) return <div style={{ padding: 20 }}>Loading order details...</div>
  if (error) return <div style={{ padding: 20, color: 'red' }}>{error}</div>

  const invoiceUrl = order.invoice?.pdf_url
  const isCompleted = order.status === 'completed'
  const amount = Number(order.total_inc_tax ?? order.total_amount ?? 0)

  return (
    <div style={{ maxWidth: 600, margin: '3rem auto', padding: '0 1rem', textAlign: 'center' }}>
      <h1>Thank you for your order!</h1>
      <p>Your order #{order.id.slice(0, 8).toUpperCase()} has been placed.</p>
      <p>Payment Method: <strong>{method || order.payment_method}</strong></p>
      <p>Total Amount: <strong>₹{amount.toFixed(2)}</strong></p>

      <div style={{ margin: '20px 0', padding: 16, background: '#f3f4f6', borderRadius: 8 }}>
        <p><strong>Order Status:</strong> {order.status.replace('_', ' ').toUpperCase()}</p>

        {invoiceUrl ? (
          <div>
            <p style={{ color: 'green' }}>✅ Your bill is ready!</p>
            <button
              onClick={() => window.open(invoiceUrl, '_blank')}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: '#059669',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                margin: '10px'
              }}
            >
              📄 View / Download Bill
            </button>
            <p style={{ color: '#6b7280', marginTop: 8 }}>
              Redirecting to thank-you page shortly…
            </p>
          </div>
        ) : isCompleted ? (
          <div>
            <p style={{ color: '#f59e0b' }}>Bill is being generated…</p>
            <button
              onClick={checkForInvoice}
              disabled={checkingInvoice}
              style={{
                padding: '8px 16px',
                background: '#f59e0b',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: checkingInvoice ? 'not-allowed' : 'pointer',
                opacity: checkingInvoice ? 0.6 : 1
              }}
            >
              {checkingInvoice ? 'Checking…' : 'Check for Bill'}
            </button>
            <p style={{ marginTop: 20, color: '#6b7280' }}>
              If your bill does not appear, please wait or refresh.
            </p>
          </div>
        ) : (
          <p style={{ color: '#6b7280' }}>
            Your bill will be available once the restaurant completes the order.
          </p>
        )}

        {!invoiceArrived && (
          <p style={{ marginTop: 20, color: '#6b7280' }}>
            Window closes in {timer} second{timer !== 1 ? 's' : ''}.
          </p>
        )}
      </div>

      <button
        onClick={handleMore}
        style={{
          padding: '12px 24px',
          background: '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer'
        }}
      >
        Order More Items
      </button>
    </div>
  )
}
