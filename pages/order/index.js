// pages/order/index.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import MenuDisplay from '../../components/customer/MenuDisplay'
import Cart from '../../components/customer/Cart'
import Alert from '../../components/Alert'

export default function OrderPage() {
  const router = useRouter()
  const { r: restaurantId, t: tableNumber } = router.query
  
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [categories, setCategories] = useState([])
  const [cart, setCart] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCart, setShowCart] = useState(false)

  useEffect(() => {
    if (!restaurantId) return
    loadRestaurantData()
  }, [restaurantId])

  // Load from localStorage on mount
  useEffect(() => {
    if (!restaurantId || !tableNumber) return
    const stored = localStorage.getItem(`cart_${restaurantId}_${tableNumber}`)
    if (stored) {
      try {
        setCart(JSON.parse(stored))
      } catch {}
    }
  }, [restaurantId, tableNumber])

  // Save to localStorage whenever cart changes
  useEffect(() => {
    if (!restaurantId || !tableNumber) return
    localStorage.setItem(`cart_${restaurantId}_${tableNumber}`, JSON.stringify(cart))
  }, [cart, restaurantId, tableNumber])

  const loadRestaurantData = async () => {
    try {
      setLoading(true)
      
      // Load restaurant with profile data
      const { data: restaurantData, error: restError } = await supabase
        .from('restaurants')
        .select(`
          id, name, online_paused,
          restaurant_profiles(brand_color, phone)
        `)
        .eq('id', restaurantId)
        .single()
      
      if (restError) throw restError
      if (restaurantData.online_paused) throw new Error('Restaurant is currently closed')
      
      // Load menu items
      const { data: menuData, error: menuError } = await supabase
        .from('menu_items')
        .select('id, name, price, description, image_url, category, veg, status')
        .eq('restaurant_id', restaurantId)
        .eq('status', 'available')
        .order('category')
        .order('name')

      if (menuError) throw menuError

      // Extract unique categories
      const uniqueCategories = [...new Set(menuData?.map(item => item.category) || [])].filter(Boolean)
      
      setRestaurant(restaurantData)
      setMenuItems(menuData || [])
      setCategories(uniqueCategories.map(name => ({ name })))
      
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (item, quantity = 1) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        return prev.map(c => c.id === item.id 
          ? { ...c, quantity: Math.max(0, c.quantity + quantity) }
          : c
        ).filter(c => c.quantity > 0)
      }
      return [...prev, { ...item, quantity }]
    })
  }

  const updateCartItem = (itemId, quantity) => {
    if (quantity === 0) {
      setCart(prev => prev.filter(c => c.id !== itemId))
    } else {
      setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity } : c))
    }
  }

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  if (loading) return <div className="loading-screen">Loading menu...</div>
  if (error) return <Alert type="error">{error}</Alert>

  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b'

  return (
    <div className="order-page" style={{'--brand-color': brandColor}}>
      {/* Header */}
      <header className="restaurant-header">
        <div className="restaurant-info">
          <h1>{restaurant.name}</h1>
          <p className="table-info">Table {tableNumber}</p>
        </div>
        {cartItemsCount > 0 && (
          <button 
            className="cart-button"
            onClick={() => setShowCart(true)}
          >
            <span className="cart-icon">🛒</span>
            <span className="cart-count">{cartItemsCount}</span>
            <span className="cart-total">₹{cartTotal.toFixed(0)}</span>
          </button>
        )}
      </header>

      {/* Menu Display */}
      <MenuDisplay 
        items={menuItems}
        categories={categories}
        onAddToCart={addToCart}
        cart={cart}
      />

      {/* Cart Drawer */}
      {showCart && (
        <Cart
          items={cart}
          restaurant={restaurant}
          tableNumber={tableNumber}
          onUpdateItem={updateCartItem}
          onClose={() => setShowCart(false)}
          onOrderSuccess={() => {
            // Clear cart after successful order
            setCart([])
            localStorage.removeItem(`cart_${restaurantId}_${tableNumber}`)
          }}
        />
      )}

      {/* Bottom Navigation */}
      {cartItemsCount > 0 && (
        <div className="bottom-nav">
          <button onClick={() => setShowCart(true)} className="view-cart-btn">
            <div className="cart-summary">
              <span className="items-count">{cartItemsCount} items</span>
              <span className="cart-amount">₹{cartTotal.toFixed(0)}</span>
            </div>
            <span className="view-text">View Cart</span>
          </button>
        </div>
      )}

      <style jsx>{`
        .order-page { 
          min-height: 100vh; 
          background: #f8f9fa; 
          padding-bottom: ${cartItemsCount > 0 ? '80px' : '0'};
        }
        .loading-screen { 
          display: flex; align-items: center; justify-content: center; 
          height: 100vh; font-size: 1.2rem; color: #666; 
        }
        .restaurant-header {
          background: #fff; padding: 1rem; border-bottom: 1px solid #e5e7eb;
          display: flex; justify-content: space-between; align-items: center;
          position: sticky; top: 0; z-index: 40; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .restaurant-info h1 { 
          margin: 0; font-size: 1.5rem; color: #111827; font-weight: 700;
        }
        .table-info { 
          margin: 4px 0 0 0; color: #6b7280; font-size: 0.9rem; 
        }
        .cart-button {
          display: flex; align-items: center; gap: 0.5rem;
          background: var(--brand-color); color: #fff; border: none;
          padding: 0.75rem 1rem; border-radius: 25px;
          font-weight: 600; cursor: pointer; box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }
        .cart-count {
          background: rgba(255,255,255,0.3); border-radius: 50%;
          min-width: 22px; height: 22px; font-size: 0.75rem;
          display: flex; align-items: center; justify-content: center;
        }
        .bottom-nav {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 50;
          padding: 1rem; background: #fff; border-top: 1px solid #e5e7eb;
        }
        .view-cart-btn {
          width: 100%; background: var(--brand-color); color: #fff;
          border: none; border-radius: 12px; padding: 1rem;
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; font-size: 1rem; font-weight: 600;
        }
        .cart-summary { display: flex; flex-direction: column; align-items: flex-start; }
        .items-count { font-size: 0.9rem; opacity: 0.9; }
        .cart-amount { font-size: 1.1rem; }
        .view-text { font-size: 1rem; }
      `}</style>
    </div>
  )
}
