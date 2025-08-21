// pages/order/index.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

export default function OrderPage() {
  const router = useRouter()
  const { r: restaurantId, t: tableNumber } = router.query
  
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [vegOnly, setVegOnly] = useState(false)

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

  useEffect(() => {
    if (restaurantId && tableNumber) {
      localStorage.setItem(`cart_${restaurantId}_${tableNumber}`, JSON.stringify(cart))
    }
  }, [cart, restaurantId, tableNumber])

  const loadRestaurantData = async () => {
    try {
      setLoading(true)
      const { data: restaurantData, error: restError } = await supabase
        .from('restaurants')
        .select('id, name, online_paused, restaurant_profiles(brand_color, phone)')
        .eq('id', restaurantId)
        .single()
      
      if (restError) throw restError
      if (restaurantData.online_paused) throw new Error('Restaurant is currently closed')
      
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, price, description, image_url, category, veg, status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'available')
        .order('category')
        .order('name')

      if (menuError) throw menuError

      const uniqueCategories = [...new Set((menuData || []).map(item => item.category))].filter(Boolean)
      
      setRestaurant(restaurantData)
      setMenuItems(menuData || [])
      setCategories(uniqueCategories)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const updateCartItem = (itemId, quantity) => {
    if (quantity === 0) {
      setCart(prev => prev.filter(c => c.id !== itemId))
    } else {
      setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity } : c))
    }
  }

  const getItemQuantity = (itemId) => {
    const item = cart.find(c => c.id === itemId)
    return item ? item.quantity : 0
  }

  const filteredItems = menuItems.filter(item => {
    if (vegOnly && !item.veg) return false
    if (selectedCategory && item.category !== selectedCategory) return false
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return item.name.toLowerCase().includes(query) || 
             item.description?.toLowerCase().includes(query)
    }
    return true
  })

  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category || 'Others'
    if (!acc[category]) acc[category] = []
    acc[category].push(item)
    return acc
  }, {})

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  if (loading) return <div className="loading">Loading menu...</div>
  if (error) return <div className="error">{error}</div>

  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b'

  return (
    <div className="menu-page" style={{'--brand-color': brandColor}}>
      {/* Header */}
      <header className="header">
        <button onClick={() => router.back()} className="back-btn">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <h1>{restaurant?.name || 'Restaurant'}</h1>
      </header>

      {/* Search */}
      <div className="search-section">
        <div className="search-container">
          <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <input
            type="text"
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button className={`filter-tab ${selectedCategory === '' ? 'active' : ''}`} onClick={() => setSelectedCategory('')}>
          Filters ▼
        </button>
        <button className={`filter-tab ${!vegOnly ? 'active' : ''}`} onClick={() => setVegOnly(false)}>
          Non Veg
        </button>
        <button className={`filter-tab ${vegOnly ? 'active' : ''}`} onClick={() => setVegOnly(true)}>
          Veg
        </button>
        <button className="filter-tab">Vegan</button>
      </div>

      {/* Menu Items */}
      <div className="menu-content">
        {Object.entries(groupedItems).map(([category, items]) => (
          <section key={category} className="category-section">
            <h2 className="category-title">{category}</h2>
            
            {items.map(item => {
              const quantity = getItemQuantity(item.id)
              return (
                <div key={item.id} className="menu-item">
                  <div className="item-info">
                    <div className="item-header">
                      {item.veg ? (
                        <span className="veg-indicator">🟢</span>
                      ) : (
                        <span className="non-veg-indicator">🔺</span>
                      )}
                      <h3>{item.name}</h3>
                    </div>
                    
                    <div className="item-meta">
                      <span className="rating">⭐ 4.2</span>
                      <span className="info-btn">ℹ️ Info</span>
                    </div>
                    
                    {item.description && (
                      <p className="item-description">{item.description}</p>
                    )}
                    
                    <div className="item-footer">
                      <span className="price">₹{item.price.toFixed(2)}</span>
                      
                      {quantity > 0 ? (
                        <div className="quantity-selector">
                          <button 
                            onClick={() => updateCartItem(item.id, quantity - 1)}
                            className="qty-btn"
                          >
                            -
                          </button>
                          <span className="qty-count">{quantity}</span>
                          <button 
                            onClick={() => updateCartItem(item.id, quantity + 1)}
                            className="qty-btn"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(item)} className="add-btn">
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {item.image_url && (
                    <div className="item-image">
                      <img src={item.image_url} alt={item.name} />
                    </div>
                  )}
                </div>
              )
            })}
          </section>
        ))}
      </div>

      {/* Bottom Cart Bar */}
      {cartItemsCount > 0 && (
        <div className="bottom-cart">
          <div className="cart-info">
            <span className="cart-icon">🛒</span>
            <span>{cartItemsCount} Item{cartItemsCount !== 1 ? 's' : ''}</span>
            <span>₹{cartTotal.toFixed(2)}</span>
          </div>
          <Link 
            href={`/order/cart?r=${restaurantId}&t=${tableNumber}`}
            className="checkout-btn"
          >
            Checkout ▶
          </Link>
        </div>
      )}

      <style jsx>{`
        .menu-page { min-height: 100vh; background: #f8f9fa; padding-bottom: ${cartItemsCount > 0 ? '80px' : '0'}; }
        
        .header { display: flex; align-items: center; padding: 1rem; background: #fff; border-bottom: 1px solid #e5e7eb; }
        .back-btn { background: none; border: none; padding: 8px; margin-right: 12px; cursor: pointer; }
        .header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }
        
        .search-section { padding: 1rem; background: #fff; }
        .search-container { position: relative; }
        .search-input { width: 100%; padding: 12px 16px 12px 44px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 16px; background: #f9fafb; }
        .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #9ca3af; }
        
        .filter-tabs { display: flex; gap: 8px; padding: 1rem; background: #fff; border-bottom: 1px solid #f3f4f6; overflow-x: auto; }
        .filter-tab { padding: 8px 16px; border: 1px solid #e5e7eb; border-radius: 20px; background: #fff; cursor: pointer; white-space: nowrap; font-size: 14px; }
        .filter-tab.active { background: var(--brand-color); color: #fff; border-color: var(--brand-color); }
        
        .menu-content { padding: 0; }
        .category-section { background: #fff; margin-bottom: 8px; }
        .category-title { margin: 0; padding: 16px 20px 8px; font-size: 18px; font-weight: 600; color: #111827; }
        
        .menu-item { display: flex; gap: 16px; padding: 20px; border-bottom: 1px solid #f3f4f6; }
        .menu-item:last-child { border-bottom: none; }
        
        .item-info { flex: 1; }
        .item-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .veg-indicator, .non-veg-indicator { font-size: 12px; }
        .item-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #111827; }
        
        .item-meta { display: flex; gap: 16px; margin-bottom: 8px; font-size: 14px; }
        .rating { color: #f59e0b; }
        .info-btn { color: #f59e0b; }
        
        .item-description { margin: 0 0 12px 0; color: #6b7280; font-size: 14px; line-height: 1.4; }
        
        .item-footer { display: flex; justify-content: space-between; align-items: center; }
        .price { font-size: 16px; font-weight: 600; color: #111827; }
        
        .add-btn { background: var(--brand-color); color: #fff; border: none; padding: 8px 16px; border-radius: 6px; font-weight: 500; cursor: pointer; }
        
        .quantity-selector { display: flex; align-items: center; background: var(--brand-color); border-radius: 6px; overflow: hidden; }
        .qty-btn { background: none; border: none; color: #fff; width: 32px; height: 32px; cursor: pointer; font-weight: 600; }
        .qty-count { background: #fff; color: var(--brand-color); min-width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: 600; }
        
        .item-image { width: 100px; height: 80px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
        .item-image img { width: 100%; height: 100%; object-fit: cover; }
        
        .bottom-cart { position: fixed; bottom: 0; left: 0; right: 0; background: var(--brand-color); color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; }
        .cart-info { display: flex; align-items: center; gap: 8px; }
        .checkout-btn { background: rgba(255,255,255,0.2); color: #fff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 600; }
        
        .loading, .error { text-align: center; padding: 40px; color: #6b7280; }
      `}</style>
    </div>
  )
}
