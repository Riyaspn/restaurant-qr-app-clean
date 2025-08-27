import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function PaymentPage() {
  const router = useRouter()
  const { r: restaurantId, t: tableNumber, total } = router.query
  const [restaurant, setRestaurant] = useState(null)
  const [cart, setCart] = useState([])
  const [selectedPayment, setSelectedPayment] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const totalAmount = parseFloat(total) || 0

  useEffect(() => {
    if (restaurantId) loadRestaurantData()
  }, [restaurantId])

  useEffect(() => {
    if (restaurantId && tableNumber) {
      const stored = localStorage.getItem(`cart_${restaurantId}_${tableNumber}`)
      if (stored) {
        try {
          setCart(JSON.parse(stored))
        } catch {}
      }
    }
  }, [restaurantId, tableNumber])

  const loadRestaurantData = async () => {
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}`)
      if (res.ok) {
        const json = await res.json()
        setRestaurant(json)
      }
    } catch (e) { console.error(e) }
  }

  const handlePayment = async () => {
    setLoading(true)
    try {
      if (selectedPayment === 'cash') {
        // Existing cash order flow
        const orderData = {
          restaurant_id: restaurantId,
          restaurant_name: restaurant?.name,
          table_number: tableNumber,
          items: cart.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            veg: i.veg || false
          })),
          subtotal: totalAmount,
          tax: 0,
          total_amount: totalAmount,
          payment_method: 'cash',
          special_instructions: specialInstructions.trim(),
          payment_status: 'pending'
        }

        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        })
        if (!res.ok) throw new Error('Failed to create order')
        const result = await res.json()
        localStorage.removeItem(`cart_${restaurantId}_${tableNumber}`)
        window.location.href = `/order/success?id=${result.order_id}&method=cash`
      } else {
        // Online payment flow through Cashfree checkout
        const orderPayload = {
          order_amount: totalAmount,
          order_currency: 'INR',
          customer_name: 'Guest Customer',     // TODO: Replace with actual customer info if available
          customer_email: 'guest@example.com',
          customer_phone: '9999999999'
        }

        // Call create-order API to get payment_session_id
        const resp = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderPayload)
        })
        const data = await resp.json()
        if (!resp.ok) throw new Error(data.error || 'Order creation failed')

        // Load Cashfree SDK script if not loaded
        if (!window.Cashfree) {
          await new Promise((resolve) => {
            const s = document.createElement('script')
            s.src = 'https://sdk.cashfree.com/js/v3/cashfree.js'
            s.onload = resolve
            document.body.appendChild(s)
          })
        }

        const cashfree = window.Cashfree({ mode: process.env.NEXT_PUBLIC_CF_ENV || 'sandbox' })

        await cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: '_self'
        })
      }
    } catch (error) {
      alert(`Payment failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b'
  const paymentMethods = [
    { id: 'cash', name: 'Pay at Counter', icon: '💵' },
    { id: 'upi', name: 'UPI Payment', icon: '📱' },
    { id: 'card', name: 'Card Payment', icon: '💳' }
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingBottom: 120 }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}>←</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, flex: 1, textAlign: 'center' }}>Payment</h1>
        <div style={{ fontSize: 14, fontWeight: 600, color: brandColor }}>₹{totalAmount.toFixed(2)}</div>
      </header>

      <div style={{ background: '#fff', padding: 20, marginBottom: 8 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>📦 Order Summary</h3>
        <div style={{ marginBottom: 16 }}>
          {cart.slice(0, 3).map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14, color: '#374151' }}>
              <span>{item.quantity}x {item.name}</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {cart.length > 3 && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>+{cart.length - 3} more items</div>
          )}
        </div>

        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
            <span>Final Total</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="payment-methods" style={{ background: '#fff', padding: 16, marginBottom: 84 }}>
        <h3>💳 Choose Payment Method</h3>
        {paymentMethods.map(method => (
          <label key={method.id} className={`pay-card ${selectedPayment === method.id ? 'selected' : ''}`}>
            <input
              type="radio"
              value={method.id}
              checked={selectedPayment === method.id}
              onChange={(e) => setSelectedPayment(e.target.value)}
            />
            <div className="pay-main">
              <div className="pay-left">
                <span className="pay-emoji" aria-hidden="true">{method.icon}</span>
                <div className="pay-text">
                  <div className="pay-name">{method.name}</div>
                  {method.id === 'cash' && <div className="pay-note">Pay at counter</div>}
                </div>
              </div>
              <div className="pay-right">₹{totalAmount.toFixed(2)}</div>
            </div>
          </label>
        ))}
      </div>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 16, background: '#fff', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14, color: '#374151' }}>
          <span>💰 Total: ₹{totalAmount.toFixed(2)}</span>
          <span>⏱️ Ready in 20 mins</span>
        </div>
        <button
          onClick={handlePayment}
          disabled={loading}
          style={{ width: '100%', background: brandColor, color: '#fff', border: 'none', padding: 16, borderRadius: 8, fontSize: 18, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Processing...' :
            selectedPayment === 'cash' ? 'Place Order' :
              `Pay ₹${totalAmount.toFixed(2)}`}
        </button>
      </div>

      <style jsx>{`
        .pay-card {
          display: block;
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          margin-bottom: 10px;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }
        .pay-card.selected {
          border-color: ${brandColor};
          background: #fffbeb;
        }
        .pay-card input { display: none; }
        .pay-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          min-height: 56px;
        }
        .pay-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .pay-emoji {
          font-size: 20px;
          line-height: 1;
          width: 24px;
          text-align: center;
          font-variant-emoji: text;
        }
        .pay-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .pay-name {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pay-note {
          font-size: 12px;
          color: #6b7280;
        }
        .pay-right {
          font-weight: 700;
          color: #111827;
          flex: 0 0 auto;
          text-align: right;
          min-width: 96px;
        }
        @media (max-width: 380px) {
          .pay-right { min-width: 84px; }
        }
      `}</style>
    </div>
  )
}
