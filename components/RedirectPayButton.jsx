// components/RedirectPayButton.jsx
import { useState, useEffect } from 'react'

export default function RedirectPayButton({ amount, customer }) {
  const [loading, setLoading] = useState(false)
  const [cashfree, setCashfree] = useState(null)

  useEffect(() => {
    // Load Cashfree SDK
    const script = document.createElement('script')
    script.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js'
    script.onload = () => {
      // Initialize Cashfree (as shown in video)
      const cf = new window.Cashfree({
        mode: 'sandbox' // Use 'production' for live
      })
      setCashfree(cf)
    }
    document.body.appendChild(script)
  }, [])

  const startPayment = async () => {
    if (!cashfree) {
      alert('Payment system not ready')
      return
    }

    setLoading(true)
    try {
      // Create order first
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_amount: amount,
          order_currency: 'INR',
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      // Use Cashfree SDK for checkout (as shown in video)
      const checkoutOptions = {
        paymentSessionId: data.payment_session_id,
        redirectTarget: '_self' // Opens in same window, use '_blank' for new tab
      }

      cashfree.checkout(checkoutOptions)
      
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={startPayment} disabled={loading || !cashfree}>
      {loading ? 'Processing...' : `Pay ₹${amount}`}
    </button>
  )
}
