// components/PayButton.jsx
import { useState } from 'react'

export default function PayButton({ amount, customer }) {
  const [loading, setLoading] = useState(false)

  const pay = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          metadata: { note: 'Restaurant order' }
        })
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error || 'Failed to create order')

      // Load Cashfree checkout script if not present
      if (!window?.Cashfree) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://sdk.cashfree.com/js/ui/2.0.0/cashfree.sandbox.js' // switch to production URL for PROD
          s.onload = resolve
          s.onerror = reject
          document.body.appendChild(s)
        })
      }

      const cashfree = new window.Cashfree({
        mode: process.env.NEXT_PUBLIC_CF_ENV === 'PROD' ? 'production' : 'sandbox'
      })

      cashfree.checkout({
        paymentSessionId: data.order_token,
        redirectTarget: '_self' // or 'modal' depending on SDK
      })

      // Final confirmation should rely on webhook updating order status
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={pay} disabled={loading}>
      {loading ? 'Starting payment…' : `Pay ₹${amount}`}
    </button>
  )
}
