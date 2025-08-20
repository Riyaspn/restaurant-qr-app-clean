// pages/onboarding/complete.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../services/supabase'
import { useRequireAuth } from '../../lib/useRequireAuth'

export default function OnboardingComplete() {
  const router = useRouter()
  const { user, checking } = useRequireAuth()
  const [restaurant, setRestaurant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qrOrder, setQrOrder] = useState(null)
  const [orderingQR, setOrderingQR] = useState(false)

  useEffect(() => {
    if (!user) return
    loadRestaurantData()
  }, [user])

  const loadRestaurantData = async () => {
    try {
      const { data: restaurantData, error: restError } = await supabase
        .from('restaurants')
        .select(`
          *,
          restaurant_profiles(*)
        `)
        .eq('owner_id', user.id)
        .single()

      if (restError) throw restError
      setRestaurant(restaurantData)

      // Check if QR order already exists
      const { data: existingOrder } = await supabase
        .from('qr_orders')
        .select('*')
        .eq('restaurant_id', restaurantData.id)
        .single()

      setQrOrder(existingOrder)
    } catch (error) {
      console.error('Failed to load restaurant:', error)
    } finally {
      setLoading(false)
    }
  }

  const orderQRStands = async (standType) => {
    setOrderingQR(true)
    try {
      const response = await fetch('/api/qr-orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          stand_type: standType
        })
      })

      if (!response.ok) throw new Error('Failed to create QR order')
      
      const result = await response.json()
      setQrOrder(result.qr_order)
      
      // Show success message
      alert('QR stands ordered successfully! You will receive a confirmation email shortly.')
      
    } catch (error) {
      console.error('QR order failed:', error)
      alert('Failed to order QR stands. Please try again or contact support.')
    } finally {
      setOrderingQR(false)
    }
  }

  if (checking || loading) return <LoadingScreen />
  if (!restaurant) return <div>Restaurant not found</div>

  const profile = restaurant.restaurant_profiles || {}
  const tablesCount = profile.tables_count || 10

  return (
    <div className="onboarding-complete">
      <div className="container">
        <div className="success-header">
          <div className="success-icon">🎉</div>
          <h1>Welcome to Cafe QR!</h1>
          <p>Your restaurant <strong>{restaurant.name}</strong> is now set up</p>
        </div>

        <div className="restaurant-summary">
          <h2>Restaurant Details</h2>
          <div className="detail-grid">
            <div className="detail-item">
              <span className="label">Restaurant Name:</span>
              <span className="value">{restaurant.name}</span>
            </div>
            <div className="detail-item">
              <span className="label">Tables:</span>
              <span className="value">{tablesCount} tables</span>
            </div>
            <div className="detail-item">
              <span className="label">Address:</span>
              <span className="value">{profile.shipping_address_line1}</span>
            </div>
            <div className="detail-item">
              <span className="label">Phone:</span>
              <span className="value">{profile.phone}</span>
            </div>
          </div>
        </div>

        {!qrOrder ? (
          <div className="qr-ordering-section">
            <h2>📱 Order Your Table QR Codes</h2>
            <p>Get professional QR code stands delivered to your restaurant</p>

            <div className="qr-options">
              <div className="qr-option basic">
                <div className="option-header">
                  <h3>🗂️ Table Tent Cards</h3>
                  <div className="price">₹{25 * tablesCount}</div>
                </div>
                <div className="option-features">
                  <p>✓ Laminated table tent cards</p>
                  <p>✓ Water-resistant</p>
                  <p>✓ Easy to replace</p>
                  <p>✓ Delivery in 3-5 days</p>
                </div>
                <button 
                  onClick={() => orderQRStands('tent_cards')}
                  disabled={orderingQR}
                  className="order-btn basic-btn"
                >
                  {orderingQR ? 'Ordering...' : 'Order Table Tents'}
                </button>
              </div>

              <div className="qr-option premium">
                <div className="option-header">
                  <h3>✨ Acrylic Stands</h3>
                  <div className="price">₹{250 * tablesCount}</div>
                  <span className="popular">Most Popular</span>
                </div>
                <div className="option-features">
                  <p>✓ Premium acrylic stands</p>
                  <p>✓ Durable & elegant</p>
                  <p>✓ Restaurant branding</p>
                  <p>✓ Delivery in 5-7 days</p>
                </div>
                <button 
                  onClick={() => orderQRStands('acrylic_stands')}
                  disabled={orderingQR}
                  className="order-btn premium-btn"
                >
                  {orderingQR ? 'Ordering...' : 'Order Acrylic Stands'}
                </button>
              </div>

              <div className="qr-option luxury">
                <div className="option-header">
                  <h3>👑 Custom Wooden Stands</h3>
                  <div className="price">₹{600 * tablesCount}</div>
                </div>
                <div className="option-features">
                  <p>✓ Premium wooden stands</p>
                  <p>✓ Custom restaurant logo</p>
                  <p>✓ Luxury finish</p>
                  <p>✓ Delivery in 7-10 days</p>
                </div>
                <button 
                  onClick={() => orderQRStands('wooden_stands')}
                  disabled={orderingQR}
                  className="order-btn luxury-btn"
                >
                  {orderingQR ? 'Ordering...' : 'Order Wooden Stands'}
                </button>
              </div>
            </div>

            <div className="skip-section">
              <p>Want to start immediately? <button onClick={() => router.push('/dashboard')} className="skip-btn">Skip for now</button></p>
              <small>You can order QR stands anytime from your dashboard settings</small>
            </div>
          </div>
        ) : (
          <QROrderStatus order={qrOrder} restaurant={restaurant} />
        )}

        <div className="next-steps">
          <h2>🚀 You're All Set!</h2>
          <div className="action-cards">
            <div className="action-card">
              <h3>📋 Manage Menu</h3>
              <p>Add your dishes and set prices</p>
              <button onClick={() => router.push('/menu')} className="action-btn">
                Go to Menu
              </button>
            </div>
            <div className="action-card">
              <h3>📊 View Dashboard</h3>
              <p>Monitor orders and analytics</p>
              <button onClick={() => router.push('/dashboard')} className="action-btn">
                Open Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .onboarding-complete {
          min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }
        .container {
          max-width: 900px; margin: 0 auto; background: #fff;
          border-radius: 20px; padding: 40px 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .success-header { text-align: center; margin-bottom: 40px; }
        .success-icon { font-size: 64px; margin-bottom: 20px; }
        .success-header h1 { margin: 0 0 8px 0; color: #111827; font-size: 2rem; }
        .success-header p { color: #6b7280; font-size: 1.1rem; }
        
        .restaurant-summary {
          background: #f8f9fa; padding: 24px; border-radius: 12px; margin-bottom: 40px;
        }
        .restaurant-summary h2 { margin: 0 0 20px 0; color: #111827; }
        .detail-grid { display: grid; gap: 12px; }
        .detail-item { display: flex; justify-content: space-between; }
        .label { color: #6b7280; font-weight: 500; }
        .value { color: #111827; font-weight: 600; }
        
        .qr-ordering-section { margin-bottom: 40px; }
        .qr-ordering-section h2 { margin: 0 0 8px 0; color: #111827; }
        .qr-ordering-section > p { color: #6b7280; margin-bottom: 24px; }
        
        .qr-options { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
        .qr-option {
          border: 2px solid #e5e7eb; border-radius: 16px; padding: 24px;
          position: relative; background: #fff;
        }
        .qr-option.premium { border-color: #f59e0b; background: #fffbeb; }
        
        .option-header { margin-bottom: 20px; }
        .option-header h3 { margin: 0 0 8px 0; color: #111827; font-size: 1.2rem; }
        .price { font-size: 2rem; font-weight: 700; color: #059669; }
        .popular {
          position: absolute; top: -12px; right: 20px; background: #f59e0b;
          color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px;
          font-weight: 600;
        }
        
        .option-features { margin-bottom: 24px; }
        .option-features p { margin: 8px 0; color: #374151; font-size: 14px; }
        
        .order-btn {
          width: 100%; padding: 12px; border: none; border-radius: 8px;
          font-weight: 600; cursor: pointer; font-size: 16px;
        }
        .basic-btn { background: #6b7280; color: #fff; }
        .premium-btn { background: #f59e0b; color: #fff; }
        .luxury-btn { background: #8b5cf6; color: #fff; }
        
        .skip-section { text-align: center; margin-top: 32px; }
        .skip-btn { background: none; border: none; color: #3b82f6; cursor: pointer; text-decoration: underline; }
        
        .next-steps { border-top: 1px solid #e5e7eb; padding-top: 40px; }
        .next-steps h2 { margin: 0 0 24px 0; color: #111827; text-align: center; }
        .action-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
        .action-card {
          background: #f8f9fa; padding: 24px; border-radius: 12px; text-align: center;
        }
        .action-card h3 { margin: 0 0 8px 0; color: #111827; }
        .action-card p { color: #6b7280; margin-bottom: 16px; }
        .action-btn {
          background: #3b82f6; color: #fff; border: none; padding: 12px 24px;
          border-radius: 8px; font-weight: 600; cursor: pointer;
        }
      `}</style>
    </div>
  )
}

function QROrderStatus({ order, restaurant }) {
  return (
    <div className="qr-status">
      <h2>📦 Your QR Order Status</h2>
      <div className="status-card">
        <div className="status-header">
          <span className="order-id">Order #{order.id.slice(0, 8)}</span>
          <span className={`status-badge ${order.status}`}>{order.status.replace('_', ' ')}</span>
        </div>
        
        <div className="order-details">
          <p><strong>Stand Type:</strong> {order.stand_type.replace('_', ' ')}</p>
          <p><strong>Quantity:</strong> {order.quantity} pieces</p>
          <p><strong>Total Amount:</strong> ₹{order.total_amount}</p>
          <p><strong
