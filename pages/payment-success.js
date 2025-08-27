import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PaymentSuccess() {
  const router = useRouter()
  const { order_id, payment_session_id } = router.query
  const [status, setStatus] = useState('checking')
  const [message, setMessage] = useState('Verifying payment status...')

  // Helper to strip curly braces { and } from param if present
  const sanitizeParam = (param) => param?.replace(/^{|}$/g, '')

  useEffect(() => {
    const cleanOrderId = sanitizeParam(order_id)
    const cleanPaymentSessionId = sanitizeParam(payment_session_id)

    if (cleanOrderId && cleanPaymentSessionId) {
      verifyPayment(cleanOrderId, cleanPaymentSessionId)
    } else {
      setMessage('Missing payment identifiers, unable to verify payment.')
      setStatus('error')
    }
  }, [order_id, payment_session_id])

  const verifyPayment = async (cleanOrderId, cleanPaymentSessionId) => {
    try {
      const res = await fetch('/api/payments/verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: cleanOrderId, payment_session_id: cleanPaymentSessionId })
      })
      if (!res.ok) {
        throw new Error(`Verification failed (${res.status})`)
      }
      const { order_status } = await res.json()
      if (order_status === 'PAID') {
        setStatus('success')
        setMessage('✅ Payment Successful!')
      } else {
        setStatus('failed')
        setMessage(`Payment status: ${order_status}`)
      }
    } catch (err) {
      setStatus('error')
      setMessage(`Error verifying payment: ${err.message}`)
    }
  }

  const handleReturnToMenu = () => {
    const restaurantId = localStorage.getItem('restaurantId')
    const tableNumber = localStorage.getItem('tableNumber')
    if (restaurantId && tableNumber) {
      router.push(`/order?r=${restaurantId}&t=${tableNumber}`)
    } else {
      router.push('/')
    }
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Payment Status</h1>
      {status === 'checking' && <p>{message}</p>}
      {(status === 'success' || status === 'failed') && (
        <div>
          <h2 style={{ color: status === 'success' ? 'green' : 'red' }}>
            {message}
          </h2>
          <p>Order ID: {sanitizeParam(order_id)}</p>
          <button onClick={handleReturnToMenu}>Return to Menu</button>
        </div>
      )}
      {status === 'error' && (
        <div>
          <h2 style={{ color: 'crimson' }}>⚠️ {message}</h2>
          <button onClick={handleReturnToMenu}>Return to Menu</button>
        </div>
      )}
    </div>
  )
}
