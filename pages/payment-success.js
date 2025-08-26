// pages/payment-success.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PaymentSuccess() {
  const router = useRouter()
  const [orderStatus, setOrderStatus] = useState(null)
  
  useEffect(() => {
    // Get order_id from URL params (Cashfree sends this back)
    const { order_id } = router.query
    
    if (order_id) {
      // You can verify the order status here by calling Cashfree's get order API
      // For now, just show success
      setOrderStatus('PAID')
    }
  }, [router.query])

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Payment Status</h1>
      {orderStatus === 'PAID' ? (
        <div>
          <h2 style={{ color: 'green' }}>✅ Payment Successful!</h2>
          <p>Order ID: {router.query.order_id}</p>
        </div>
      ) : (
        <p>Checking payment status...</p>
      )}
    </div>
  )
}
