// pages/order/cart.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

export default function CartSummary() {
  const router = useRouter()
  const { r: restaurantId, t: tableNumber } = router.query
  
  const [restaurant, setRestaurant] = useState(null)
  const [cart, setCart] = useState([])
  const [promoCode, setPromoCode] = useState('')
  const [loading, setLoading] = useState(true)

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
      setLoading(false)
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

  const updateQuantity = (itemId, quantity) => {
    if (quantity === 0) {
      setCart(prev => prev.filter(c => c.id !== itemId))
    } else {
      setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity } : c))
    }
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem(`cart_${restaurantId}_${tableNumber}`)
  }

  // Update localStorage when cart changes
  useEffect(() => {
    if (restaurantId && tableNumber) {
      localStorage.setItem(`cart_${restaurantId}_${tableNumber}`, JSON.stringify(cart))
    }
  }, [cart, restaurantId, tableNumber])

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = Math.round(subtotal * 0.05 * 100) / 100
  const total = subtotal + tax

  if (loading) return <div className="loading">Loading cart...</div>

  if (cart.length === 0) {
    return (
      <div className="empty-cart">
        <div className="empty-content">
          <div className="empty-icon">🛒</div>
          <h2>Your cart is empty</h2>
          <p>Add items from the menu to get started</p>
          <Link href={`/order?r=${restaurantId}&t=${tableNumber}`} className="browse-btn">
            Browse Menu
          </Link>
        </div>
      </div>
    )
  }

  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b'

  return (
    <div className="cart-page" style={{'--brand-color': brandColor}}>
      {/* Header */}
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <h1>Cart Summary</h1>
        <button onClick={clearCart} className="clear-btn">Clear Cart</button>
      </header>

      {/* Restaurant Info */}
      <div className="restaurant-info">
        <h2>{restaurant?.name}</h2>
      </div>

      {/* Cart Items */}
      <div className="cart-items">
        {cart.map(item => (
          <div key={item.id} className="cart-item">
            {item.image_url && (
              <div className="item-image">
                <img src={item.image_url} alt={item.name} />
              </div>
            )}
            
            <div className="item-details">
              {item.veg ? (
                <span className="veg-indicator">🟢</span>
              ) : (
                <span className="non-veg-indicator">🔺</span>
              )}
              <h3>{item.name}</h3>
              <div className="item-price">₹{item.price.toFixed(2)}</div>
            </div>

            <div className="item-controls">
              <div className="quantity-selector">
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="qty-btn"
                >
                  -
                </button>
                <span className="qty-count">{item.quantity}</span>
                <button 
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  className="qty-btn"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add More Items */}
      <div className="add-more">
        <Link href={`/order?r=${restaurantId}&t=${tableNumber}`} className="add-more-btn">
          + Add more items
        </Link>
      </div>

      {/* Promo Code */}
      <div className="promo-section">
        <h3>Promo / Credit Code</h3>
        <div className="promo-input-container">
          <input
            type="text"
            placeholder="Enter Promo / Credit Code"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="promo-input"
          />
          <button className="apply-btn">Apply</button>
        </div>
      </div>

      {/* Bill Summary */}
      <div className="bill-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-row">
          <span>Total Tax <span className="info-icon">ℹ️</span></span>
          <span>₹{tax.toFixed(2)}</span>
        </div>
        <div className="summary-row total-row">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Proceed Button */}
      <div className="proceed-section">
        <Link 
          href={`/order/payment?r=${restaurantId}&t=${tableNumber}&total=${total}`}
          className="proceed-btn"
        >
          Proceed
        </Link>
      </div>

      <style jsx>{`
        .cart-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 100px; }
        
        .header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: #fff; border-bottom: 1px solid #e5e7eb; }
        .back-btn { background: none; border: none; padding: 8px; cursor: pointer; }
        .header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; flex: 1; text-align: center; }
        .clear-btn { background: none; border: none; color: var(--brand-color); cursor: pointer; font-weight: 500; }
        
        .restaurant-info { background: var(--brand-color); color: #fff; padding: 16px 20px; }
        .restaurant-info h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
        
        .cart-items { background: #fff; }
        
        .cart-item { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #f3f4f6; }
        .cart-item:last-child { border-bottom: none; }
        
        .item-image { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
        .item-image img { width: 100%; height: 100%; object-fit: cover; }
        
        .item-details { flex: 1; }
        .veg-indicator, .non-veg-indicator { font-size: 12px; margin-right: 8px; }
        .item-details h3 { margin: 0 0 4px 0; font-size: 16px; font-weight: 500; color: #111827; }
        .item-price { color: #6b7280; font-size: 14px; }
        
        .item-controls { display: flex; flex-direction: column; align-items: flex-end; }
        .quantity-selector { display: flex; align-items: center; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .qty-btn { background: #fff; border: none; width: 36px; height: 36px; cursor: pointer; font-weight: 600; color: var(--brand-color); }
        .qty-count { background: #f8f9fa; min-width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
        
        .add-more { background: #fff; padding: 16px 20px; border-bottom: 1px solid #f3f4f6; }
        .add-more-btn { color: var(--brand-color); text-decoration: none; font-weight: 500; }
        
        .promo-section { background: #fff; padding: 16px 20px; margin-top: 8px; }
        .promo-section h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827; }
        .promo-input-container { display: flex; gap: 8px; }
        .promo-input { flex: 1; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 16px; }
        .apply-btn { background: var(--brand-color); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        
        .bill-summary { background: #fff; margin-top: 8px; padding: 20px; border-radius: 8px; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: #374151; }
        .summary-row:last-child { margin-bottom: 0; }
        .total-row { font-weight: 700; font-size: 18px; color: #111827; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        .info-icon { color: #6b7280; font-size: 14px; }
        
        .proceed-section { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px; background: #fff; border-top: 1px solid #e5e7eb; }
        .proceed-btn { display: block; width: 100%; background: var(--brand-color); color: #fff; text-decoration: none; padding: 16px; text-align: center; border-radius: 8px; font-size: 18px; font-weight: 600; }
        
        .empty-cart { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8f9fa; }
        .empty-content { text-align: center; padding: 40px; }
        .empty-icon { font-size: 64px; margin-bottom: 20px; opacity: 0.5; }
        .empty-content h2 { margin: 0 0 8px 0; color: #111827; }
        .empty-content p { color: #6b7280; margin-bottom: 24px; }
        .browse-btn { background: var(--brand-color); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; }
        
        .loading { text-align: center; padding: 40px; color: #6b7280; }
      `}</style>
    </div>
  )
}
