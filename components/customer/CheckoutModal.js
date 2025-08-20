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
  const [paymentMethod, setPaymentMethod] = useState('online')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

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
    localStorage.setItem('pending_order', JSON.stringify(orderData))
    return orderData
  }

  const handleCashPayment = async () => {
    setLoading(true)
    try {
      const orderData = storeOrderData()
      const res = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ ...orderData, payment_status: 'pending' })
      })
      if (!res.ok) throw new Error()
      const { order_id } = await res.json()
      localStorage.removeItem('pending_order')
      localStorage.removeItem(`cart_${restaurant.id}_${tableNumber}`)
      window.location.href = `/order/success?id=${order_id}&method=cash`
    } catch {
      alert('Order failed')
    } finally {
      setLoading(false)
    }
  }

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

  const itemCount = items.reduce((sum, x) => sum + x.quantity, 0)

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Checkout</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-content">
          <section className="info-section">
            <h3>📍 Order Details</h3>
            <div className="order-info">
              <p><strong>{restaurant.name}</strong></p>
              <p>Table: {tableNumber}</p>
              <p>{itemCount} items • ₹{total.toFixed(2)}</p>
            </div>
          </section>

          <section className="form-section">
            <h3>💳 Payment Method</h3>
            <div className="payment-options">
              <label className={`payment-option ${paymentMethod==='online'?'selected':''}`}>
                <input
                  type="radio"
                  value="online"
                  checked={paymentMethod==='online'}
                  onChange={e=>setPaymentMethod(e.target.value)}
                />
                <div className="option-content">
                  <div className="option-header">
                    <strong>💸 Pay Online</strong>
                    <span className="recommended">Recommended</span>
                  </div>
                  <div className="option-description">UPI, Cards, Net Banking</div>
                </div>
              </label>
              <label className={`payment-option ${paymentMethod==='cash'?'selected':''}`}>
                <input
                  type="radio"
                  value="cash"
                  checked={paymentMethod==='cash'}
                  onChange={e=>setPaymentMethod(e.target.value)}
                />
                <div className="option-content">
                  <div className="option-header">
                    <strong>💵 Pay at Counter</strong>
                  </div>
                  <div className="option-description">Pay when collecting</div>
                </div>
              </label>
            </div>
          </section>

          <section className="form-section">
            <h3>📝 Special Instructions</h3>
            <textarea
              placeholder="Any requests..."
              value={specialInstructions}
              onChange={e=>setSpecialInstructions(e.target.value)}
              rows={3}
              maxLength={200}
            />
            <div className="char-count">{specialInstructions.length}/200</div>
          </section>

          <section className="order-summary">
            <h3>🧾 Bill Summary</h3>
            {items.map(item=>(
              <div key={item.id} className="summary-item">
                <span>{item.name} × {item.quantity}</span>
                <span>₹{(item.price*item.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="summary-totals">
              <div><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div><span>Tax</span><span>₹{tax.toFixed(2)}</span></div>
              <div className="grand"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
            </div>
          </section>
        </div>

        <div className="modal-actions">
          <button
            onClick={paymentMethod==='online'?handleOnlinePayment:handleCashPayment}
            className="place-order-btn"
            disabled={loading}
          >
            {loading?'Processing...':paymentMethod==='online'?`Pay ₹${total.toFixed(0)}`:'Place Order'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .checkout-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          z-index:100; display: flex; align-items: flex-end;
        }
        .checkout-modal {
          background:#fff; width:100%; max-height:90vh;
          border-radius:20px 20px 0 0; display:flex; flex-direction:column;
        }
        .modal-header { padding:16px; border-bottom:1px solid #eee; display:flex; justify-content:space-between; }
        .close-btn { background:none; border:none; font-size:24px; cursor:pointer; }
        .modal-content { flex:1; overflow-y:auto; }
        .info-section, .form-section { padding:16px; border-bottom:1px solid #eee; }
        .order-info p { margin:4px 0; }
        .payment-options { display:flex; flex-direction:column; gap:8px; }
        .payment-option { display:flex; gap:8px; padding:12px; border:1px solid #ddd; border-radius:8px; }
        .payment-option.selected { border-color:var(--brand-color,#f59e0b); background:#fffbeb; }
        .option-header { display:flex; align-items:center; gap:4px; }
        textarea { width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; }
        .char-count { text-align:right; font-size:12px; color:#666; }
        .order-summary { padding:16px; }
        .summary-item { display:flex; justify-content:space-between; margin:4px 0; }
        .summary-totals { margin-top:8px; border-top:1px dashed #ccc; padding-top:8px; }
        .grand { font-weight:600; }
        .modal-actions { padding:16px; border-top:1px solid #eee; }
        .place-order-btn { width:100%; padding:12px; background:var(--brand-color,#f59e0b); color:#fff; border:none; border-radius:8px; font-size:16px; cursor:pointer; }
        .place-order-btn:disabled { opacity:0.6; cursor:not-allowed; }
      `}</style>
    </div>
  )
}
