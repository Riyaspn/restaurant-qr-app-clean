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

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = Math.round(subtotal * 0.05 * 100) / 100
  const total = subtotal + tax

  // Open checkout after closing cart
  const proceedToPay = () => {
    onClose()
    // allow cart overlay to unmount
    setTimeout(() => setShowCheckout(true), 50)
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
            <h2>Your Cart ({items.length} Item{items.length > 1 ? 's' : ''})</h2>
            <button onClick={onClose} className="close-btn">×</button>
          </div>
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-info">
                  <h4>{item.name}</h4>
                  <p>₹{item.price} each</p>
                </div>
                <div className="quantity-controls">
                  <button onClick={() => onUpdateItem(item.id, item.quantity - 1)} className="qty-btn">−</button>
                  <span className="qty-display">{item.quantity}</span>
                  <button onClick={() => onUpdateItem(item.id, item.quantity + 1)} className="qty-btn">+</button>
                </div>
                <div className="item-total">₹{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="cart-summary">
            <div className="summary-line">
              <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-line">
              <span>Tax (5%)</span><span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="summary-line total">
              <span>Total</span><span>₹{total.toFixed(2)}</span>
            </div>
          </div>
          <div className="cart-actions">
            <button onClick={proceedToPay} className="checkout-btn">
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
          z-index: 55;
        }
        .cart-header {
          padding: 16px; border-bottom: 1px solid #eee;
          display: flex; justify-content: space-between; align-items: center;
        }
        .close-btn {
          background: none; border: none; font-size: 24px; cursor: pointer;
        }
        .cart-items {
          flex: 1; overflow-y: auto; padding: 0 16px;
        }
        .cart-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 0; border-bottom: 1px solid #f3f3f3;
        }
        .item-info h4 { margin: 0 0 4px; }
        .quantity-controls {
          display: flex; align-items: center; gap: 8px;
        }
        .qty-btn {
          width: 32px; height: 32px; border: 1px solid #ccc; border-radius: 4px;
          background: #fff; cursor: pointer; font-size: 18px; line-height: 1;
        }
        .qty-display { min-width: 24px; text-align: center; }
        .item-total { font-weight: 600; }
        .cart-summary {
          padding: 16px; border-top: 1px solid #eee; background: #f9f9f9;
        }
        .summary-line {
          display: flex; justify-content: space-between; margin-bottom: 8px;
        }
        .summary-line.total { font-weight: 700; font-size: 16px; }
        .cart-actions {
          padding: 16px; border-top: 1px solid #eee;
        }
        .checkout-btn {
          width: 100%; padding: 12px; background: var(--brand-color, #f59e0b);
          color: #fff; border: none; border-radius: 8px; font-size: 16px;
          cursor: pointer;
        }
        .empty-state {
          padding: 40px; text-align: center; color: #666;
        }
        .browse-btn {
          margin-top: 16px; padding: 8px 16px; background: var(--brand-color, #f59e0b);
          color: #fff; border: none; border-radius: 4px; cursor: pointer;
        }
      `}</style>
    </>
  )
}
