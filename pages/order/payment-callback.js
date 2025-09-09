// pages/order/payment-callback.js

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PaymentCallback() {
  const router = useRouter()
  const [status, setStatus]   = useState('processing')
  const [message, setMessage] = useState('Processing your payment...')

  useEffect(() => {
    processPaymentReturn()
  }, [])

  const processPaymentReturn = async () => {
    try {
      // 1) Retrieve stored data
      const pendingOrder = JSON.parse(localStorage.getItem('pending_order') || '{}')
      const paymentSession = JSON.parse(localStorage.getItem('payment_session') || '{}')

      if (!pendingOrder.restaurant_id || !paymentSession.order_id) {
        throw new Error('Order data not found')
      }

      setMessage('Creating your order on the server...')

      // 2) Create final order record
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingOrder,
          payment_status: 'completed',
          payment_details: {
            session_id: paymentSession.session_id,
            external_order_id: paymentSession.order_id,
            amount: paymentSession.amount
          }
        })
      })
      if (!response.ok) throw new Error('Failed to create order')

      const result = await response.json()

      // 3) Notify owner of the completed order
      await fetch('/api/notify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: pendingOrder.restaurant_id,
          orderId: result.order_id,
          orderItems: pendingOrder.items
        })
      })

      // 4) Cleanup and redirect
      localStorage.removeItem('pending_order')
      localStorage.removeItem('payment_session')
      localStorage.removeItem(`cart_${pendingOrder.restaurant_id}_${pendingOrder.table_number}`)

      await router.replace(`/order/success?id=${result.order_id}&method=online`)

      // Optionally open invoice PDF
      window.open(`/api/bills/pdf/${result.order_id}`, '_blank')
    } catch (error) {
      console.error('Payment processing failed:', error)
      setStatus('error')
      setMessage('Payment processing failed. Please contact the restaurant.')
    }
  }

  return (
    <div className="callback-page">
      <div className="callback-content">
        <div className="spinner">{status === 'processing' ? '⏳' : '❌'}</div>
        <h2>{status === 'processing' ? 'Processing Payment' : 'Payment Failed'}</h2>
        <p>{message}</p>
        {status === 'error' && (
          <button onClick={() => router.push('/')}>
            Return to Menu
          </button>
        )}
      </div>
      <style jsx>{`
        /* styles omitted for brevity */
      `}</style>
    </div>
  )
}
