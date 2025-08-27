// pages/payment-success.js

import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PaymentSuccess() {
  const router = useRouter()
  const [status, setStatus] = useState('processing')
  const [message, setMessage] = useState('Processing your payment...')

  useEffect(() => {
    processPaymentReturn()
  }, [])

  const processPaymentReturn = async () => {
    try {
      console.log('Processing payment return...')

      // Get stored order data
      const pendingOrderStr = localStorage.getItem('pending_order')
      console.log('Pending order from localStorage:', pendingOrderStr)

      if (!pendingOrderStr) {
        throw new Error('No pending order found in localStorage')
      }

      const pendingOrder = JSON.parse(pendingOrderStr)
      console.log('Parsed pending order:', pendingOrder)

      if (!pendingOrder.restaurant_id) {
        throw new Error('Order data incomplete - missing restaurant_id')
      }

      setMessage('Creating your order on the server...')

      // Create the order now that payment is complete
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingOrder,
          payment_status: 'completed'
        })
      })

      console.log('Order creation response status:', response.status, 'ok:', response.ok)

      if (!response.ok) {
        const errorData = await response.text()
        console.error('Order creation failed response:', errorData)
        throw new Error(`Order creation failed with status ${response.status}`)
      }

      const result = await response.json()
      console.log('Order creation result:', result)

      // Clear stored data
      localStorage.removeItem('pending_order')
      localStorage.removeItem(`cart_${pendingOrder.restaurant_id}_${pendingOrder.table_number}`)

      console.log('Redirecting to final success page...')
      router.replace(`/order/success?id=${result.order_id}&method=online`)
    } catch (error) {
      console.error('Payment processing failed:', error)
      setStatus('error')
      setMessage(`Payment processing failed: ${error.message}`)
    }
  }

  return (
    <div className="callback-page">
      <div className="callback-content">
        <div className="spinner">
          {status === 'processing' ? '⏳' : '❌'}
        </div>
        <h2>
          {status === 'processing' ? 'Processing Payment' : 'Payment Failed'}
        </h2>
        <p>{message}</p>

        {status === 'error' && (
          <button onClick={() => router.push('/')}>
            Return to Menu
          </button>
        )}
      </div>

      <style jsx>{`
        .callback-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fa;
          padding: 20px;
        }
        .callback-content {
          text-align: center;
          background: #fff;
          padding: 40px 20px;
          border-radius: 12px;
          max-width: 400px;
          width: 100%;
        }
        .spinner {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h2 {
          margin: 0 0 12px 0;
          color: #111827;
        }
        p {
          color: #6b7280;
          margin-bottom: 20px;
        }
        button {
          background: #f59e0b;
          color: #fff;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
