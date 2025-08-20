// components/customer/Cart.js
import { useState, useEffect } from 'react'
import CheckoutModal from './CheckoutModal'

export default function Cart({ items, restaurant, tableNumber, onUpdateItem, onClose, onOrderSuccess }) {
  const [showCheckout, setShowCheckout] = useState(false)
  
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = Math.round(subtotal * 0.05 * 100) / 100 // 5% tax
  const total = subtotal + tax

  // Lock background scroll when cart is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  if (items.length === 0) {
    return (
      <div className="cart-overlay" onClick={onClose}>
        <div className="cart-drawer empty" onClick={e => e.stopPropagation()}>
          {/* ... empty state ... */}
        </div>
      </div>
    )
  }

  // When clicking “Proceed to Pay”, first close the cart, then open checkout
  const handleProceed = () => {
    onClose()
    // allow the drawer to unmount before opening checkout
    setTimeout(() => setShowCheckout(true), 50)
  }

  return (
    <>
      <div className="cart-overlay" onClick={onClose}>
        <div className="cart-drawer" onClick={e => e.stopPropagation()}>
          {/* ... cart items and summary ... */}

          <div className="cart-actions">
            <button onClick={handleProceed} className="checkout-btn">
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
          z-index: 55; /* ensure cart is above page content but below checkout */
        }
        .cart-actions {
          padding: 20px; background: #fff;
        }
        .checkout-btn {
          width: 100%; background: var(--brand-color, #f59e0b); color: #fff;
          border: none; border-radius: 12px; padding: 16px;
          font-size: 16px; font-weight: 600; cursor: pointer;
        }
      `}</style>
    </>
  )
}
