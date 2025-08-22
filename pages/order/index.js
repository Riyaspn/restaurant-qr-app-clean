/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { supabase } from '../../services/supabase'

export default function OrderPage() {
  const router = useRouter()
  const { r: restaurantId, t: tableNumber } = router.query

  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [showWelcome, setShowWelcome] = useState(false)

  const loadRestaurantData = useCallback(async () => {
    if (!restaurantId) return
    
    try {
      setLoading(true)
      setError('')

      const { data: restaurantData, error: restError } = await supabase
        .from('restaurants')
        .select('id, name, online_paused, restaurant_profiles(brand_color, phone)')
        .eq('id', restaurantId)
        .single()

      if (restError) throw restError
      if (!restaurantData) throw new Error('Restaurant not found')
      if (restaurantData.online_paused) throw new Error('Restaurant is currently closed')

      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, price, description, image_url, category, veg, status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'available')
        .order('category')
        .order('name')

      if (menuError) throw menuError

      const enhanced = (menuData || []).map((item, idx) => ({
        ...item,
        rating: Number((3.8 + Math.random() * 1.2).toFixed(1)),
        popular: idx % 4 === 0,
        discount: idx % 6 === 0 ? Math.floor(Math.random() * 30) + 10 : null,
        orderCount: Math.floor(Math.random() * 100) + 20,
        customizable: ['pizza', 'burger', 'sandwich'].some(w =>
          (item.name || '').toLowerCase().includes(w)
        )
      }))

      setRestaurant(restaurantData)
      setMenuItems(enhanced)
    } catch (err) {
      setError(err?.message || 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  useEffect(() => {
    if (restaurantId) {
      loadRestaurantData()
      const hasVisitedKey = `visited_${restaurantId}`
      const hasVisited = localStorage.getItem(hasVisitedKey)
      if (!hasVisited) {
        setShowWelcome(true)
        localStorage.setItem(hasVisitedKey, 'true')
      }
    }
  }, [restaurantId, loadRestaurantData])

  useEffect(() => {
    try {
      if (restaurantId && tableNumber) {
        const key = `cart_${restaurantId}_${tableNumber}`
        const stored = localStorage.getItem(key)
        if (stored) setCart(JSON.parse(stored))
      }
    } catch (e) {
      console.warn('Cart restore failed', e)
    }
  }, [restaurantId, tableNumber])

  useEffect(() => {
    try {
      if (restaurantId && tableNumber) {
        const key = `cart_${restaurantId}_${tableNumber}`
        localStorage.setItem(key, JSON.stringify(cart))
      }
    } catch (e) {
      console.warn('Cart persist failed', e)
    }
  }, [cart, restaurantId, tableNumber])

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }, [])

  const updateCartItem = useCallback((itemId, quantity) => {
    if (quantity === 0) {
      setCart(prev => prev.filter(c => c.id !== itemId))
    } else {
      setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity } : c))
    }
  }, [])

  const getItemQuantity = useCallback((itemId) => {
    const item = cart.find(c => c.id === itemId)
    return item ? item.quantity : 0
  }, [cart])

  const filteredItems = useMemo(() => {
    const q = (searchQuery || '').toLowerCase()
    return (menuItems || []).filter(item => {
      if (filterMode === 'veg' && !item.veg) return false
      if (filterMode === 'popular' && !item.popular) return false
      if (filterMode === 'offers' && !item.discount) return false
      if (!q) return true
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      )
    })
  }, [menuItems, filterMode, searchQuery])

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const cat = item.category || 'Others'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(item)
      return acc
    }, {})
  }, [filteredItems])

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart])
  const cartItemsCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart])

  if (loading) return <div className="loading">Loading menu...</div>
  if (error) return <div className="error">{error}</div>

  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b'

  const WelcomeModal = () => showWelcome && (
    <div className="welcome-modal">
      <div className="welcome-content">
        <button className="close-welcome" onClick={() => setShowWelcome(false)}>&times;</button>
        <h2>Welcome to {restaurant?.name}! 👋</h2>
        <div className="welcome-info">
          <div className="info-item">⏱️ Ready in 15-20 mins</div>
          <div className="info-item">🍽️ Fresh & Delicious</div>
          <div className="info-item">💳 Multiple Payment Options</div>
        </div>
        <div className="popular-items">
          <h3>⭐ Today&apos;s Popular Items</h3>
          <div className="popular-grid">
            {menuItems.filter(it => it.popular).slice(0, 3).map(it => (
              <div key={it.id} className="popular-item">
                <img src={it.image_url || '/placeholder-food.jpg'} alt={it.name} />
                <span>{it.name}</span>
              </div>
            ))}
          </div>
        </div>
        <button className="start-ordering" onClick={() => setShowWelcome(false)}>Start Ordering 🚀</button>
        <button className="skip-welcome" onClick={() => setShowWelcome(false)}>Skip to Menu</button>
      </div>
    </div>
  )

  return (
    <div className="menu-page" style={{ '--brand-color': brandColor }}>
      <WelcomeModal />

      <header className="header">
        <button onClick={() => router.back()} className="back-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <div className="header-info">
          <h1>{restaurant?.name || 'Restaurant'}</h1>
          <div className="header-meta">
            <span className="delivery-time">⏱️ 15-20 mins</span>
            <span className="rating">⭐ 4.3 (500+ orders)</span>
          </div>
        </div>
      </header>

      <div className="search-section">
        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search for dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>&times;</button>
          )}
        </div>
      </div>

      <div className="filter-tabs">
        <button className={`filter-tab ${filterMode === 'all' ? 'active' : ''}`} onClick={() => setFilterMode('all')}>All Items</button>
        <button className={`filter-tab ${filterMode === 'veg' ? 'active' : ''}`} onClick={() => setFilterMode('veg')}>🟢 Veg Only</button>
        <button className={`filter-tab ${filterMode === 'popular' ? 'active' : ''}`} onClick={() => setFilterMode('popular')}>🔥 Popular</button>
        <button className={`filter-tab ${filterMode === 'offers' ? 'active' : ''}`} onClick={() => setFilterMode('offers')}>🎉 Offers</button>
      </div>

      {searchQuery && (
        <div className="search-results-header">
          <span>Showing {filteredItems.length} results for &quot;{searchQuery}&quot;</span>
        </div>
      )}

      <div className="menu-content">
        {Object.entries(groupedItems).map(([category, items]) => (
          <section key={category} className="category-section">
            <h2 className="category-title">{category} ({items.length} items)</h2>

            {items.map(item => {
              const quantity = getItemQuantity(item.id)
              const discountedPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price

              return (
                <div key={item.id} className="menu-item">
                  <div className="item-info">
                    <div className="item-badges">
                      {item.popular && <span className="badge popular">🔥 Popular</span>}
                      {item.rating >= 4.5 && <span className="badge top-rated">⭐ Top Rated</span>}
                      {item.discount && <span className="badge discount">{item.discount}% OFF</span>}
                    </div>

                    <div className="item-header">
                      <span className={`diet-indicator ${item.veg ? 'veg' : 'non-veg'}`}>{item.veg ? '🟢' : '🔺'}</span>
                      <h3>{item.name}</h3>
                    </div>

                    <div className="item-meta">
                      <span className="rating">⭐ {item.rating}</span>
                      <span className="order-count">({item.orderCount} orders)</span>
                      {item.customizable && <span className="customizable">🔧 Customizable</span>}
                    </div>

                    {item.description && <p className="item-description">{item.description}</p>}

                    <div className="item-footer">
                      <div className="price-section">
                        {item.discount ? (
                          <>
                            <span className="original-price">₹{item.price.toFixed(2)}</span>
                            <span className="current-price">₹{discountedPrice.toFixed(2)}</span>
                            <span className="you-save">Save ₹{(item.price - discountedPrice).toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="current-price">₹{item.price.toFixed(2)}</span>
                        )}
                      </div>

                      <div className="item-actions">
                        {item.customizable && quantity === 0 && (
                          <button className="customize-btn">Customize</button>
                        )}

                        {quantity > 0 ? (
                          <div className="quantity-selector">
                            <button onClick={() => updateCartItem(item.id, quantity - 1)} className="qty-btn">-</button>
                            <span className="qty-count">{quantity}</span>
                            <button onClick={() => updateCartItem(item.id, quantity + 1)} className="qty-btn">+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart({ ...item, price: discountedPrice })} className="add-btn">Add +</button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="item-image">
                    <img src={item.image_url || '/placeholder-food.jpg'} alt={item.name} />
                    {item.discount && <div className="image-discount">{item.discount}% OFF</div>}
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>

      {cartItemsCount > 0 && (
        <div className="bottom-cart">
          <div className="cart-info">
            <span className="cart-icon">🛒</span>
            <div className="cart-details">
              <span className="cart-count">{cartItemsCount} Item{cartItemsCount !== 1 ? 's' : ''}</span>
              <span className="cart-total">₹{cartTotal.toFixed(2)}</span>
            </div>
            <span className="estimated-time">⏱️ 20 mins</span>
          </div>
          <Link href={`/order/cart?r=${restaurantId}&t=${tableNumber}`} className="checkout-btn">
            Checkout →
          </Link>
        </div>
      )}

      <style jsx>{`
        .menu-page { min-height: 100vh; background: #f8f9fa; padding-bottom: ${cartItemsCount > 0 ? '90px' : '0'}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; }
        .welcome-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .welcome-content { background: #fff; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; text-align: center; position: relative; }
        .close-welcome { position: absolute; top: 12px; right: 12px; background: none; border: none; font-size: 24px; cursor: pointer; }
        .welcome-content h2 { margin: 0 0 16px 0; color: var(--brand-color); }
        .welcome-info { margin: 16px 0; }
        .info-item { display: block; margin: 8px 0; color: #666; }
        .popular-items h3 { margin: 16px 0 8px 0; color: #333; }
        .popular-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
        .popular-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .popular-item img { width: 60px; height: 60px; border-radius: 8px; object-fit: cover; }
        .popular-item span { font-size: 12px; text-align: center; }
        .start-ordering { background: var(--brand-color); color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin: 16px 0 8px 0; width: 100%; }
        .skip-welcome { background: none; border: none; color: #666; cursor: pointer; }

        .header { padding: 1rem; background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 12px; }
        .back-btn { background: none; border: none; padding: 8px; cursor: pointer; min-height: 44px; min-width: 44px; display: flex; align-items: center; justify-content: center; }
        .header-info { flex: 1; }
        .header-info h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }
        .header-meta { display: flex; gap: 16px; margin-top: 4px; font-size: 14px; color: #666; }
        .delivery-time { color: var(--brand-color); font-weight: 500; }
        .rating { color: #f59e0b; }

        .search-section { padding: 1rem; background: #fff; }
        .search-container { position: relative; }
        .search-input { width: 100%; padding: 16px 16px 16px 44px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 16px; background: #f9fafb; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
        .clear-search { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; font-size: 20px; cursor: pointer; color: #999; min-height: 44px; min-width: 44px; display: flex; align-items: center; justify-content: center; }

        .filter-tabs { display: flex; gap: 8px; padding: 1rem; background: #fff; border-bottom: 1px solid #f3f4f6; overflow-x: auto; }
        .filter-tab { padding: 12px 16px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; cursor: pointer; white-space: nowrap; font-size: 14px; min-height: 44px; display: flex; align-items: center; }
        .filter-tab.active { background: var(--brand-color); color: #fff; border-color: var(--brand-color); }

        .search-results-header { padding: 12px 20px; background: #f0f9ff; color: #0369a1; font-size: 14px; }

        .menu-content { padding: 0; }
        .category-section { background: #fff; margin-bottom: 8px; }
        .category-title { margin: 0; padding: 16px 20px 8px; font-size: 18px; font-weight: 600; color: #111827; }

        .menu-item { display: flex; gap: 16px; padding: 20px; border-bottom: 1px solid #f3f4f6; position: relative; }
        .menu-item:last-child { border-bottom: none; }

        .item-badges { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
        .badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; }
        .badge.popular { background: #fef3c7; color: #f59e0b; }
        .badge.top-rated { background: #dcfce7; color: #16a34a; }
        .badge.discount { background: #fecaca; color: #dc2626; }

        .item-info { flex: 1; }
        .item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .diet-indicator { font-size: 12px; }
        .item-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #111827; }

        .item-meta { display: flex; gap: 12px; margin-bottom: 8px; font-size: 13px; }
        .rating { color: #f59e0b; font-weight: 500; }
        .order-count { color: #6b7280; }
        .customizable { color: var(--brand-color); font-weight: 500; }

        .item-description { margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.4; }

        .item-footer { display: flex; justify-content: space-between; align-items: center; }
        .price-section { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .original-price { text-decoration: line-through; color: #9ca3af; font-size: 14px; }
        .current-price { font-size: 16px; font-weight: 600; color: #111827; }
        .you-save { background: #dcfce7; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 500; }

        .item-actions { display: flex; align-items: center; gap: 8px; }
        .customize-btn { background: #f3f4f6; color: var(--brand-color); border: 1px solid var(--brand-color); padding: 8px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; min-height: 44px; }
        .add-btn { background: var(--brand-color); color: #fff; border: none; padding: 12px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; min-height: 44px; }

        .quantity-selector { display: flex; align-items: center; background: var(--brand-color); border-radius: 6px; overflow: hidden; }
        .qty-btn { background: none; border: none; color: #fff; width: 44px; height: 44px; cursor: pointer; font-weight: 600; font-size: 18px; }
        .qty-count { background: #fff; color: var(--brand-color); min-width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; font-weight: 600; }

        .item-image { width: 100px; height: 80px; border-radius: 8px; overflow: hidden; flex-shrink: 0; position: relative; }
        .item-image img { width: 100%; height: 100%; object-fit: cover; }
        .image-discount { position: absolute; top: 4px; right: 4px; background: #dc2626; color: #fff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; }

        .bottom-cart { position: fixed; bottom: 0; left: 0; right: 0; background: var(--brand-color); color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -4px 6px -1px rgba(0,0,0,0.1); }
        .cart-info { display: flex; align-items: center; gap: 12px; flex: 1; }
        .cart-details { display: flex; flex-direction: column; }
        .cart-count { font-size: 14px; }
        .cart-total { font-weight: 700; font-size: 16px; }
        .estimated-time { font-size: 12px; opacity: 0.9; }
        .checkout-btn { background: rgba(255,255,255,0.2); color: #fff; text-decoration: none; padding: 16px 20px; border-radius: 6px; font-weight: 600; min-height: 44px; display: flex; align-items: center; }

        .loading, .error { text-align: center; padding: 40px; color: #6b7280; font-size: 16px; }

        @media (max-width: 768px) {
          .header { padding: 0.75rem; }
          .search-section { padding: 0.75rem; }
          .filter-tabs { padding: 0.75rem; }
          .menu-item { padding: 16px; }
        }
      `}</style>
    </div>
  )
}
