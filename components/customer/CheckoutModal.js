// components/customer/CheckoutModal.js
import { useState, useEffect } from 'react'
import PaymentModal from './PaymentModal'

export default function CheckoutModal({
  items,
  restaurant,
  tableNumber,
  total,
  subtotal,
  tax,
  onClose,
  onOrderSuccess
}) {
  const [paymentMethod, setPaymentMethod] = useState('online') // 'online' | 'cash'
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(false)

  // Prevent background scroll while modal is open (mobile-friendly)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Persist order data locally for the "create after payment" return
  const storeOrderData = () => {
    const orderData = {
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      table_number: tableNumber,
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        veg: i.veg
      })),
      subtotal,
      tax,
      total_amount: total,
      payment_method: paymentMethod,
      special_instructions: specialInstructions,
      timestamp: Date.now()
    }
    try {
      localStorage.setItem('pending_order', JSON.stringify(orderData))
    } catch {}
    return orderData
  }

  // Cash: create order immediately (payment_status=pending)
  const handleCashPayment = async () => {
    setLoading(true)
    try {
      const orderData = storeOrderData()
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderData,
          payment_status: 'pending'
        })
      })
      if (!res.ok) throw new Error('Failed to create order')
      const data = await res.json()

      // Clear persisted data and cart for this table
      try {
        localStorage.removeItem('pending_order')
        localStorage.removeItem(`cart_${restaurant.id}_${tableNumber}`)
      } catch {}

      // Navigate to success
      window.location.href = `/order/success?id=${data.order_id}&method=cash`
    } catch (e) {
      console.error(e)
      alert('Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Online: open PSP flow; order will be created on return
  const handleOnlinePayment = () => {
    storeOrderData()
    setShowPayment(true)
  }

  if (showPayment) {
    return (
      <PaymentModal
        amount={total}
        restaurantName={restaurant.name}
        tableNumber={tableNumber}
        onClose={() => setShowPayment(false)}
      />
    )
  }

  const itemCount = items.reduce((sum, it) => sum + (it.quantity || 0), 0)

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>Checkout</h2>
          <button onClick={onClose} className="close-btn" aria-label="Close">×</button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Order Info */}
          <section className="info-section">
            <h3>📍 Order Details</h3>
            <div className="order-info">
              <p><strong>{restaurant.name}</strong></p>
              <p>Table: {tableNumber}</p>
              <p>{itemCount} items • ₹{total.toFixed(2)}</p>
            </div>
          </section>

          {/* Payment Method */}
          <section className="form-section">
            <h3>💳 Payment Method</h3>
            <div className="payment-options">
              <label className={`payment-option ${paymentMethod === 'online' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="online"
                  checked={paymentMethod === 'online'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="option-content">
                  <div className="option-header">
                    <strong>💸 Pay Online</strong>
                    <span className="recommended">Recommended</span>
                  </div>
                  <div className="option-description">UPI, Cards, Net Banking</div>
                </div>
              </label>

              <label className={`payment-option ${paymentMethod === 'cash' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="option-content">
                  <div className="option-header">
                    <strong>💵 Pay at Counter</strong>
                  </div>
                  <div className="option-description">Pay when you collect your order</div>
                </div>
              </label>
            </div>
          </section>

          {/* Special Instructions */}
          <section className="form-section">
            <h3>📝 Special Instructions (Optional)</h3>
            <textarea
              placeholder="Any special requests? (e.g., less spicy, extra sauce, etc.)"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <div className="char-count">{specialInstructions.length}/200</div>
          </section>

          {/* Order Summary */}
          <section className="order-summary">
            <h3>🧾 Bill Summary</h3>
            <div className="summary-items">
              {items.map(item => (
                <div key={item.id} className="summary-item">
                  <span className="item-info">
                    {item.veg && '🟢'} {item.name} × {item.quantity}
                  </span>
                  <span className="item-amount">₹{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="summary-totals">
              <div className="total-line">
                <span>Item Total</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="total-line">
                <span>Taxes & Charges</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="total-line grand-total">
                <span>Total Amount</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Primary Action */}
        <div className="modal-actions">
          <button
            onClick={paymentMethod === 'online' ? handleOnlinePayment : handleCashPayment}
            className="place-order-btn"
            disabled={loading}
          >
            {loading
              ? 'Processing...'
              : paymentMethod === 'online'
                ? `Pay ₹${total.toFixed(0)}`
                : 'Place Order'}
          </button>
        </div>

        {/* Styles */}
        <style jsx>{`
          .checkout-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 100; /* ensure above cart drawer */
            display: flex;
            align-items: flex-end;
            animation: fadeIn 0.25s ease;
          }
          @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }

          .checkout-modal {
            background: #fff;
            width: 100%;
            max-height: 90vh;
            border-radius: 20px 20px 0 0;
            display: flex;
            flex-direction: column;
            animation: slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1);
          }
          @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }

          .modal-header {
            padding: 20px 20px 16px;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
          }
          .modal-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
          .close-btn {
            background: #f3f4f6;
            border: none;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            color: #6b7280;
          }

          .modal-content { flex: 1; overflow-y: auto; padding: 0; }

          .info-section, .form-section { padding: 20px; border-bottom: 1px solid #f3f4f6; }
          .info-section h3, .form-section h3 { margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #111827; }

          .order-info {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 8px;
            border-left: 4px solid var(--brand-color, #f59e0b);
          }
          .order-info p { margin: 4px 0; color: #374151; }

          .payment-options { display: flex; flex-direction: column; gap: 12px; }
          .payment-option {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            padding: 16px;
            border: 2px solid #f3f4f6;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .payment-option.selected {
            border-color: var(--brand-color, #f59e0b);
            background: #fffbeb;
          }
          .payment-option input { margin-top: 2px; }
          .option-content { flex: 1; }
          .option-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
          .recommended {
            background: #059669;
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 600;
          }
          .option-description { color: #6b7280; font-size: 14px; }

          textarea {
            width: 100%;
            padding: 12px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
            min-height: 80px;
          }
          .char-count {
            text-align: right;
            font-size: 12px;
            color: #6b7280;
            margin-top: 4px;
          }

          .order-summary { background: #f8f9fa; padding: 20px; }
          .order-summary h3 { margin: 0 0 12px; font-size: 16px; font-weight: 600; color: #111827; }
          .summary-items { margin-bottom: 12px; }
          .summary-item { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #374151; }
          .item-info { flex: 1; }
          .item-amount { font-weight: 500; }
          .summary-totals { border-top: 1px dashed #d1d5db; padding-top: 12px; }
          .total-line { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #374151; }
          .grand-total {
            font-weight: 700;
            font-size: 16px;
            color: #111827;
            border-top: 1px solid #e5e7eb;
            padding-top: 8px;
            margin-top: 8px;
          }

          .modal-actions {
            padding: 20px;
            background: #fff;
            border-top: 1px solid #f3f4f6;
          }
          .place-order-btn {
            width: 100%;
            background: var(--brand-color, #f59e0b);
            color: #fff;
            border: none;
            border-radius: 12px;
            padding: 16px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(245,158,11,0.3);
            transition: transform 0.2s ease;
          }
          .place-order-btn:hover { transform: translateY(-1px); }
          .place-order-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        `}</style>
      </div>
    </div>
  )
}
