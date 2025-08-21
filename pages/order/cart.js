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
  const [appliedOffers, setAppliedOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [estimatedTime, setEstimatedTime] = useState(20)

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

  const applyPromoCode = () => {
    const promos = {
      'FIRST10': { name: 'First Order Discount', amount: subtotal * 0.1, type: 'percentage' },
      'SAVE20': { name: '20% Off', amount: Math.min(subtotal * 0.2, 100), type: 'percentage' },
      'FLAT50': { name: 'Flat ₹50 Off', amount: 50, type: 'flat' }
    }
    
    const promo = promos[promoCode.toUpperCase()]
    if (promo && !appliedOffers.find(o => o.name === promo.name)) {
      setAppliedOffers(prev => [...prev, { ...promo, id: Date.now() }])
      setPromoCode('')
    } else {
      alert(promo ? 'Offer already applied!' : 'Invalid promo code')
    }
  }

  const removeOffer = (offerId) => {
    setAppliedOffers(prev => prev.filter(o => o.id !== offerId))
  }

  useEffect(() => {
    if (restaurantId && tableNumber) {
      localStorage.setItem(`cart_${restaurantId}_${tableNumber}`, JSON.stringify(cart))
    }
  }, [cart, restaurantId, tableNumber])

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const totalDiscount = appliedOffers.reduce((sum, offer) => sum + offer.amount, 0)
  const deliveryFee = subtotal > 200 ? 0 : 25
  const total = subtotal - totalDiscount + deliveryFee
  const totalSavings = totalDiscount + (deliveryFee === 0 ? 25 : 0)

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
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <h1>Cart Summary</h1>
        <button onClick={clearCart} className="clear-btn">Clear Cart</button>
      </header>

      <div className="restaurant-info">
        <div className="restaurant-header">
          <h2>{restaurant?.name}</h2>
          <div className="restaurant-meta">
            <span className="status-indicator">🟢 Open</span>
            <span className="delivery-time">⏱️ {estimatedTime} mins</span>
          </div>
        </div>
        {cart.length > 0 && (
          <div className="cart-summary-quick">
            <span>{cart.length} item{cart.length !== 1 ? 's' : ''}</span>
            <span>₹{total.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="cart-items">
        {cart.map(item => (
          <div key={item.id} className="cart-item">
            <div className="item-image">
              <img src={item.image_url || '/placeholder-food.jpg'} alt={item.name} />
            </div>
            
            <div className="item-details">
              <div className="item-header">
                <span className={`diet-indicator ${item.veg ? 'veg' : 'non-veg'}`}>
                  {item.veg ? '🟢' : '🔺'}
                </span>
                <h3>{item.name}</h3>
              </div>
              <div className="item-price">₹{item.price.toFixed(2)} each</div>
              <div className="item-total">Total: ₹{(item.price * item.quantity).toFixed(2)}</div>
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
              <button 
                onClick={() => updateQuantity(item.id, 0)}
                className="remove-btn"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="add-more">
        <Link href={`/order?r=${restaurantId}&t=${tableNumber}`} className="add-more-btn">
          + Add more items
        </Link>
        <div className="suggestions">
          <span>💡 Add items worth ₹{Math.max(0, 200 - subtotal).toFixed(0)} more for free delivery!</span>
        </div>
      </div>

      <div className="promo-section">
        <h3>🎉 Promo / Credit Code</h3>
        <div className="promo-input-container">
          <input
            type="text"
            placeholder="Enter promo code (try FIRST10)"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="promo-input"
          />
          <button onClick={applyPromoCode} className="apply-btn">Apply</button>
        </div>
        
        {appliedOffers.length > 0 && (
          <div className="applied-offers">
            {appliedOffers.map(offer => (
              <div key={offer.id} className="applied-offer">
                <span>✅ {offer.name} (-₹{offer.amount.toFixed(2)})</span>
                <button onClick={() => removeOffer(offer.id)} className="remove-offer">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bill-summary">
        <h3>💰 Bill Summary</h3>
        
        <div className="summary-row">
          <span>Subtotal ({cart.length} items)</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        
        {appliedOffers.map(offer => (
          <div key={offer.id} className="summary-row discount">
            <span>🎉 {offer.name}</span>
            <span>-₹{offer.amount.toFixed(2)}</span>
          </div>
        ))}
        
        <div className="summary-row">
          <span>Delivery Fee {deliveryFee === 0 ? '(Free!)' : ''}</span>
          <span>{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee.toFixed(2)}`}</span>
        </div>
        
        <div className="summary-row total-row">
          <span>Total Amount</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        
        {totalSavings > 0 && (
          <div className="savings-highlight">
            🎉 You saved ₹{totalSavings.toFixed(2)} on this order!
          </div>
        )}
      </div>

      <div className="proceed-section">
        <Link 
          href={`/order/payment?r=${restaurantId}&t=${tableNumber}&total=${total}`}
          className="proceed-btn"
        >
          Proceed to Payment (₹{total.toFixed(2)})
        </Link>
        <div className="security-note">
          🔒 Your order & payment details are completely secure
        </div>
      </div>

      <style jsx>{`
        .cart-page { min-height: 100vh; background: #f8f9fa; padding-bottom: 120px; }
        
        .header { display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: #fff; border-bottom: 1px solid #e5e7eb; }
        .back-btn { background: none; border: none; padding: 8px; cursor: pointer; }
        .header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; flex: 1; text-align: center; }
        .clear-btn { background: none; border: none; color: var(--brand-color); cursor: pointer; font-weight: 500; }
        
        .restaurant-info { background: var(--brand-color); color: #fff; padding: 16px 20px; }
        .restaurant-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .restaurant-header h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
        .restaurant-meta { text-align: right; font-size: 14px; }
        .status-indicator { display: block; margin-bottom: 2px; }
        .delivery-time { opacity: 0.9; }
        .cart-summary-quick { display: flex; justify-content: space-between; font-size: 14px; opacity: 0.9; }
        
        .cart-items { background: #fff; margin-top: 8px; }
        
        .cart-item { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #f3f4f6; }
        .cart-item:last-child { border-bottom: none; }
        
        .item-image { width: 60px; height: 60px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
        .item-image img { width: 100%; height: 100%; object-fit: cover; }
        
        .item-details { flex: 1; }
        .item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
        .diet-indicator { font-size: 12px; }
        .item-details h3 { margin: 0; font-size: 16px; font-weight: 500; color: #111827; }
        .item-price { color: #6b7280; font-size: 14px; margin-bottom: 2px; }
        .item-total { color: #111827; font-weight: 600; font-size: 14px; }
        
        .item-controls { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .quantity-selector { display: flex; align-items: center; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
        .qty-btn { background: #fff; border: none; width: 36px; height: 36px; cursor: pointer; font-weight: 600; color: var(--brand-color); }
        .qty-count { background: #f8f9fa; min-width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
        .remove-btn { background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.6; }
        
        .add-more { background: #fff; padding: 16px 20px; margin-top: 8px; }
        .add-more-btn { color: var(--brand-color); text-decoration: none; font-weight: 500; display: block; margin-bottom: 8px; }
        .suggestions { font-size: 14px; color: #16a34a; background: #f0fdf4; padding: 8px 12px; border-radius: 6px; }
        
        .promo-section { background: #fff; padding: 16px 20px; margin-top: 8px; }
        .promo-section h3 { margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827; }
        .promo-input-container { display: flex; gap: 8px; margin-bottom: 12px; }
        .promo-input { flex: 1; padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 16px; }
        .apply-btn { background: var(--brand-color); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; }
        
        .applied-offers { display: flex; flex-direction: column; gap: 6px; }
        .applied-offer { display: flex; justify-content: space-between; align-items: center; background: #f0fdf4; color: #16a34a; padding: 8px 12px; border-radius: 6px; font-size: 14px; }
        .remove-offer { background: none; border: none; cursor: pointer; color: #dc2626; font-weight: bold; }
        
        .bill-summary { background: #fff; margin-top: 8px; padding: 20px; }
        .bill-summary h3 { margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #111827; }
        .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; color: #374151; }
        .summary-row:last-child { margin-bottom: 0; }
        .summary-row.discount { color: #16a34a; }
        .total-row { font-weight: 700; font-size: 18px; color: #111827; border-top: 1px solid #e5e7eb; padding-top: 12px; margin-top: 12px; }
        
        .savings-highlight { background: #dcfce7; color: #16a34a; padding: 12px; border-radius: 8px; text-align: center; font-weight: 600; margin-top: 12px; }
        
        .proceed-section { position: fixed; bottom: 0; left: 0; right: 0; padding: 16px; background: #fff; border-top: 1px solid #e5e7eb; }
        .proceed-btn { display: block; width: 100%; background: var(--brand-color); color: #fff; text-decoration: none; padding: 16px; text-align: center; border-radius: 8px; font-size: 18px; font-weight: 600; margin-bottom: 8px; }
        .security-note { text-align: center; font-size: 12px; color: #6b7280; }
        
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
