// components/RedirectPayButton.jsx
import { useState } from 'react'

export default function RedirectPayButton({ amount, customer }) {
  const [loading, setLoading] = useState(false)

  const startPayment = async () => {
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

      const isProd = process.env.NEXT_PUBLIC_CF_ENV === 'PROD'
      const checkoutBase = isProd
        ? 'https://payments.cashfree.com/pg/view'
        : 'https://sandbox.cashfree.com/pg/view'

      window.location.href = `${checkoutBase}/${encodeURIComponent(data.order_token)}`
    } catch (e) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={startPayment} disabled={loading}>
      {loading ? 'Redirecting…' : `Pay ₹${amount}`}
    </button>
  )
}
