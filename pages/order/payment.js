// pages/order/payment.js
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

  const totalAmount = parseFloat(total) || 0
  const subtotal = totalAmount // No tax
  const tax = 0

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

  const handlePayment = async () => {
    setLoading(true)
    
    try {
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
        subtotal,
        tax: 0,
        total_amount: totalAmount,
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

  const paymentOptions = [
    { id: 'cash', name: 'Pay at Counter', icon: '💵', type: 'cash' },
    { id: 'googlepay', name: 'Google Pay', icon: '💳', type: 'upi' },
    { id: 'phonepe', name: 'PhonePe', icon: '📱', type: 'upi' },
    { id: 'paytm', name: 'Paytm', icon: '💼', type: 'upi' },
    { id: 'amazonpay', name: 'Amazon Pay', icon: '📦', type: 'upi' },
    { id: 'debit', name: 'Debit Card', icon: '💳', type: 'card' },
    { id: 'credit', name: 'Credit Card', icon: '💳', type: 'card' }
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
        <div className="total-amount">Total: ₹{totalAmount.toFixed(2)}</div>
      </header>

      <div className="bill-summary">
        <div className="summary-row total-row">
          <span>Total</span>
          <span>₹{totalAmount.toFixed(2)}</span>
        </div>
      </div>

      <div className="wallet-section">
        <div className="wallet-item">
          <span>SmartQ Wallet</span>
          <span>: ₹0.00</span>
        </div>
      </div>

      <div className="remaining-due">
        <span>Remaining Due</span>
        <span>₹{totalAmount.toFixed(2)}</span>
      </div>

      <div className="payment-methods">
        <p>Select any payment method from below to pay the amount</p>
        
        <div className="payment-section">
          <label className={`payment-option ${selectedPayment === 'cash' ? 'selected' : ''}`}>
            <input
              type="radio"
              value="cash"
              checked={selectedPayment === 'cash'}
              onChange={(e) => setSelectedPayment(e.target.value)}
            />
            <div className="option-content">
              <span className="payment-icon">💵</span>
              <span>Pay at Counter</span>
            </div>
            <span className="payment-amount">₹{totalAmount.toFixed(2)}</span>
          </label>
        </div>

        <div className="payment-section">
          <h3>UPI Apps</h3>
          <div className="upi-grid">
            {paymentOptions.filter(p => p.type === 'upi').map(option => (
              <label key={option.id} className={`upi-option ${selectedPayment === option.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value={option.id}
                  checked={selectedPayment === option.id}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                <div className="upi-content">
                  <div className="upi-icon">{option.icon}</div>
                  <span>{option.name}</span>
                </div>
                {selectedPayment === option.id && <div className="selected-indicator">✓</div>}
              </label>
            ))}
          </div>
        </div>

        <div className="payment-section">
          <h3>Other payment options</h3>
          {paymentOptions.filter(p => p.type === 'card').map(option => (
            <label key={option.id} className={`payment-option ${selectedPayment === option.id ? 'selected' : ''}`}>
              <input
                type="radio"
                value={option.id}
                checked={selectedPayment === option.id}
                onChange={(e) => setSelectedPayment(e.target.value)}
              />
              <div className="option-content">
                <span className="payment-icon">{option.icon}</span>
                <span>{option.name}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="instructions-section">
        <textarea
          placeholder="Special instructions (optional)"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={3}
          maxLength={200}
        />
      </div>

      <div className="place-order-section">
        <button 
          onClick={handlePayment}
          className="place-order-btn"
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Place Order'}
        </button>
      </div>

      <style jsx>{`
        .payment-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 100px; }
        
        .header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: #fff; border-bottom: 1px solid #e5e7eb; }
        .back-btn { background: none; border: none; padding: 8px; cursor: pointer; }
        .header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; flex: 1; text-align: center; }
        .total-amount { font-size: 14px; font-weight: 600; color: var(--brand-color); }
        
        .bill-summary { background: #fff; padding: 20px; margin-bottom: 8px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: #374151; }
        .summary-row:last-child { margin-bottom: 0; }
        .total-row { font-weight: 700; font-size: 18px; color: #111827; }
        
        .wallet-section { background: #fff; padding: 16px 20px; margin-bottom: 8px; }
        .wallet-item { display: flex; justify-content: space-between; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; color: #374151; }
        
        .remaining-due { background: #fff; padding: 16px 20px; margin-bottom: 8px; display: flex; justify-content: space-between; font-weight: 600; font-size: 18px; color: #111827; }
        
        .payment-methods { background: #fff; padding: 20px; }
        .payment-methods > p { margin: 0 0 20px 0; color: #6b7280; font-size: 14px; }
        
        .payment-section { margin-bottom: 24px; }
        .payment-section h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827; }
        
        .payment-option { display: flex; align-items: center; gap: 12px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 8px; cursor: pointer; background: #fff; }
        .payment-option.selected { border-color: var(--brand-color); background: #fffbeb; }
        .payment-option input { margin: 0; }
        .option-content { display: flex; align-items: center; gap: 12px; flex: 1; }
        .payment-icon { font-size: 20px; }
        .payment-amount { font-weight: 600; color: #111827; }
        
        .upi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
        .upi-option { display: flex; flex-direction: column; align-items: center; padding: 16px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; background: #fff; position: relative; }
        .upi-option.selected { border-color: #16a34a; background: #f0fdf4; }
        .upi-option input { display: none; }
        .upi-content { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .upi-icon { font-size: 32px; }
        .selected-indicator { position: absolute; top: 8px; right: 8px; background: #16a34a; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; }
        
        .instructions-section { background: #fff; padding: 20px; margin-top: 8px; }
        .instructions-section textarea { width: 100%; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-family: inherit; resize: vertical; }
        
        .place-order-section { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px; background: #fff; border-top: 1px solid #e5e7eb; }
        .place-order-btn { width: 100%; background: var(--brand-color); color: #fff; border: none; padding: 16px; border-radius: 8px; font-size: 18px; font-weight: 600; cursor: pointer; }
        .place-order-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}
