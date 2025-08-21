import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function PaymentPage() {
  const router = useRouter()
  const { r: restaurantId, t: tableNumber, total } = router.query
  
  const [restaurant, setRestaurant] = useState(null)
  const [cart, setCart] = useState([])
  const [selectedPayment, setSelectedPayment] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [selectedTip, setSelectedTip] = useState(0)
  const [showUPIQR, setShowUPIQR] = useState(false)

  const totalAmount = parseFloat(total) || 0
  const finalTotal = totalAmount + selectedTip

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
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, restaurant_profiles(brand_color)')
        .eq('id', restaurantId)
        .single()
      
      if (!error) setRestaurant(data)
    } catch (e) {
      console.error(e)
    }
  }

  const generateUPILink = (app) => {
    const merchantUPI = 'merchant@upi' // Replace with actual UPI ID
    const amount = finalTotal
    const orderRef = `ORDER_${Date.now()}`
    
    const upiString = `upi://pay?pa=${merchantUPI}&am=${amount}&tn=Order Payment&tr=${orderRef}`
    
    const appLinks = {
      'googlepay': `tez://upi/pay?pa=${merchantUPI}&am=${amount}&tn=Order Payment`,
      'phonepe': `phonepe://pay?pa=${merchantUPI}&am=${amount}&tn=Order Payment`,
      'paytm': `paytmmp://pay?pa=${merchantUPI}&am=${amount}&tn=Order Payment`
    }
    
    return appLinks[app] || upiString
  }

  const handlePayment = async () => {
    setLoading(true)
    
    try {
      // For UPI payments, show QR or redirect to app
      if (['googlepay', 'phonepe', 'paytm'].includes(selectedPayment)) {
        const upiLink = generateUPILink(selectedPayment)
        
        if (selectedPayment === 'upi') {
          setShowUPIQR(true)
          setLoading(false)
          return
        } else {
          // Try to open UPI app
          window.location.href = upiLink
          setTimeout(() => {
            // If app doesn't open, show QR as fallback
            setShowUPIQR(true)
          }, 3000)
        }
      }

      const orderData = {
        restaurant_id: restaurantId,
        restaurant_name: restaurant.name,
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
        total_amount: finalTotal,
        payment_method: selectedPayment === 'cash' ? 'cash' : 'online',
        special_instructions: specialInstructions.trim(),
        payment_status: selectedPayment === 'cash' ? 'pending' : 'completed'
      }

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      localStorage.removeItem(`cart_${restaurantId}_${tableNumber}`)
      
      const paymentMethod = selectedPayment === 'cash' ? 'cash' : 'online'
      window.location.href = `/order/success?id=${result.order_id}&method=${paymentMethod}`
      
    } catch (error) {
      console.error('Payment failed:', error)
      alert(`Order failed: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b'

  const paymentMethods = [
    { id: 'cash', name: 'Pay at Counter', icon: '💵', type: 'cash', popular: true },
    { id: 'upi', name: 'UPI (Scan QR Code)', icon: '📱', type: 'upi', instant: true },
    { id: 'googlepay', name: 'Google Pay', icon: '🔵', type: 'upi', instant: true },
    { id: 'phonepe', name: 'PhonePe', icon: '🟣', type: 'upi', instant: true },
    { id: 'paytm', name: 'Paytm', icon: '🔵', type: 'upi', wallet: true },
    { id: 'card', name: 'Debit/Credit Card', icon: '💳', type: 'card' }
  ]

  return (
    <div className="payment-page" style={{'--brand-color': brandColor}}>
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <h1>Payment</h1>
        <div className="total-amount">₹{finalTotal.toFixed(2)}</div>
      </header>

      <div className="order-summary">
        <h3>📦 Order Summary</h3>
        <div className="summary-items">
          {cart.slice(0, 3).map(item => (
            <div key={item.id} className="summary-item">
              <span>{item.quantity}x {item.name}</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {cart.length > 3 && (
            <div className="more-items">+{cart.length - 3} more items</div>
          )}
        </div>
        
        <div className="amount-breakdown">
          <div className="breakdown-row">
            <span>Order Total</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
          {selectedTip > 0 && (
            <div className="breakdown-row">
              <span>Tip for Restaurant</span>
              <span>₹{selectedTip.toFixed(2)}</span>
            </div>
          )}
          <div className="breakdown-row total">
            <span>Final Total</span>
            <span>₹{finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="tip-section">
        <h3>🎁 Add Tip (Optional)</h3>
        <p>Show appreciation to the restaurant staff</p>
        <div className="tip-options">
          {[0, 10, 20, 30, 50].map(amount => (
            <button 
              key={amount}
              className={`tip-btn ${selectedTip === amount ? 'selected' : ''}`}
              onClick={() => setSelectedTip(amount)}
            >
              {amount === 0 ? 'No Tip' : `₹${amount}`}
            </button>
          ))}
        </div>
      </div>

      <div className="payment-methods">
        <h3>💳 Choose Payment Method</h3>
        
        <div className="payment-section">
          <h4>⚡ Instant Payment</h4>
          <div className="payment-grid">
            {paymentMethods.filter(m => m.instant).map(method => (
              <label key={method.id} className={`payment-card ${selectedPayment === method.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value={method.id}
                  checked={selectedPayment === method.id}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                <div className="card-content">
                  <span className="payment-icon">{method.icon}</span>
                  <span className="payment-name">{method.name}</span>
                  {method.instant && <span className="instant-badge">⚡ Instant</span>}
                </div>
                {selectedPayment === method.id && <div className="selected-indicator">✓</div>}
              </label>
            ))}
          </div>
        </div>

        <div className="payment-section">
          <h4>🏪 Pay at Restaurant</h4>
          <label className={`payment-option full-width ${selectedPayment === 'cash' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="cash"
              checked={selectedPayment === 'cash'}
              onChange={(e) => setSelectedPayment(e.target.value)}
            />
            <div className="option-content">
              <span className="payment-icon">💵</span>
              <div className="option-details">
                <span className="payment-name">Pay at Counter</span>
                <span className="payment-desc">Cash or Card at restaurant</span>
              </div>
              {selectedPayment === 'cash' && <span className="popular-badge">Popular</span>}
            </div>
            <span className="payment-amount">₹{finalTotal.toFixed(2)}</span>
          </label>
        </div>

        <div className="payment-section">
          <h4>💳 Other Options</h4>
          {paymentMethods.filter(m => m.type === 'card').map(method => (
            <label key={method.id} className={`payment-option full-width ${selectedPayment === method.id ? 'selected' : ''}`}>
              <input
                type="radio"
                value={method.id}
                checked={selectedPayment === method.id}
                onChange={(e) => setSelectedPayment(e.target.value)}
              />
              <div className="option-content">
                <span className="payment-icon">{method.icon}</span>
                <span className="payment-name">{method.name}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="instructions-section">
        <h3>📝 Special Instructions (Optional)</h3>
        <textarea
          placeholder="Any special requests for your order? (e.g., extra spicy, no onions, etc.)"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={3}
          maxLength={200}
          className="instructions-input"
        />
        <div className="char-count">{specialInstructions.length}/200</div>
      </div>

      <div className="security-info">
        <div className="security-badges">
          <span>🔒 SSL Encrypted</span>
          <span>✅ 100% Safe</span>
          <span>🛡️ PCI Compliant</span>
        </div>
      </div>

      {showUPIQR && (
        <div className="upi-modal">
          <div className="upi-content">
            <button className="close-upi" onClick={() => setShowUPIQR(false)}>×</button>
            <h3>📱 Scan QR to Pay</h3>
            <div className="qr-code">
              {/* Replace with actual QR code generator */}
              <div className="qr-placeholder">
                QR CODE<br/>
                ₹{finalTotal.toFixed(2)}
              </div>
            </div>
            <p>Scan this QR code with any UPI app</p>
            <div className="upi-apps">
              <span>Google Pay • PhonePe • Paytm • BHIM</span>
            </div>
            <button onClick={handlePayment} className="payment-done-btn">
              I have paid ✓
            </button>
          </div>
        </div>
      )}

      <div className="place-order-section">
        <div className="order-info">
          <span>💰 Total: ₹{finalTotal.toFixed(2)}</span>
          <span>⏱️ Ready in 20 mins</span>
        </div>
        <button 
          onClick={handlePayment}
          className="place-order-btn"
          disabled={loading}
        >
          {loading ? 'Processing...' : 
           selectedPayment === 'cash' ? 'Place Order' : 
           `Pay ₹${finalTotal.toFixed(2)}`}
        </button>
      </div>

      <style jsx>{`
        .payment-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 120px; }
        
        .header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: #fff; border-bottom: 1px solid #e5e7eb; }
        .back-btn { background: none; border: none; padding: 8px; cursor: pointer; }
        .header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; flex: 1; text-align: center; }
        .total-amount { font-size: 14px; font-weight: 600; color: var(--brand-color); }
        
        .order-summary { background: #fff; padding: 20px; margin-bottom: 8px; }
        .order-summary h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827; }
        .summary-items { margin-bottom: 16px; }
        .summary-item { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 14px; color: #374151; }
        .more-items { font-size: 12px; color: #6b7280; margin-top: 4px; }
        .amount-breakdown { border-top: 1px solid #e5e7eb; padding-top: 12px; }
        .breakdown-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: #374151; }
        .breakdown-row.total { font-weight: 700; color: #111827; font-size: 16px; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        
        .tip-section { background: #fff; padding: 20px; margin-bottom: 8px; }
        .tip-section h3 { margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #111827; }
        .tip-section p { margin: 0 0 12px 0; font-size: 14px; color: #6b7280; }
        .tip-options { display: flex; gap: 8px; flex-wrap: wrap; }
        .tip-btn { padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; cursor: pointer; font-size: 14px; }
        .tip-btn.selected { background: var(--brand-color); color: #fff; border-color: var(--brand-color); }
        
        .payment-methods { background: #fff; padding: 20px; margin-bottom: 8px; }
        .payment-methods h3 { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827; }
        .payment-section { margin-bottom: 20px; }
        .payment-section h4 { margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151; }
        
        .payment-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .payment-card { display: flex; flex-direction: column; align-items: center; padding: 16px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; background: #fff; position: relative; }
        .payment-card.selected { border-color: var(--brand-color); background: #fffbeb; }
        .payment-card input { display: none; }
        .card-content { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .payment-icon { font-size: 24px; }
        .payment-name { font-size: 14px; font-weight: 500; text-align: center; }
        .instant-badge { background: #16a34a; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; }
        .selected-indicator { position: absolute; top: 8px; right: 8px; background: var(--brand-color); color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        
        .payment-option { display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; cursor: pointer; background: #fff; }
        .payment-option.selected { border-color: var(--brand-color); background: #fffbeb; }
        .payment-option.full-width { width: 100%; }
        .payment-option input { margin: 0; }
        .option-content { display: flex; align-items: center; gap: 12px; flex: 1; }
        .option-details { display: flex; flex-direction: column; }
        .payment-desc { font-size: 12px; color: #6b7280; }
        .popular-badge { background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; }
        .payment-amount { font-weight: 600; color: #111827; }
        
        .instructions-section { background: #fff; padding: 20px; margin-bottom: 8px; }
        .instructions-section h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827; }
        .instructions-input { width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-family: inherit; resize: vertical; }
        .char-count { text-align: right; font-size: 12px; color: #6b7280; margin-top: 4px; }
        
        .security-info { background: #fff; padding: 16px 20px; margin-bottom: 8px; }
        .security-badges { display: flex; justify-content: center; gap: 16px; flex-wrap: wrap; }
        .security-badges span { font-size: 12px; color: #16a34a; }
        
        .upi-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .upi-content { background: white; border-radius: 16px; padding: 24px; max-width: 300px; width: 100%; text-align: center; position: relative; }
        .close-upi { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 24px; cursor: pointer; }
        .upi-content h3 { margin: 0 0 16px 0; color: #111827; }
        .qr-code { margin: 20px 0; }
        .qr-placeholder { width: 150px; height: 150px; border: 2px solid #e5e7eb; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto; color: #6b7280; }
        .upi-content p { margin: 12px 0; color: #6b7280; }
        .upi-apps { font-size: 12px; color: #374151; margin: 16px 0; }
        .payment-done-btn { background: #16a34a; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        
        .place-order-section { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px; background: #fff; border-top: 1px solid #e5e7eb; }
        .order-info { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #374151; }
        .place-order-btn { width: 100%; background: var(--brand-color); color: #fff; border: none; padding: 16px; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer; }
        .place-order-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
