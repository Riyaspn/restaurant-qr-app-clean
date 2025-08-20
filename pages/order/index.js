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
    if (restaurantId) loadRestaurantData()
  }, [restaurantId])

  useEffect(()=>{
    if(restaurantId&&tableNumber){
      const s=localStorage.getItem(`cart_${restaurantId}_${tableNumber}`)
      if(s) setCart(JSON.parse(s))
    }
  },[restaurantId,tableNumber])
  useEffect(()=>{
    if(restaurantId&&tableNumber) localStorage.setItem(`cart_${restaurantId}_${tableNumber}`,JSON.stringify(cart))
  },[cart,restaurantId,tableNumber])

  async function loadRestaurantData(){
    try{
      setLoading(true)
      const { data, error } = await supabase
        .from('restaurants')
        .select('id,name,online_paused,restaurant_profiles(brand_color,phone)')
        .eq('id',restaurantId).single()
      if(error) throw error
      if(data.online_paused) throw new Error('Closed')
      const { data: items } = await supabase
        .from('menu_items')
        .select('id,name,price,description,image_url,category,veg,status')
        .eq('restaurant_id',restaurantId).eq('status','available')
      const cats=[...new Set((items||[]).map(i=>i.category))].filter(Boolean).map(n=>({name:n}))
      setRestaurant(data); setMenuItems(items||[]); setCategories(cats)
    }catch(e){
      setError(e.message)
    }finally{setLoading(false)}
  }

  const addToCart=(item,q=1)=>{
    setCart(c=>{const ex=c.find(x=>x.id===item.id)
      if(ex) return c.map(x=>x.id===item.id?{...x,quantity:Math.max(0,x.quantity+q)}:x).filter(x=>x.quantity>0)
      return[...c,{...item,quantity:q}]
    })
  }
  const updateCartItem=(id,q)=>setCart(c=>q?c.map(x=>x.id===id?{...x,quantity:q}:x):c.filter(x=>x.id!==id))
  const total=cart.reduce((s,i)=>s+i.price*i.quantity,0)
  const count=cart.reduce((s,i)=>s+i.quantity,0)
  if(loading) return <div>Loading…</div>
  if(error) return <Alert type="error">{error}</Alert>

  return (
    <div style={{padding:20}}>
      <h1>{restaurant.name} — Table {tableNumber}</h1>
      <MenuDisplay items={menuItems} categories={categories} onAddToCart={addToCart} cart={cart}/>
      {count>0 && (
        <div style={{position:'fixed',bottom:0,left:0,right:0,background:'#fff',padding:10,display:'flex',justifyContent:'space-between'}}>
          <span>{count} items • ₹{total.toFixed(0)}</span>
          <button onClick={()=>setShowCart(true)}>View Cart</button>
        </div>
      )}
      {showCart&&(
        <Cart items={cart} restaurant={restaurant} tableNumber={tableNumber}
          onUpdateItem={updateCartItem}
          onClose={()=>setShowCart(false)}
          onOrderSuccess={()=>{setCart([]);localStorage.removeItem(`cart_${restaurantId}_${tableNumber}`)}}
        />
      )}
    </div>
  )
}
