// File: pages/dashboard.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../services/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [restaurant, setRestaurant] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [newItemName, setNewItemName] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [upiId, setUpiId] = useState('')
  const [taxRate, setTaxRate] = useState('')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        initializeRestaurant(session.user)
      } else {
        router.push('/login')
      }
    })
    ;(async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
      if (currentUser) {
        setUser(currentUser)
        initializeRestaurant(currentUser)
      } else {
        router.push('/login')
      }
    })()
    return () => {
      listener.subscription.unsubscribe()
    }
  }, [router])

  const initializeRestaurant = async (currentUser) => {
    setLoading(true)
    const { data: existingRestaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_email', currentUser.email)
      .single()
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching restaurant:', fetchError)
      setLoading(false)
      return
    }
    let targetRestaurant = existingRestaurant
    if (!existingRestaurant) {
      const { data: newRestaurant, error: insertError } = await supabase
        .from('restaurants')
        .insert([{ owner_email: currentUser.email, name: 'My New Restaurant' }])
        .select()
        .single()
      if (insertError) {
        console.error('Error creating restaurant:', insertError)
        setLoading(false)
        return
      }
      targetRestaurant = newRestaurant
    }
    setRestaurant(targetRestaurant)
    setUpiId(targetRestaurant.upi_id || '')
    setTaxRate(targetRestaurant.tax_rate ?? '')
    await Promise.all([loadMenuItems(targetRestaurant.id), loadOrders(targetRestaurant.id)])
    setLoading(false)
  }

  const loadMenuItems = async (restaurantId) => {
    const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurantId).order('created_at')
    setMenuItems(data || [])
  }

  const loadOrders = async (restaurantId) => {
    const { data } = await supabase.from('orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false })
    setOrders(data || [])
  }

  const addMenuItem = async (e) => {
    e.preventDefault()
    if (!newItemName.trim() || isNaN(parseFloat(newItemPrice))) return
    await supabase
      .from('menu_items')
      .insert([{ restaurant_id: restaurant.id, name: newItemName.trim(), price: parseFloat(newItemPrice) }])
    setNewItemName('')
    setNewItemPrice('')
    loadMenuItems(restaurant.id)
  }

  const toggleItemAvailability = async (item) => {
    await supabase.from('menu_items').update({ available: !item.available }).eq('id', item.id)
    loadMenuItems(restaurant.id)
  }

  const markCashCollected = async (orderId) => {
    await supabase.from('orders').update({ payment_status: 'completed' }).eq('id', orderId)
    loadOrders(restaurant.id)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const saveRestaurantSettings = async () => {
    setLoading(true)
    const updates = {
      upi_id: upiId,
      tax_rate: parseFloat(taxRate) || 0,
    }
    const { error } = await supabase.from('restaurants').update(updates).eq('id', restaurant.id)
    setLoading(false)
    if (error) {
      alert('Error saving settings: ' + error.message)
    } else {
      alert('Settings updated!')
      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurant.id)
        .single()
      if (!fetchError) {
        setRestaurant(data)
        setUpiId(data.upi_id || '')
        setTaxRate(data.tax_rate ?? '')
      }
    }
  }

  if (loading) {
    return <div style={{ padding: 20 }}>Loading...</div>
  }

  if (!restaurant) {
    return <div style={{ padding: 20 }}>No restaurant data available.</div>
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <h1>{restaurant.name} - Dashboard</h1>
        <button onClick={logout} style={{ padding: '5px 10px' }}>
          Logout
        </button>
      </header>

      <section style={{ marginBottom: 30 }}>
        <h2>Your QR Code URL:</h2>
        <code style={{ background: '#f0f0f0', padding: 10, display: 'block' }}>
          {`${baseUrl}/restaurants/${restaurant.id}?table=1`}
        </code>
        <p>
          <small>
            Change <code>table=1</code> for each table number.
          </small>
        </p>
      </section>

      {/* Restaurant Settings */}
      <section style={{ marginBottom: 30 }}>
        <h2>Restaurant Settings</h2>
        <label style={{ display: 'block', marginBottom: 12 }}>
          UPI ID:
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="merchant@bank"
            style={{ marginLeft: 10, padding: 6, width: '60%' }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Tax Rate (%):
          <input
            type="number"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
            placeholder="5.00"
            style={{ marginLeft: 10, padding: 6, width: '20%' }}
          />
        </label>
        <button
          onClick={saveRestaurantSettings}
          disabled={loading}
          style={{
            background: '#0070f3',
            color: '#fff',
            padding: '10px 20px',
            border: 'none',
            borderRadius: 4,
          }}
        >
          {loading ? 'Saving…' : 'Save Settings'}
        </button>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h2>Add Menu Item</h2>
        <form onSubmit={addMenuItem} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <input
            type="text"
            placeholder="Item name"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            style={{ padding: 8, flex: 1 }}
          />
          <input
            type="number"
            placeholder="Price"
            step="0.01"
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            style={{ padding: 8, width: 100 }}
          />
          <button type="submit" style={{ padding: '8px 16px' }}>
            Add Item
          </button>
        </form>
      </section>

      <section style={{ marginBottom: 30 }}>
        <h2>Menu Items ({menuItems.length})</h2>
        {menuItems.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 10,
              border: '1px solid #ddd',
              marginBottom: 10,
            }}
          >
            <div>
              <strong>{item.name}</strong> – ₹{item.price.toFixed(2)}
              <span style={{ marginLeft: 10, color: item.available ? 'green' : 'red' }}>
                {item.available ? '✓ Available' : '✗ Out of Stock'}
              </span>
            </div>
            <button
              onClick={() => toggleItemAvailability(item)}
              style={{
                padding: '5px 10px',
                background: item.available ? '#ff4444' : '#44aa44',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
              }}
            >
              {item.available ? 'Mark Out of Stock' : 'Mark Available'}
            </button>
          </div>
        ))}
      </section>

      <section>
        <h2>Recent Orders ({orders.length})</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Table</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Items</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Total</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Method</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Status</th>
              <th style={{ borderBottom: '1px solid #ccc', padding: 8 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{order.table_number}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{order.items.length}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>₹{order.total.toFixed(2)}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{order.payment_method.toUpperCase()}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>{order.payment_status}</td>
                <td style={{ borderBottom: '1px solid #eee', padding: 8 }}>
                  {/* Fix condition: use === instead of = */}
                  {order.payment_method === 'cash' && order.payment_status === 'pending' && (
                    <button onClick={() => markCashCollected(order.id)} style={{ padding: '4px 8px' }}>
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
