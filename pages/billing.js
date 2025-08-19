// pages/billing.js
import { useState, useEffect, useCallback } from 'react'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../services/supabase'
import Alert from '../components/Alert'

export default function BillingPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: loadingRestaurant } = useRestaurant()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadOrders = useCallback(async () => {
    if (!restaurant?.id) return
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
  }, [restaurant?.id])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  if (checking || loadingRestaurant || !restaurant?.id) return <div>Loading...</div>

  return (
    <>
      <div className="billing-page">
        <div className="page-header">
          <h1>Billing &amp; Receipts</h1>
          <p>Manage completed orders and generate receipts</p>
        </div>

        {error && <Alert type="error">{error}</Alert>}

        {loading ? (
          <div className="loading">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No completed orders found.</div>
        ) : (
          <div className="orders-grid">
            {orders.map((order) => {
              const total = order.order_items?.reduce((sum, item) => sum + item.quantity * item.price, 0) || 0
              const itemCount = order.order_items?.reduce((sum, item) => sum + item.quantity, 0) || 0

              const generateReceipt = () => {
                const receiptWindow = window.open('', '_blank')
                const html = `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta charset="utf-8" />
                    <title>Receipt #${order.id.slice(0, 8)}</title>
                    <style>
                      body { font-family:'Courier New',monospace; margin:0; padding:20px; }
                      .receipt { max-width:300px; margin:auto; }
                      .center { text-align:center; }
                      .header { text-align:center; border-bottom:1px dashed #000; margin-bottom:10px; padding-bottom:8px; }
                      .row { display:flex; justify-content:space-between; }
                      .items { margin:10px 0; }
                      .item { display:flex; justify-content:space-between; gap:6px; }
                      .total { margin-top:10px; border-top:1px dashed #000; padding-top:8px; }
                      .footer { text-align:center; margin-top:20px; font-size:10px; }
                    </style>
                  </head>
                  <body>
                    <div class="receipt">
                      <div class="header">
                        <div><strong>${restaurant.name || ''}</strong></div>
                        <div>${restaurant.address || ''}</div>
                        <div>${restaurant.phone || ''}</div>
                      </div>

                      <div class="row"><span>Date:</span><span>${new Date(order.created_at).toLocaleString()}</span></div>
                      <div class="row"><span>Table:</span><span>${order.table_number || 'N/A'}</span></div>
                      <div class="row"><span>Bill No:</span><span>${order.id.slice(0, 8)}</span></div>

                      <div class="items">
                        <div class="item"><strong>Item</strong><strong>Qty</strong><strong>Amount</strong></div>
                        ${(order.order_items || [])
                          .map(it => `
                            <div class="item">
                              <span>${it.menu_items?.name || ''}</span>
                              <span>${it.quantity}</span>
                              <span>₹${(it.quantity * it.price).toFixed(2)}</span>
                            </div>
                          `).join('')}
                      </div>

                      <div class="total row">
                        <strong>Total:</strong><strong>₹${total.toFixed(2)}</strong>
                      </div>

                      <div class="footer">Thank You! Visit Again!</div>
                    </div>
                  </body>
                  </html>
                `
                receiptWindow.document.write(html)
                receiptWindow.document.close()
              }

              return (
                <div key={order.id} className="order-card">
                  <div className="order-header">
                    <span>#{order.id.slice(0, 8)}</span>
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="order-info">
                    <div>Items: {itemCount}</div>
                    <div>Table: {order.table_number || 'N/A'}</div>
                  </div>
                  <div className="order-footer">
                    <button onClick={generateReceipt}>Generate Receipt</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        .billing-page { max-width: 1200px; margin: 0 auto; padding: 2rem; }
        .page-header h1 { margin: 0; font-size: 2rem; }
        .page-header p { margin: 0 0 1rem; color: #6b7280; }
        .loading, .empty-state { text-align: center; padding: 2rem; }
        .orders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
        .order-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; }
        .order-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
        .order-info { margin-bottom: 1rem; display: flex; gap: 12px; color: #374151; }
        .order-footer button { padding: 0.5rem 1rem; background: #2563eb; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
        .order-footer button:hover { background: #1d4ed8; }
      `}</style>
    </>
  )
}
