/* eslint-disable react-hooks/exhaustive-deps */
import { useRouter } from 'next/router'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

export default function OrderSuccess() {
  const { query } = useRouter()
  const { id: orderId, method } = query
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [orderStatus, setOrderStatus] = useState('confirmed')
  const [estimatedTime, setEstimatedTime] = useState(20)

  const loadOrder = useCallback(async () => {
    if (!orderId) return
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          id, created_at, subtotal, tax, total_amount, table_number,
          payment_status, payment_method, status,
          restaurant_name, restaurant_phone, restaurant_address,
          special_instructions,
          order_items(item_name, quantity, price)
        `)
        .eq('id', orderId)
        .single()
      
      setOrder(data)
      if (data) {
        setOrderStatus(data.status || 'confirmed')
        if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission()
        }
      }
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    if (orderId) loadOrder()
  }, [orderId, loadOrder])

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setOrderStatus('preparing')
      setEstimatedTime(15)
    }, 10000)

    const timer2 = setTimeout(() => {
      setOrderStatus('ready')
      setEstimatedTime(0)
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Order Ready! 🎉', {
          body: 'Your order is ready for pickup at the counter',
          icon: '/logo.png'
        })
      }
    }, 300000)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="success-animation">🎉</div>
          <h2>Processing your order...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="error-screen">
        <div className="error-content">
          <div className="error-icon">😕</div>
          <h2>Order not found</h2>
          <p>We couldn&apos;t find your order details</p>
          <Link href="/" className="home-btn">Go Home</Link>
        </div>
      </div>
    )
  }

  const paid = order.payment_status === 'completed'
  const orderNumber = order.id.slice(0, 8).toUpperCase()
  const orderTime = new Date(order.created_at).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const OrderTimeline = () => (
    <div className="order-timeline">
      <div className={`timeline-item ${orderStatus === 'confirmed' ? 'active' : 'completed'}`}>
        <div className="timeline-icon">✅</div>
        <div className="timeline-content">
          <h4>Order Confirmed</h4>
          <p>Your order has been received</p>
          <span className="time">Just now</span>
        </div>
      </div>
      
      <div className={`timeline-item ${
        orderStatus === 'preparing' ? 'active' : 
        orderStatus === 'ready' ? 'completed' : ''
      }`}>
        <div className="timeline-icon">👨‍🍳</div>
        <div className="timeline-content">
          <h4>Being Prepared</h4>
          <p>Chef is preparing your delicious meal</p>
          <span className="time">{orderStatus === 'preparing' ? 'In progress...' : 'Est. 5 mins'}</span>
        </div>
      </div>
      
      <div className={`timeline-item ${orderStatus === 'ready' ? 'active' : ''}`}>
        <div className="timeline-icon">🔔</div>
        <div className="timeline-content">
          <h4>Ready for Pickup</h4>
          <p>Your order is ready! Please come to counter</p>
          <span className="time">{orderStatus === 'ready' ? 'Now!' : `Est. ${estimatedTime} mins`}</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="success-page">
      <div className="success-header">
        <div className="success-animation">
          {orderStatus === 'ready' ? '🎉' : '✅'}
        </div>
        <h1>
          {orderStatus === 'ready' ? 'Order Ready!' : 'Order Placed Successfully!'}
        </h1>
        <p className="order-number">Order #{orderNumber}</p>
        <p className="order-time">Placed at {orderTime}</p>
      </div>

      <div className="restaurant-card">
        <div className="restaurant-info">
          <h2>{order.restaurant_name}</h2>
          <div className="restaurant-details">
            <span>📍 Table {order.table_number}</span>
            {order.restaurant_phone && <span>📞 {order.restaurant_phone}</span>}
          </div>
        </div>
        
        {orderStatus === 'ready' ? (
          <div className="pickup-alert">
            <div className="alert-icon">🔔</div>
            <div className="alert-content">
              <h3>Your order is ready!</h3>
              <p>Please come to the counter to collect your order</p>
            </div>
          </div>
        ) : (
          <div className="status-card">
            <div className="status-info">
              <span className="status-badge">{orderStatus}</span>
              <span className="estimated-time">
                {estimatedTime > 0 ? `${estimatedTime} mins remaining` : 'Ready now!'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="timeline-section">
        <h3>📋 Order Status</h3>
        <OrderTimeline />
      </div>

      <div className="order-details">
        <h3>🛒 Order Items</h3>
        <div className="items-list">
          {order.order_items?.map((item, index) => (
            <div key={index} className="order-item">
              <span className="item-name">{item.quantity}x {item.item_name}</span>
              <span className="item-price">₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
        </div>
        
        {order.special_instructions && (
          <div className="special-instructions">
            <h4>📝 Special Instructions</h4>
            <p>{order.special_instructions}</p>
          </div>
        )}
        
        <div className="order-total">
          <div className="total-row">
            <span>Total Amount</span>
            <span>₹{order.total_amount.toFixed(2)}</span>
          </div>
          <div className="payment-status">
            {paid ? (
              <span className="paid">✅ Paid Online</span>
            ) : (
              <span className="pending">💰 Pay at Counter</span>
            )}
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button 
          onClick={() => window.location.reload()} 
          className="action-btn primary"
        >
          🔄 Refresh Status
        </button>
        
        <Link href={`/order?r=${order.restaurant_id || ''}&t=${order.table_number}`} className="action-btn secondary">
          🏠 Order Again
        </Link>
      </div>

      <div className="help-section">
        <div className="help-card">
          <h4>Need Help? 🤝</h4>
          <p>If you have any issues with your order, please contact the restaurant directly.</p>
          {order.restaurant_phone && (
            <a href={`tel:${order.restaurant_phone}`} className="contact-btn">
              📞 Call Restaurant
            </a>
          )}
        </div>
      </div>

      <style jsx>{`
        .success-page { min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; }
        
        .loading-screen, .error-screen { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #f8f9fa; }
        .loading-content, .error-content { text-align: center; padding: 40px; }
        .success-animation, .error-icon { font-size: 64px; margin-bottom: 20px; }
        .loading-spinner { width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top: 4px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .home-btn { background: #3b82f6; color: white; text-decoration: none; padding: 16px 24px; border-radius: 8px; min-height: 44px; display: inline-flex; align-items: center; }
        
        .success-header { background: white; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 16px; }
        .success-header .success-animation { font-size: 48px; margin-bottom: 16px; }
        .success-header h1 { margin: 0 0 8px 0; color: #111827; font-size: 24px; }
        .order-number { margin: 4px 0; font-weight: 600; color: #3b82f6; font-size: 18px; }
        .order-time { margin: 4px 0; color: #6b7280; font-size: 14px; }
        
        .restaurant-card { background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
        .restaurant-info h2 { margin: 0 0 8px 0; color: #111827; }
        .restaurant-details { display: flex; gap: 16px; font-size: 14px; color: #6b7280; flex-wrap: wrap; }
        
        .pickup-alert { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 12px; padding: 16px; margin-top: 16px; display: flex; gap: 12px; }
        .alert-icon { font-size: 24px; }
        .alert-content h3 { margin: 0 0 4px 0; color: #d97706; }
        .alert-content p { margin: 0; color: #92400e; font-size: 14px; }
        
        .status-card { background: #f0f9ff; border-radius: 8px; padding: 12px; margin-top: 16px; }
        .status-info { display: flex; justify-content: space-between; align-items: center; }
        .status-badge { background: #3b82f6; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: capitalize; }
        .estimated-time { font-size: 14px; color: #1d4ed8; font-weight: 500; }
        
        .timeline-section { background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
        .timeline-section h3 { margin: 0 0 16px 0; color: #111827; }
        
        .order-timeline { position: relative; }
        .timeline-item { display: flex; gap: 16px; margin-bottom: 24px; position: relative; }
        .timeline-item:last-child { margin-bottom: 0; }
        .timeline-item::after { content: ''; position: absolute; left: 20px; top: 40px; width: 2px; height: calc(100% + 4px); background: #e5e7eb; }
        .timeline-item:last-child::after { display: none; }
        .timeline-item.active::after, .timeline-item.completed::after { background: #10b981; }
        
        .timeline-icon { width: 40px; height: 40px; border-radius: 50%; background: #e5e7eb; display: flex; align-items: center; justify-content: center; font-size: 18px; position: relative; z-index: 1; }
        .timeline-item.active .timeline-icon { background: #3b82f6; color: white; animation: pulse 2s infinite; }
        .timeline-item.completed .timeline-icon { background: #10b981; color: white; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        
        .timeline-content { flex: 1; }
        .timeline-content h4 { margin: 0 0 4px 0; color: #111827; }
        .timeline-content p { margin: 0 0 4px 0; color: #6b7280; font-size: 14px; }
        .time { font-size: 12px; color: #9ca3af; }
        
        .order-details { background: white; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
        .order-details h3 { margin: 0 0 16px 0; color: #111827; }
        
        .items-list { margin-bottom: 16px; }
        .order-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
        .order-item:last-child { border-bottom: none; }
        .item-name { color: #374151; }
        .item-price { font-weight: 600; color: #111827; }
        
        .special-instructions { background: #f9fafb; padding: 12px; border-radius: 8px; margin-bottom: 16px; }
        .special-instructions h4 { margin: 0 0 4px 0; color: #374151; font-size: 14px; }
        .special-instructions p { margin: 0; color: #6b7280; font-size: 14px; }
        
        .order-total { border-top: 1px solid #e5e7eb; padding-top: 12px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-weight: 600; font-size: 18px; color: #111827; }
        .payment-status .paid { color: #10b981; }
        .payment-status .pending { color: #f59e0b; }
        
        .action-buttons { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .action-btn { padding: 16px; border-radius: 12px; text-decoration: none; text-align: center; font-weight: 600; border: none; cursor: pointer; font-size: 16px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
        .action-btn.primary { background: #3b82f6; color: white; }
        .action-btn.secondary { background: white; color: #374151; border: 1px solid #e5e7eb; }
        
        .help-section { background: white; border-radius: 16px; padding: 20px; }
        .help-card h4 { margin: 0 0 8px 0; color: #111827; }
        .help-card p { margin: 0 0 12px 0; color: #6b7280; font-size: 14px; }
        .contact-btn { background: #10b981; color: white; text-decoration: none; padding: 12px 16px; border-radius: 6px; font-size: 14px; min-height: 44px; display: inline-flex; align-items: center; }

        @media (max-width: 768px) {
          .success-page { padding: 16px; }
          .restaurant-details { flex-direction: column; gap: 8px; }
        }
      `}</style>
    </div>
  )
}
