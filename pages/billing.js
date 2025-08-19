// pages/billing.js
import { useState, useEffect } from 'react'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../services/supabase'
import Shell from '../components/Shell'
import Alert from '../components/Alert'

export default function BillingPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: loadingRestaurant } = useRestaurant()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!restaurant?.id) return
    loadOrders()
  }, [restaurant?.id])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            price,
            menu_items (name)
          )
        `)
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateReceipt = (order) => {
    const receiptWindow = window.open('', '_blank')
    const total = order.order_items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0
    
    receiptWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - Order #${order.id.slice(0, 8)}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            margin: 0; 
            padding: 20px; 
            background: white;
            font-size: 12px;
            line-height: 1.4;
          }
          .receipt { 
            max-width: 300px; 
            margin: 0 auto; 
            background: white;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px; 
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .restaurant-name { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 5px; 
          }
          .contact-info { 
            font-size: 10px; 
            color: #555; 
          }
          .order-info { 
            margin: 15px 0; 
            border-bottom: 1px dashed #000;
            padding-bottom: 10px;
          }
          .items { 
            margin: 15px 0; 
          }
          .item { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 5px; 
          }
          .item-name { 
            flex: 1; 
          }
          .item-qty { 
            width: 30px; 
            text-align: center; 
          }
          .item-price { 
            width: 60px; 
            text-align: right; 
          }
          .total-section { 
            border-top: 1px dashed #000; 
            padding-top: 10px; 
            margin-top: 15px; 
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 5px; 
          }
          .grand-total { 
            font-weight: bold; 
            font-size: 14px; 
            border-top: 1px solid #000; 
            padding-top: 5px; 
            margin-top: 10px; 
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            font-size: 10px; 
          }
          @media print {
            body { margin: 0; padding: 10px; }
            .print-btn { display: none; }
          }
          .print-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            margin: 20px auto;
            display: block;
            border-radius: 5px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="restaurant-name">${restaurant.name || 'RESTAURANT'}</div>
            <div class="contact-info">
              ${restaurant.address || 'ADDRESS'}<br>
              ${restaurant.phone || 'PHONE'}
            </div>
          </div>
          
          <div class="order-info">
            <div><strong>Date:</strong> ${new Date(order.created_at).toLocaleString()}</div>
            <div><strong>Order ID:</strong> ${order.id.slice(0, 8)}</div>
            <div><strong>Table:</strong> ${order.table_number || 'N/A'}</div>
            <div><strong>Customer:</strong> ${order.customer_name || 'Walk-in'}</div>
          </div>
          
          <div class="items">
            <div style="display: flex; justify-content: space-between; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 5px; margin-bottom: 10px;">
              <span>Item</span>
              <span>Qty</span>
              <span>Amount</span>
            </div>
            ${order.order_items?.map(item => `
              <div class="item">
                <span class="item-name">${item.menu_items?.name || 'Item'}</span>
                <span class="item-qty">${item.quantity}</span>
                <span class="item-price">₹${(item.quantity * item.price).toFixed(2)}</span>
              </div>
            `).join('') || ''}
          </div>
          
          <div class="total-section">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>₹${total.toFixed(2)}</span>
            </div>
            <div class="total-row">
              <span>Tax (0%):</span>
              <span>₹0.00</span>
            </div>
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>₹${total.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            Thank You! Visit Again!<br>
            <small>Powered by Cafe QR</small>
          </div>
        </div>
        
        <button class="print-btn" onclick="window.print(); window.close();">
          Print Receipt
        </button>
      </body>
      </html>
    `)
    receiptWindow.document.close()
  }

  if (checking || loadingRestaurant || !restaurant?.id) {
    return (
      <Shell>
        <div>Loading...</div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="billing-page">
        <div className="page-header">
          <h1>Billing & Receipts</h1>
          <p>Manage completed orders and generate receipts</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        <div className="orders-section">
          <h2>Recent Completed Orders</h2>
          
          {loading ? (
            <div className="loading">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <p>No completed orders found.</p>
            </div>
          ) : (
            <div className="orders-grid">
              {orders.map(order => {
                const total = order.order_items?.reduce((sum, item) => 
                  sum + (item.quantity * item.price), 0) || 0
                const itemCount = order.order_items?.reduce((sum, item) => 
                  sum + item.quantity, 0) || 0

                return (
                  <div key={order.id} className="order-card">
                    <div className="order-header">
                      <div className="order-id">#{order.id.slice(0, 8)}</div>
                      <div className="order-date">
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="order-details">
                      <div className="detail-row">
                        <span>Table:</span>
                        <span>{order.table_number || 'N/A'}</span>
                      </div>
                      <div className="detail-row">
                        <span>Items:</span>
                        <span>{itemCount} item(s)</span>
                      </div>
                      <div className="detail-row">
                        <span>Customer:</span>
                        <span>{order.customer_name || 'Walk-in'}</span>
                      </div>
                    </div>
                    
                    <div className="order-total">
                      <strong>₹{total.toFixed(2)}</strong>
                    </div>
                    
                    <div className="order-actions">
                      <button 
                        className="receipt-btn"
                        onClick={() => generateReceipt(order)}
                      >
                        📄 Generate Receipt
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .billing-page {
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          margin-bottom: 2rem;
        }

        .page-header h1 {
          margin: 0 0 0.5rem 0;
          color: #1f2937;
          font-size: 2rem;
          font-weight: 700;
        }

        .page-header p {
          margin: 0;
          color: #6b7280;
          font-size: 1.125rem;
        }

        .orders-section h2 {
          margin: 0 0 1.5rem 0;
          color: #374151;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .loading, .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .orders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .order-card {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
        }

        .order-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .order-id {
          font-weight: 600;
          color: #1f2937;
          font-size: 1.125rem;
        }

        .order-date {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .order-details {
          margin-bottom: 1rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .detail-row span:first-child {
          color: #6b7280;
        }

        .detail-row span:last-child {
          color: #374151;
          font-weight: 500;
        }

        .order-total {
          text-align: right;
          margin-bottom: 1rem;
          font-size: 1.25rem;
          color: #059669;
        }

        .order-actions {
          display: flex;
          gap: 0.5rem;
        }

        .receipt-btn {
          flex: 1;
          background: #2563eb;
          color: white;
          border: none;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .receipt-btn:hover {
          background: #1d4ed8;
        }

        @media (max-width: 768px) {
          .orders-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .order-card {
            padding: 1rem;
          }
        }
      `}</style>
    </Shell>
  )
}
