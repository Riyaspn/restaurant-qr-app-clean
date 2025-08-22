import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function PaymentPage() {
  const router = useRouter()
  const { r: restaurantId, t: tableNumber, total } = router.query
  
  const [restaurant, setRestaurant] = useState(null)
  const [cart, setCart] = useState([])
  const [selectedPayment, setSelectedPayment] = useState('cash')
  const [loading, setLoading] = useState(false)
  const [specialInstructions, setSpecialInstructions] = useState('')

  const totalAmount = parseFloat(total) || 0

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

  const handlePayment = async () => {
    setLoading(true)
    
    try {
      const orderData = {
        restaurant_id: restaurantId,
        restaurant_name: restaurant.name,
        table_number: tableNumber,
        items: cart.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          veg: i.veg || false
        })),
        subtotal: totalAmount,
        tax: 0,
        total_amount: totalAmount,
        payment_method: selectedPayment === 'cash' ? 'cash' : 'online',
        special_instructions: specialInstructions.trim(),
        payment_status: selectedPayment === 'cash' ? 'pending' : 'completed'
      }

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      localStorage.removeItem(`cart_${restaurantId}_${tableNumber}`)
      
      const paymentMethod = selectedPayment === 'cash' ? 'cash' : 'online'
      window.location.href = `/order/success?id=${result.order_id}&method=${paymentMethod}`
      
    } catch (error) {
      console.error('Payment failed:', error)
      alert(`Order failed: ${error.message}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b'

  const paymentMethods = [
    { id: 'cash', name: 'Pay at Counter', icon: '💵' },
    { id: 'upi', name: 'UPI Payment', icon: '📱' },
    { id: 'card', name: 'Card Payment', icon: '💳' }
  ]

  return (
    <div style={{minHeight: '100vh', background: '#f8f9fa', paddingBottom: '120px'}}>
      <header style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: '#fff', borderBottom: '1px solid #e5e7eb'}}>
        <button onClick={() => router.back()} style={{background: 'none', border: 'none', padding: '8px', cursor: 'pointer'}}>
          ←
        </button>
        <h1 style={{margin: 0, fontSize: '1.25rem', fontWeight: 600, flex: 1, textAlign: 'center'}}>Payment</h1>
        <div style={{fontSize: '14px', fontWeight: 600, color: brandColor}}>₹{totalAmount.toFixed(2)}</div>
      </header>

      <div style={{background: '#fff', padding: '20px', marginBottom: '8px'}}>
        <h3 style={{margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600}}>📦 Order Summary</h3>
        <div style={{marginBottom: '16px'}}>
          {cart.slice(0, 3).map(item => (
            <div key={item.id} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '14px', color: '#374151'}}>
              <span>{item.quantity}x {item.name}</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          {cart.length > 3 && (
            <div style={{fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>+{cart.length - 3} more items</div>
          )}
        </div>
        
        <div style={{borderTop: '1px solid #e5e7eb', paddingTop: '12px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '16px'}}>
            <span>Final Total</span>
            <span>₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div style={{background: '#fff', padding: '20px', marginBottom: '8px'}}>
        <h3 style={{margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600}}>💳 Choose Payment Method</h3>
        
        {paymentMethods.map(method => (
          <label key={method.id} style={{display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', border: selectedPayment === method.id ? `1px solid ${brandColor}` : '1px solid #e5e7eb', borderRadius: '8px', marginBottom: '8px', cursor: 'pointer', background: selectedPayment === method.id ? '#fffbeb' : '#fff'}}>
            <input
              type="radio"
              value={method.id}
              checked={selectedPayment === method.id}
              onChange={(e) => setSelectedPayment(e.target.value)}
              style={{margin: 0}}
            />
            <span style={{fontSize: '20px'}}>{method.icon}</span>
            <span style={{flex: 1}}>{method.name}</span>
            <span style={{fontWeight: 600}}>₹{totalAmount.toFixed(2)}</span>
          </label>
        ))}
      </div>

      <div style={{background: '#fff', padding: '20px', marginBottom: '8px'}}>
        <h3 style={{margin: '0 0 12px 0', fontSize: '16px', fontWeight: 600}}>📝 Special Instructions (Optional)</h3>
        <textarea
          placeholder="Any special requests for your order? (e.g., extra spicy, no onions, etc.)"
          value={specialInstructions}
          onChange={(e) => setSpecialInstructions(e.target.value)}
          rows={3}
          maxLength={200}
          style={{width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontFamily: 'inherit', resize: 'vertical'}}
        />
        <div style={{textAlign: 'right', fontSize: '12px', color: '#6b7280', marginTop: '4px'}}>{specialInstructions.length}/200</div>
      </div>

      <div style={{position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px', background: '#fff', borderTop: '1px solid #e5e7eb'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px', color: '#374151'}}>
          <span>💰 Total: ₹{totalAmount.toFixed(2)}</span>
          <span>⏱️ Ready in 20 mins</span>
        </div>
        <button 
          onClick={handlePayment}
          disabled={loading}
          style={{width: '100%', background: brandColor, color: '#fff', border: 'none', padding: '16px', borderRadius: '8px', fontSize: '18px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1}}
        >
          {loading ? 'Processing...' : 
           selectedPayment === 'cash' ? 'Place Order' : 
           `Pay ₹${totalAmount.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}
