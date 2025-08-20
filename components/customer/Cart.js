// components/customer/Cart.js
import { useState, useEffect } from 'react'
import CheckoutModal from './CheckoutModal'

export default function Cart({ items, restaurant, tableNumber, onUpdateItem, onClose, onOrderSuccess }) {
  const [showCheckout, setShowCheckout] = useState(false)
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = Math.round(subtotal * 0.05 * 100) / 100 // 5% tax, rounded
  const total = subtotal + tax

  // Lock background scroll
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

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
      <div className="cart-overlay" onClick={onClose}>
        <div className="cart-drawer" onClick={e => e.stopPropagation()}>
          <div className="cart-header">
            <h2>Your Cart ({items.length} item{items.length !== 1 ? 's' : ''})</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>

          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                {item.veg && <span className="veg-badge">🟢</span>}
                
                <div className="item-details">
                  <h4 className="item-name">{item.name}</h4>
                  <div className="item-price">₹{item.price} each</div>
                </div>
                
                <div className="quantity-controls">
                  <button 
                    onClick={() => onUpdateItem(item.id, item.quantity - 1)}
                    className="qty-btn minus"
                  >
                    −
                  </button>
                  <span className="qty-display">{item.quantity}</span>
                  <button 
                    onClick={() => onUpdateItem(item.id, item.quantity + 1)}
                    className="qty-btn plus"
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

          <div className="bill-summary">
            <h3>Bill Summary</h3>
            <div className="summary-row">
              <span>Item Total</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Taxes & Charges</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="summary-row total-row">
              <span>Grand Total</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
          </div>

          <div className="cart-actions">
            <button 
              onClick={() => setShowCheckout(true)}
              className="checkout-btn"
            >
              Proceed to Pay ₹{total.toFixed(0)}
            </button>
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          items={items}
          restaurant={restaurant}
          tableNumber={tableNumber}
          total={total}
          subtotal={subtotal}
          tax={tax}
          onClose={() => setShowCheckout(false)}
          onOrderSuccess={onOrderSuccess}
        />
      )}

      <style jsx>{`
        .cart-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          z-index: 50; display: flex; align-items: flex-end;
        }
        .cart-drawer {
          background: #fff; width: 100%; max-height: 85vh;
          border-radius: 20px 20px 0 0; display: flex; flex-direction: column;
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .cart-drawer.empty { max-height: 400px; justify-content: center; }
        
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        
        .cart-header {
          padding: 20px 20px 16px; border-bottom: 1px solid #f3f4f6;
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
        .empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
        .browse-btn {
          background: var(--brand-color, #f59e0b); color: #fff; border: none;
          padding: 12px 24px; border-radius: 8px; font-weight: 600;
          cursor: pointer; margin-top: 16px;
        }
        
        .cart-items {
          flex: 1; overflow-y: auto; padding: 0;
        }
        
        .cart-item {
          display: flex; align-items: center; gap: 12px; position: relative;
          padding: 16px 20px; border-bottom: 1px solid #f3f4f6;
        }
        .cart-item:last-child { border-bottom: none; }
        
        .veg-badge {
          position: absolute; top: 12px; left: 16px; font-size: 12px;
        }
        
        .item-details { 
          flex: 1; padding-left: ${items.some(i => i.veg) ? '20px' : '0'};
        }
        .item-name { 
          margin: 0 0 4px 0; font-size: 15px; font-weight: 500;
          color: #111827; line-height: 1.3;
        }
        .item-price { 
          color: #6b7280; font-size: 13px; 
        }
        
        .quantity-controls {
          display: flex; align-items: center; border: 1px solid #e5e7eb;
          border-radius: 8px; background: #f9fafb;
        }
        .qty-btn {
          width: 32px; height: 32px; border: none; background: none;
          cursor: pointer; font-weight: 600; color: #374151;
          display: flex; align-items: center; justify-content: center;
        }
        .qty-btn:hover { background: #f3f4f6; }
        .qty-btn.minus { color: #dc2626; }
        .qty-btn.plus { color: #059669; }
        .qty-display {
          min-width: 32px; height: 32px; display: flex;
          align-items: center; justify-content: center; 
          font-weight: 600; color: #111827; font-size: 14px;
        }
        
        .item-total { 
          font-weight: 600; color: #111827; font-size: 15px;
          min-width: 60px; text-align: right;
        }
        
        .bill-summary {
          padding: 20px; border-top: 1px solid #f3f4f6;
          background: #f8f9fa;
        }
        .bill-summary h3 {
          margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;
        }
        .summary-row {
          display: flex; justify-content: space-between; margin-bottom: 8px;
          font-size: 14px; color: #374151;
        }
        .total-row {
          font-weight: 700; font-size: 16px; color: #111827;
          padding-top: 8px; margin-top: 8px; border-top: 1px dashed #d1d5db;
        }
        
        .cart-actions {
          padding: 20px; background: #fff;
        }
        .checkout-btn {
          width: 100%; background: var(--brand-color, #f59e0b); color: #fff;
          border: none; border-radius: 12px; padding: 16px;
          font-size: 16px; font-weight: 600; cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
      `}</style>
    </>
  )
}
