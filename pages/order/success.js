// pages/order/success.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

export default function OrderSuccess() {
  const router = useRouter()
  const { id: orderId, method } = router.query
  
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!orderId) return
    loadOrder()
  }, [orderId])

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, status, created_at, subtotal, tax, total_amount, table_number,
          payment_method, payment_status, restaurant_name, restaurant_phone, restaurant_address,
          order_items(item_name, quantity, price)
        `)
        .eq('id', orderId)
        .single()
      
      if (error) throw error
      setOrder(data)
    } catch (err) {
      setError('Order not found')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <LoadingScreen />
  if (error || !order) return <ErrorScreen error={error} />

  const orderNumber = order.id.slice(0, 8).toUpperCase()
  const isOnlinePayment = method === 'online' || order.payment_method === 'online'
  const isPaid = order.payment_status === 'completed'

  return (
    <div className="success-page">
      <div className="success-container">
        {/* Success Animation */}
        <div className="success-animation">
          <div className="checkmark">✓</div>
          <div className="success-text">
            <h1>Order Placed Successfully!</h1>
            <p>Order #{orderNumber}</p>
          </div>
        </div>

        {/* Order Status */}
        <div className="status-card">
          <div className="status-header">
            <span className="status-badge new">New Order</span>
            {isOnlinePayment && isPaid && (
              <span className="payment-badge paid">Payment Complete</span>
            )}
          </div>
          
          <div className="order-info">
            <p><strong>{order.restaurant_name}</strong></p>
            <p>Table {order.table_number}</p>
            <p>{order.order_items?.length} items • ₹{order.total_amount?.toFixed(2)}</p>
            <p className="order-time">
              Placed at {new Date(order.created_at).toLocaleTimeString('en-IN', { 
                hour: '2-digit', minute: '2-digit' 
              })}
            </p>
          </div>

          <div className="estimated-time">
            <span className="time-icon">⏱️</span>
            <span>Your order will be ready in 15-20 minutes</span>
          </div>
        </div>

        {/* Payment Status */}
        {!isOnlinePayment && (
          <div className="payment-notice">
            <span className="notice-icon">💰</span>
            <div>
              <strong>Payment Pending</strong>
              <p>Please pay at the counter when collecting your order</p>
            </div>
          </div>
        )}

        {/* Bill Actions - Show bill only if payment is completed */}
        <div className="bill-actions">
          {isPaid ? (
            <Link href={`/order/bill/${orderId}`} className="bill-btn primary">
              📄 View/Download Bill
            </Link>
          ) : (
            <div className="bill-btn disabled">
              📄 Bill available after payment
            </div>
          )}
          <Link href={`/order/track/${orderId}`} className="bill-btn secondary">
            📍 Track Order Status
          </Link>
        </div>

        {/* Help Section */}
        <div className="help-section">
          <h3>Need Help?</h3>
          <div className="help-options">
            <p>Show this order number to the restaurant staff: <strong>#{orderNumber}</strong></p>
            {order.restaurant_phone && (
              <p>Restaurant contact: <strong>{order.restaurant_phone}</strong></p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button onClick={() => window.location.reload()} className="action-btn">
            🔄 Refresh Status
          </button>
          <Link href="/" className="action-btn">
            🏠 Order Again
          </Link>
        </div>
      </div>

      <style jsx>{`
        .success-page {
          min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px; display: flex; align-items: center; justify-content: center;
        }
        
        .success-container {
          background: #fff; width: 100%; max-width: 480px;
          border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        
        .success-animation {
          background: linear-gradient(135deg, #4ade80 0%, #16a34a 100%);
          padding: 40px 20px; text-align: center; color: #fff;
        }
        
        .checkmark {
          width: 80px; height: 80px; border: 4px solid #fff; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 36px; font-weight: bold; margin: 0 auto 20px;
          animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        
        @keyframes scaleIn {
          from { transform: scale(0); }
          to { transform: scale(1); }
        }
        
        .success-text h1 {
          margin: 0 0 8px 0; font-size: 24px; font-weight: 700;
        }
        .success-text p {
          margin: 0; font-size: 16px; opacity: 0.9;
        }
        
        .status-card {
          padding: 24px; border-bottom: 1px solid #f3f4f6;
        }
        
        .status-header {
          display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap;
        }
        .status-badge, .payment-badge {
          padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;
        }
        .status-badge.new { background: #fef3c7; color: #92400e; }
        .payment-badge.paid { background: #d1fae5; color: #065f46; }
        
        .order-info {
          background: #f8f9fa; padding: 16px; border-radius: 12px; margin-bottom: 16px;
        }
        .order-info p { margin: 4px 0; color: #374151; }
        .order-time { color: #6b7280; font-size: 14px; }
        
        .estimated-time {
          display: flex; align-items: center; gap: 8px; 
          background: #eff6ff; padding: 12px; border-radius: 8px;
          color: #1e40af;
        }
        
        .payment-notice {
          margin: 0 24px; padding: 16px; background: #fff7ed; 
          border: 1px solid #fed7aa; border-radius: 12px;
          display: flex; align-items: flex-start; gap: 12px;
        }
        .notice-icon { font-size: 20px; }
        .payment-notice strong { color: #c2410c; }
        .payment-notice p { margin: 4px 0 0 0; color: #9a3412; font-size: 14px; }
        
        .bill-actions {
          padding: 24px; display: grid; gap: 12px;
        }
        .bill-btn {
          display: block; padding: 16px; text-align: center; text-decoration: none;
          border-radius: 12px; font-weight: 600; font-size: 16px;
        }
        .bill-btn.primary {
          background: #f59e0b; color: #fff;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
        }
        .bill-btn.secondary {
          background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb;
        }
        .bill-btn.disabled {
          background: #f3f4f6; color: #9ca3af; cursor: not-allowed;
        }
        
        .help-section {
          padding: 0 24px 24px; border-bottom: 1px solid #f3f4f6;
        }
        .help-section h3 {
          margin: 0 0 12px 0; font-size: 16px; color: #111827;
        }
        .help-options p {
          margin: 8px 0; color: #6b7280; font-size: 14px;
        }
        
        .quick-actions {
          padding: 20px 24px; display: flex; gap: 12px;
        }
        .action-btn {
          flex: 1; padding: 12px; border: 1px solid #e5e7eb; background: #fff;
          border-radius: 8px; text-decoration: none; text-align: center;
          color: #374151; font-size: 14px; cursor: pointer;
        }
      `}</style>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="spinner">⏳</div>
      <p>Loading your order details...</p>
      
      <style jsx>{`
        .loading-screen {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center; background: #f8f9fa;
        }
        .spinner { font-size: 48px; margin-bottom: 20px; }
        p { color: #6b7280; font-size: 16px; }
      `}</style>
    </div>
  )
}

function ErrorScreen({ error }) {
  return (
    <div className="error-screen">
      <div className="error-content">
        <div className="error-icon">❌</div>
        <h2>Order Not Found</h2>
        <p>{error || 'The order you are looking for could not be found.'}</p>
        <Link href="/" className="home-btn">Return to Menu</Link>
      </div>
      
      <style jsx>{`
        .error-screen {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background: #f8f9fa; padding: 20px;
        }
        .error-content {
          text-align: center; background: #fff; padding: 40px 20px;
          border-radius: 12px; max-width: 400px; width: 100%;
        }
        .error-icon { font-size: 48px; margin-bottom: 20px; }
        h2 { margin: 0 0 12px 0; color: #111827; }
        p { color: #6b7280; margin-bottom: 24px; }
        .home-btn {
          background: #f59e0b; color: #fff; padding: 12px 24px;
          border-radius: 8px; text-decoration: none; font-weight: 600;
        }
      `}</style>
    </div>
  )
}
