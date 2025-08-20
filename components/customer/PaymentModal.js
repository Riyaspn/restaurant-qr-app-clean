// components/customer/PaymentModal.js
import { useState, useEffect } from 'react'

export default function PaymentModal({ amount, restaurantName, tableNumber, onClose }) {
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('upi')

  // Lock background scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const initiatePayment = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          payment_method: paymentMethod,
          restaurant_name: restaurantName,
          table_number: tableNumber
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Payment initialization failed')

      // Store payment session info for callback processing
      localStorage.setItem('payment_session', JSON.stringify({
        session_id: data.session_id,
        order_id: data.order_id,
        amount: amount
      }))

      // Redirect to payment gateway
      window.location.href = data.payment_url

    } catch (error) {
      console.error('Payment failed:', error)
      alert('Payment initialization failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="payment-overlay" onClick={onClose}>
      <div className="payment-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>💳 Complete Payment</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-content">
          <div className="payment-info">
            <div className="amount-display">
              <span className="amount-label">Amount to Pay</span>
              <div className="amount-value">₹{amount.toFixed(2)}</div>
            </div>
            
            <div className="order-details">
              <p><strong>{restaurantName}</strong></p>
              <p>Table {tableNumber}</p>
            </div>
          </div>

          <div className="payment-methods">
            <h3>Choose Payment Method</h3>
            
            {[
              { id: 'upi', icon: '📱', name: 'UPI', desc: 'PhonePe, Google Pay, Paytm' },
              { id: 'card', icon: '💳', name: 'Card', desc: 'Credit/Debit Cards' },
              { id: 'netbanking', icon: '🏦', name: 'Net Banking', desc: 'All major banks' }
            ].map(method => (
              <label key={method.id} className={`method-option ${paymentMethod === method.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  value={method.id}
                  checked={paymentMethod === method.id}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <div className="method-info">
                  <span className="method-icon">{method.icon}</span>
                  <div className="method-details">
                    <strong>{method.name}</strong>
                    <span>{method.desc}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="security-notice">
            <span className="security-icon">🔒</span>
            <span>Your payment is secured by Cashfree Payments</span>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="cancel-btn" disabled={loading}>
            Cancel
          </button>
          <button onClick={initiatePayment} className="pay-btn" disabled={loading}>
            {loading ? 'Processing...' : `Pay ₹${amount.toFixed(0)}`}
          </button>
        </div>

        <style jsx>{`
          .payment-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.7);
            z-index: 70; display: flex; align-items: center; justify-content: center;
            padding: 20px;
          }
          
          .payment-modal {
            background: #fff; width: 100%; max-width: 420px;
            border-radius: 16px; max-height: 90vh; overflow: hidden;
            animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          
          @keyframes scaleIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          
          .modal-header {
            padding: 20px; border-bottom: 1px solid #f3f4f6;
            display: flex; justify-content: space-between; align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #fff;
          }
          .modal-header h2 { margin: 0; font-size: 18px; }
          .close-btn {
            background: rgba(255,255,255,0.2); border: none; color: #fff;
            width: 32px; height: 32px; border-radius: 50%; cursor: pointer;
          }
          
          .modal-content { padding: 20px; }
          
          .payment-info {
            text-align: center; margin-bottom: 24px;
            background: #f8f9fa; padding: 20px; border-radius: 12px;
          }
          .amount-label { 
            display: block; color: #6b7280; font-size: 14px; margin-bottom: 8px;
          }
          .amount-value {
            font-size: 32px; font-weight: 700; color: #111827;
            margin-bottom: 12px;
          }
          .order-details p { 
            margin: 4px 0; color: #374151; font-size: 14px; 
          }
          
          .payment-methods h3 {
            margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827;
          }
          
          .method-option {
            display: flex; align-items: center; gap: 12px; padding: 16px;
            border: 2px solid #f3f4f6; border-radius: 12px; cursor: pointer;
            margin-bottom: 12px; transition: all 0.2s ease;
          }
          .method-option.selected {
            border-color: var(--brand-color, #f59e0b); 
            background: #fffbeb;
          }
          .method-option:hover { border-color: #e5e7eb; }
          
          .method-info { display: flex; align-items: center; gap: 12px; flex: 1; }
          .method-icon { font-size: 24px; }
          .method-details { display: flex; flex-direction: column; }
          .method-details strong { color: #111827; font-size: 15px; }
          .method-details span { color: #6b7280; font-size: 13px; }
          
          .security-notice {
            display: flex; align-items: center; justify-content: center; gap: 8px;
            margin-top: 20px; padding: 12px; background: #f0f9ff;
            border-radius: 8px; color: #1e40af; font-size: 13px;
          }
          
          .modal-actions {
            padding: 20px; border-top: 1px solid #f3f4f6;
            display: flex; gap: 12px;
          }
          .cancel-btn {
            flex: 1; padding: 12px; background: #f3f4f6; color: #374151;
            border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
          }
          .pay-btn {
            flex: 2; padding: 12px; background: #059669; color: #fff;
            border: none; border-radius: 8px; cursor: pointer; font-weight: 600;
            box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
          }
          .pay-btn:disabled, .cancel-btn:disabled {
            opacity: 0.6; cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  )
}
