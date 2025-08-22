import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

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

  // Load cart immediately when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && restaurantId && tableNumber) {
      const cartKey = `cart_${restaurantId}_${tableNumber}`
      const stored = localStorage.getItem(cartKey)
      if (stored) {
        try {
          const parsedCart = JSON.parse(stored)
          console.log('Loading cart from localStorage:', parsedCart)
          setCart(parsedCart)
        } catch (e) {
          console.warn('Failed to parse cart from localStorage:', e)
          localStorage.removeItem(cartKey)
        }
      }
    }
  }, [restaurantId, tableNumber])

  // Save cart whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && restaurantId && tableNumber && cart.length >= 0) {
      const cartKey = `cart_${restaurantId}_${tableNumber}`
      localStorage.setItem(cartKey, JSON.stringify(cart))
      console.log('Saving cart to localStorage:', cart)
    }
  }, [cart, restaurantId, tableNumber])

  useEffect(() => {
    if (restaurantId) {
      loadData()
    }
  }, [restaurantId])

  const loadData = async () => {
    try {
      setLoading(true)
      
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
        orderCount: Math.floor(Math.random() * 100) + 20
      }))

      setRestaurant(restaurantData)
      setMenuItems(enhanced)
    } catch (err) {
      setError(err.message || 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const addToCart = (item) => {
    console.log('Adding item to cart:', item.name)
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id)
      if (existing) {
        const newCart = prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c)
        console.log('Updated existing item, new cart:', newCart)
        return newCart
      }
      const newCart = [...prev, { ...item, quantity: 1 }]
      console.log('Added new item, new cart:', newCart)
      return newCart
    })
  }

  const updateCartItem = (itemId, quantity) => {
    console.log('Updating cart item:', itemId, 'to quantity:', quantity)
    if (quantity === 0) {
      setCart(prev => {
        const newCart = prev.filter(c => c.id !== itemId)
        console.log('Removed item, new cart:', newCart)
        return newCart
      })
    } else {
      setCart(prev => {
        const newCart = prev.map(c => c.id === itemId ? { ...c, quantity } : c)
        console.log('Updated quantity, new cart:', newCart)
        return newCart
      })
    }
  }

  const getItemQuantity = (itemId) => {
    const item = cart.find(c => c.id === itemId)
    return item ? item.quantity : 0
  }

  const filteredItems = menuItems.filter(item => {
    if (filterMode === 'veg' && !item.veg) return false
    if (filterMode === 'popular' && !item.popular) return false
    if (filterMode === 'offers' && !item.discount) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return item.name.toLowerCase().includes(query) || 
             (item.description || '').toLowerCase().includes(query)
    }
    return true
  })

  const groupedItems = filteredItems.reduce((acc, item) => {
    const cat = item.category || 'Others'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0)
  const cartItemsCount = cart.reduce((s, i) => s + i.quantity, 0)

  // Enhanced checkout function
  const handleCheckout = () => {
    if (cartItemsCount === 0) {
      alert('Please add items to your cart first')
      return
    }
    
    // Ensure cart is saved before navigation
    if (typeof window !== 'undefined' && restaurantId && tableNumber) {
      const cartKey = `cart_${restaurantId}_${tableNumber}`
      localStorage.setItem(cartKey, JSON.stringify(cart))
      console.log('Final cart save before checkout:', cart)
    }
    
    // Navigate to cart page
    router.push(`/order/cart?r=${restaurantId}&t=${tableNumber}`)
  }

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Loading menu...</div>
  if (error) return <div style={{padding: 40, textAlign: 'center', color: 'red'}}>{error}</div>

  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b'

  return (
    <div style={{minHeight: '100vh', background: '#f8f9fa', paddingBottom: cartItemsCount > 0 ? '90px' : '0'}}>
      <header style={{padding: '1rem', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '12px'}}>
        <button onClick={() => router.back()} style={{background: 'none', border: 'none', padding: '8px', cursor: 'pointer'}}>
          ←
        </button>
        <div style={{flex: 1}}>
          <h1 style={{margin: 0, fontSize: '1.25rem', fontWeight: 600}}>{restaurant?.name || 'Restaurant'}</h1>
          <div style={{fontSize: '14px', color: '#666', marginTop: '4px'}}>
            <span style={{color: brandColor, fontWeight: 500}}>⏱️ 15-20 mins</span>
            <span style={{marginLeft: '16px', color: '#f59e0b'}}>⭐ 4.3 (500+ orders)</span>
          </div>
        </div>
      </header>

      <div style={{padding: '1rem', background: '#fff'}}>
        <input
          type="text"
          placeholder="Search for dishes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '16px'}}
        />
      </div>

      <div style={{display: 'flex', gap: '8px', padding: '1rem', background: '#fff', borderBottom: '1px solid #f3f4f6', overflowX: 'auto'}}>
        {['all', 'veg', 'popular', 'offers'].map(mode => (
          <button 
            key={mode}
            onClick={() => setFilterMode(mode)}
            style={{
              padding: '8px 16px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '20px', 
              background: filterMode === mode ? brandColor : '#fff',
              color: filterMode === mode ? '#fff' : '#000',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '14px'
            }}
          >
            {mode === 'all' ? 'All Items' : 
             mode === 'veg' ? '🟢 Veg Only' : 
             mode === 'popular' ? '🔥 Popular' : '🎉 Offers'}
          </button>
        ))}
      </div>

      <div>
        {Object.entries(groupedItems).map(([category, items]) => (
          <section key={category} style={{background: '#fff', marginBottom: '8px'}}>
            <h2 style={{margin: 0, padding: '16px 20px 8px', fontSize: '18px', fontWeight: 600}}>
              {category} ({items.length} items)
            </h2>
            
            {items.map(item => {
              const quantity = getItemQuantity(item.id)
              const discountedPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price
              
              return (
                <div key={item.id} style={{display: 'flex', gap: '16px', padding: '20px', borderBottom: '1px solid #f3f4f6'}}>
                  <div style={{flex: 1}}>
                    <div style={{display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap'}}>
                      {item.popular && <span style={{padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: '#fef3c7', color: '#f59e0b'}}>🔥 Popular</span>}
                      {item.rating >= 4.5 && <span style={{padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: '#dcfce7', color: '#16a34a'}}>⭐ Top Rated</span>}
                      {item.discount && <span style={{padding: '2px 8px', borderRadius: '12px', fontSize: '12px', background: '#fecaca', color: '#dc2626'}}>{item.discount}% OFF</span>}
                    </div>
                    
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px'}}>
                      <span style={{fontSize: '12px'}}>{item.veg ? '🟢' : '🔺'}</span>
                      <h3 style={{margin: 0, fontSize: '16px', fontWeight: 600}}>{item.name}</h3>
                    </div>
                    
                    <div style={{display: 'flex', gap: '12px', marginBottom: '8px', fontSize: '13px'}}>
                      <span style={{color: '#f59e0b', fontWeight: 500}}>⭐ {item.rating}</span>
                      <span style={{color: '#6b7280'}}>({item.orderCount} orders)</span>
                    </div>
                    
                    {item.description && (
                      <p style={{margin: '0 0 12px 0', color: '#6b7280', fontSize: '14px'}}>{item.description}</p>
                    )}
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        {item.discount ? (
                          <>
                            <span style={{textDecoration: 'line-through', color: '#9ca3af', fontSize: '14px'}}>₹{item.price.toFixed(2)}</span>
                            <span style={{fontSize: '16px', fontWeight: 600}}>₹{discountedPrice.toFixed(2)}</span>
                            <span style={{background: '#dcfce7', color: '#16a34a', padding: '2px 6px', borderRadius: '4px', fontSize: '12px'}}>Save ₹{(item.price - discountedPrice).toFixed(2)}</span>
                          </>
                        ) : (
                          <span style={{fontSize: '16px', fontWeight: 600}}>₹{item.price.toFixed(2)}</span>
                        )}
                      </div>
                      
                      {quantity > 0 ? (
                        <div style={{display: 'flex', alignItems: 'center', background: brandColor, borderRadius: '6px', overflow: 'hidden'}}>
                          <button onClick={() => updateCartItem(item.id, quantity - 1)} style={{background: 'none', border: 'none', color: '#fff', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 600}}>-</button>
                          <span style={{background: '#fff', color: brandColor, minWidth: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600}}>{quantity}</span>
                          <button onClick={() => updateCartItem(item.id, quantity + 1)} style={{background: 'none', border: 'none', color: '#fff', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 600}}>+</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart({ ...item, price: discountedPrice })} style={{background: brandColor, color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, cursor: 'pointer'}}>Add +</button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{width: '100px', height: '80px', borderRadius: '8px', overflow: 'hidden', position: 'relative'}}>
                    <img src={item.image_url || '/placeholder-food.jpg'} alt={item.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    {item.discount && (
                      <div style={{position: 'absolute', top: '4px', right: '4px', background: '#dc2626', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600}}>{item.discount}% OFF</div>
                    )}
                  </div>
                </div>
              )
            })}
          </section>
        ))}
      </div>

      {cartItemsCount > 0 && (
        <div style={{position: 'fixed', bottom: 0, left: 0, right: 0, background: brandColor, color: '#fff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '12px', flex: 1}}>
            <span>🛒</span>
            <div>
              <div style={{fontSize: '14px'}}>{cartItemsCount} Item{cartItemsCount !== 1 ? 's' : ''}</div>
              <div style={{fontWeight: 700, fontSize: '16px'}}>₹{cartTotal.toFixed(2)}</div>
            </div>
            <span style={{fontSize: '12px', opacity: 0.9}}>⏱️ 20 mins</span>
          </div>
          <button 
            onClick={handleCheckout}
            style={{background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer'}}
          >
            Checkout →
          </button>
        </div>
      )}
    </div>
  )
}
