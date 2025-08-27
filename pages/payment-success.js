// pages/payment-success.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PaymentSuccess() {
  const router = useRouter()
  const { order_id, payment_session_id } = router.query
  const [status, setStatus] = useState('checking')
  const [message, setMessage] = useState('Verifying payment status...')

  useEffect(() => {
    if (order_id && payment_session_id) {
      verifyPayment()
    } else {
      setMessage('Missing payment identifiers, unable to verify payment.')
      setStatus('error')
    }
  }, [order_id, payment_session_id])

  const verifyPayment = async () => {
    try {
      const res = await fetch('/api/payments/verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id, payment_session_id })
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

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Payment Status</h1>

      {status === 'checking' && <p>{message}</p>}

      {(status === 'success' || status === 'failed') && (
        <div>
          <h2 style={{ color: status === 'success' ? 'green' : 'red' }}>
            {message}
          </h2>
          <p>Order ID: {order_id}</p>
          <button onClick={() => router.push('/')}>Return to Home</button>
        </div>
      )}

      {status === 'error' && (
        <div>
          <h2 style={{ color: 'crimson' }}>⚠️ {message}</h2>
          <button onClick={() => router.push('/')}>Return to Home</button>
        </div>
      )}
    </div>
  )
}
