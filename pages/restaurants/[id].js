// File: pages/restaurants/[id].js

import { useState } from 'react'
import { supabase } from '../../services/supabase'
import QRCode from 'qrcode'

export async function getServerSideProps({ params, query }) {
  const { id } = params
  const tableNumber = query.table || ''

  // Fetch restaurant with UPI ID and tax rate
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select('id, name, upi_id, tax_rate')
    .eq('id', id)
    .single()

  if (restError || !restaurant) {
    return { notFound: true }
  }

  // Fetch available menu items
  const { data: menuItems, error: menuError } = await supabase
    .from('menu_items')
    .select('id, name, price, available')
    .eq('restaurant_id', id)
    .eq('available', true)
    .order('created_at')

  if (menuError) console.error('Menu fetch error:', menuError)

  return {
    props: {
      restaurant,
      menuItems: menuItems || [],
      tableNumber
    }
  }
}

export default function RestaurantPage({ restaurant, menuItems, tableNumber }) {
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [method, setMethod] = useState('cash')
  const [paymentQR, setPaymentQR] = useState('')

  // Calculate subtotal, tax, and final total
  const calculateTotals = () => {
    const items = menuItems.filter(i => cart[i.id])
    const subtotal = items.reduce((sum, i) => sum + i.price * cart[i.id], 0)
    const taxAmount = (subtotal * (restaurant.tax_rate || 0)) / 100
    const finalTotal = subtotal + taxAmount
    const itemCount = items.reduce((sum, i) => sum + cart[i.id], 0)
    return {
      items,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      finalTotal: finalTotal.toFixed(2),
      itemCount
    }
  }
  const totals = calculateTotals()

  const addItem = (itemId) => {
    setCart(c => ({ ...c, [itemId]: (c[itemId] || 0) + 1 }))
  }

  const removeItem = (itemId) => {
    setCart(c => {
      const nc = { ...c }
      if (nc[itemId] > 1) nc[itemId]--
      else delete nc[itemId]
      return nc
    })
  }

  const proceedToPayment = () => {
    if (!tableNumber) {
      alert('Invalid table. Please scan the correct QR code.')
      return
    }
    if (totals.itemCount === 0) {
      alert('Please select at least one item.')
      return
    }
    setShowPayment(true)
  }

  const confirmCashOrder = async () => {
    setLoading(true)
    const { items, subtotal, taxAmount, finalTotal } = totals
    const orderData = {
      restaurant_id: restaurant.id,
      table_number: tableNumber,
      items: items.map(i => ({ id: i.id, name: i.name, qty: cart[i.id], price: i.price })),
      subtotal: parseFloat(subtotal),
      tax_amount: parseFloat(taxAmount),
      total: parseFloat(finalTotal),
      payment_method: 'cash',
      payment_status: 'pending'
    }
    const { error } = await supabase.from('orders').insert([orderData])
    setLoading(false)
    if (error) {
      alert('Error placing order: ' + error.message)
    } else {
      alert('Order placed! Please pay cash at delivery.')
      setCart({})
      setShowPayment(false)
    }
  }

  const generatePaymentQR = async () => {
    if (!restaurant.upi_id) {
      alert('Restaurant UPI ID not configured. Please contact restaurant staff.')
      return
    }
    setLoading(true)
    const amount = totals.finalTotal
    const note = `Table ${tableNumber} - ${restaurant.name}`
    const upiUrl = `upi://pay?pa=${restaurant.upi_id}&pn=${encodeURIComponent(restaurant.name)}&am=${amount}&tn=${encodeURIComponent(note)}&cu=INR`
    try {
      const dataUrl = await QRCode.toDataURL(upiUrl)
      setPaymentQR(dataUrl)
    } catch (error) {
      console.error('Error generating QR code:', error)
      alert('Failed to generate UPI QR code.')
    }
    setLoading(false)
  }

  const confirmUPIPayment = async () => {
    setLoading(true)
    const { items, subtotal, taxAmount, finalTotal } = totals
    const orderData = {
      restaurant_id: restaurant.id,
      table_number: tableNumber,
      items: items.map(i => ({ id: i.id, name: i.name, qty: cart[i.id], price: i.price })),
      subtotal: parseFloat(subtotal),
      tax_amount: parseFloat(taxAmount),
      total: parseFloat(finalTotal),
      payment_method: 'upi',
      payment_status: 'completed'
    }
    const { error } = await supabase.from('orders').insert([orderData])
    setLoading(false)
    if (error) {
      alert('Error saving order: ' + error.message)
    } else {
      alert('Payment confirmed! Thank you.')
      setCart({})
      setShowPayment(false)
      setPaymentQR('')
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 20 }}>
      <h1>{restaurant.name} - Menu</h1>
      <div style={{ margin: '20px 0' }}>
        <label>
          Table Number:{' '}
          <input
            type="text"
            value={tableNumber}
            readOnly
            style={{ padding: 5, width: 80, backgroundColor: '#f3f3f3', border: '1px solid #ccc' }}
          />
        </label>
      </div>
      {!showPayment ? (
        <>
          {menuItems.length === 0 && <p>No menu items available.</p>}
          {menuItems.map(item => (
            <div key={item.id} style={{ marginBottom: 10 }}>
              <span>{item.name} — ₹{item.price}</span>
              <button onClick={() => addItem(item.id)} style={{ marginLeft: 20, padding: '4px 8px' }}>
                Add
              </button>
              {cart[item.id] && <span style={{ marginLeft: 8 }}>×{cart[item.id]}</span>}
            </div>
          ))}
          {totals.itemCount > 0 && (
            <div style={{ marginTop: 20 }}>
              <p>Subtotal: ₹{totals.subtotal}</p>
              <p>GST ({restaurant.tax_rate || 0}%): ₹{totals.taxAmount}</p>
              <p><strong>Total: ₹{totals.finalTotal}</strong></p>
              <button
                onClick={proceedToPayment}
                disabled={loading}
                style={{ background: '#0070f3', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: 4 }}
              >
                {loading ? 'Processing…' : 'Proceed to Payment'}
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ marginTop: 20 }}>
          <h2>Select Payment Method</h2>
          <label>
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={method === 'cash'}
              onChange={() => setMethod('cash')}
            /> Pay by Cash
          </label>
          <label style={{ marginLeft: 20 }}>
            <input
              type="radio"
              name="paymentMethod"
              value="upi"
              checked={method === 'upi'}
              onChange={() => setMethod('upi')}
            /> Pay by UPI
          </label>
          {method === 'cash' ? (
            <button
              onClick={confirmCashOrder}
              disabled={loading}
              style={{ marginTop: 20, background: '#28a745', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: 4 }}
            >
              {loading ? 'Placing Order…' : 'Confirm Cash Order'}
            </button>
          ) : (
            <>
              {!paymentQR ? (
                <button
                  onClick={generatePaymentQR}
                  disabled={loading}
                  style={{ marginTop: 20, background: '#4CAF50', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: 4 }}
                >
                  {loading ? 'Generating QR…' : `Pay ₹${totals.finalTotal} via UPI`}
                </button>
              ) : (
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <img src={paymentQR} alt="UPI QR Code" style={{ width: 200 }} />
                  <p>Scan this QR in your UPI app</p>
                  <button
                    onClick={confirmUPIPayment}
                    disabled={loading}
                    style={{ background: '#0070f3', color: '#fff', padding: '10px 20px', border: 'none', borderRadius: 4 }}
                  >
                    {loading ? 'Saving Order…' : "I've Paid"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
