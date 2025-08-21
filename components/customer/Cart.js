// components/customer/Cart.js
import { useState, useEffect } from 'react'
import CheckoutModal from './CheckoutModal'

export default function Cart({
  items,
  restaurant,
  tableNumber,
  onUpdateItem,
  onClose,
  onOrderSuccess
}) {
  const [showCheckout, setShowCheckout] = useState(false)

  // Prevent background scroll while cart is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = Math.round(subtotal * 0.05 * 100) / 100
  const total = subtotal + tax

  // Show checkout FIRST, then close cart to prevent timing issues
  const proceedToPay = () => {
    setShowCheckout(true)
    // Close cart after a brief delay to ensure checkout modal mounts
    setTimeout(() => onClose(), 100)
  }

  // Handle checkout modal close
  const handleCheckoutClose = () => {
    setShowCheckout(false)
  }

  // If cart empty
  if (items.length === 0) {
    return (
      <div className="cart-overlay" onClick={onClose}>
        <div className="cart-drawer empty" onClick={e => e.stopPropagation()}>
          <div className="cart-header">
            <h2>Your Cart</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          <div className="empty-state">
            <div className="empty-icon">🛒</div>
            <p>Your cart is empty</p>
            <button onClick={onClose} className="browse-btn">Browse Menu</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Cart Drawer */}
      <div className="cart-overlay" onClick={onClose}>
        <div className="cart-drawer" onClick={e => e.stopPropagation()}>
          <div className="cart-header">
            <h2>Your Cart ({items.length} Item{items.length > 1 ? 's' : ''})</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                {item.veg && <span className="veg-badge">🟢</span>}
                
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <p>₹{item.price} each</p>
                </div>
                
                <div className="quantity-controls">
                  <button 
                    onClick={() => onUpdateItem(item.id, item.quantity - 1)} 
                    className="qty-btn"
                    disabled={item.quantity <= 1}
                  >
                    −
                  </button>
                  <span className="qty-display">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateItem(item.id, item.quantity + 1)} 
                    className="qty-btn"
                  >
                    +
                  </button>
                </div>
                
                <div className="item-total">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="cart-summary">
            <div className="summary-line">
              <span>Item Total</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-line">
              <span>Taxes & Charges</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="summary-line total">
              <span>Grand Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="cart-actions">
            <button onClick={proceedToPay} className="checkout-btn">
              Proceed to Pay ₹{total.toFixed(0)}
            </button>
          </div>
        </div>
      </div>

      {/* Checkout Modal - Always render when showCheckout is true */}
      {showCheckout && (
        <CheckoutModal
          items={items}
          restaurant={restaurant}
          tableNumber={tableNumber}
          total={total}
          subtotal={subtotal}
          tax={tax}
          onClose={handleCheckoutClose}
          onOrderSuccess={onOrderSuccess}
        />
      )}

      <style jsx>{`
        .cart-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 50; display: flex; align-items: flex-end;
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .cart-drawer {
          background: #fff; width: 100%; max-height: 85vh;
          border-radius: 20px 20px 0 0; display: flex; flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        
        .cart-drawer.empty {
          max-height: 400px; justify-content: center;
        }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .cart-header {
          padding: 20px; border-bottom: 1px solid #f3f4f6;
          display: flex; justify-content: space-between; align-items: center;
          background: #f8f9fa;
        }
        
        .cart-header h2 {
          margin: 0; font-size: 18px; font-weight: 600; color: #111827;
        }
        
        .close-btn {
          background: #f3f4f6; border: none; width: 32px; height: 32px;
          border-radius: 50%; cursor: pointer; font-size: 18px;
          display: flex; align-items: center; justify-content: center;
          color: #6b7280;
        }
        
        .empty-state {
          padding: 40px 20px; text-align: center; color: #6b7280;
        }
        
        .empty-icon {
          font-size: 48px; margin-bottom: 16px; opacity: 0.5;
        }
        
        .browse-btn {
          margin-top: 16px; padding: 12px 24px; 
          background: var(--brand-color, #f59e0b); color: #fff;
          border: none; border-radius: 8px; font-weight: 600; cursor: pointer;
        }
        
        .cart-items {
          flex: 1; overflow-y: auto; padding: 0;
        }
        
        .cart-item {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 20px; border-bottom: 1px solid #f3f4f6;
          position: relative;
        }
        
        .cart-item:last-child {
          border-bottom: none;
        }
        
        .veg-badge {
          font-size: 12px;
        }
        
        .item-info {
          flex: 1;
        }
        
        .item-info h4 {
          margin: 0 0 4px 0; font-size: 15px; font-weight: 500;
          color: #111827; line-height: 1.3;
        }
        
        .item-info p {
          margin: 0; color: #6b7280; font-size: 13px;
        }
        
        .quantity-controls {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid #e5e7eb; border-radius: 8px;
          background: #f9fafb; padding: 4px;
        }
        
        .qty-btn {
          width: 32px; height: 32px; border: none; background: #fff;
          border-radius: 4px; cursor: pointer; font-size: 18px;
          font-weight: 600; display: flex; align-items: center;
          justify-content: center; transition: all 0.2s ease;
        }
        
        .qty-btn:hover:not(:disabled) {
          background: #f3f4f6;
        }
        
        .qty-btn:disabled {
          opacity: 0.5; cursor: not-allowed;
        }
        
        .qty-display {
          min-width: 32px; height: 32px; display: flex;
          align-items: center; justify-content: center;
          font-weight: 600; color: #111827; font-size: 14px;
        }
        
        .item-total {
          font-weight: 600; color: #111827; font-size: 15px;
          min-width: 60px; text-align: right;
        }
        
        .cart-summary {
          padding: 20px; border-top: 1px solid #f3f4f6;
          background: #f8f9fa;
        }
        
        .summary-line {
          display: flex; justify-content: space-between;
          margin-bottom: 8px; font-size: 14px; color: #374151;
        }
        
        .summary-line.total {
          font-weight: 700; font-size: 16px; color: #111827;
          padding-top: 8px; margin-top: 8px;
          border-top: 1px dashed #d1d5db;
        }
        
        .cart-actions {
          padding: 20px; background: #fff; border-top: 1px solid #f3f4f6;
        }
        
        .checkout-btn {
          width: 100%; padding: 16px; font-size: 16px; font-weight: 600;
          background: var(--brand-color, #f59e0b); color: #fff;
          border: none; border-radius: 12px; cursor: pointer;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
          transition: all 0.3s ease;
        }
        
        .checkout-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
        }
      `}</style>
    </>
  )
}
