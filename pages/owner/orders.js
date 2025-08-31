//pages/owner/orders.js
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../services/supabase'
import { useRequireAuth } from '../../lib/useRequireAuth'
import { useRestaurant } from '../../context/RestaurantContext'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

const STATUSES = ['new', 'in_progress', 'ready', 'completed']
const LABELS = { new: 'New', in_progress: 'In Progress', ready: 'Ready', completed: 'Completed' }
const COLORS = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' }
const money = (v) => `₹${Number(v ?? 0).toFixed(2)}`

function toDisplayItems(order) {
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items.map((it) => ({
      name: it?.name || 'Item',
      quantity: Number(it?.quantity ?? 1) || 1,
      price: Number(it?.price ?? 0) || 0,
    }))
  }
  if (Array.isArray(order?.order_items) && order.order_items.length) {
    return order.order_items.map((oi) => ({
      name: oi?.item_name || oi?.menu_items?.name || 'Item',
      quantity: Number(oi?.quantity ?? 1) || 1,
      price: Number(oi?.price ?? 0) || 0,
    }))
  }
  return []
}

export default function OrdersPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: restLoading } = useRestaurant()

  const [ordersByStatus, setOrdersByStatus] = useState({ new: [], in_progress: [], ready: [], completed: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)
  const [confirm, setConfirm] = useState({ open: false, orderId: null })
  const [generatingInvoice, setGeneratingInvoice] = useState(null)
  const [mobileFilter, setMobileFilter] = useState('new')

  const restaurantId = restaurant?.id

  useEffect(() => {
    if (!restaurantId || checking || restLoading) return
    loadOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, checking, restLoading])

  async function loadOrders() {
    setLoading(true)
    setError('')
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name))')
        .eq('restaurant_id', restaurantId)
        .in('status', STATUSES)
        .order('created_at', { ascending: true })
      if (ordersError) throw ordersError

      const orderIds = (ordersData || []).map((o) => o.id)
      let invMap = {}
      if (orderIds.length > 0) {
        const { data: invoicesData /*, error: invErr*/ } = await supabase
          .from('invoices')
          .select('order_id, pdf_url')
          .in('order_id', orderIds)
        invoicesData?.forEach(i => { invMap[i.order_id] = i })
      }

      ordersData?.forEach(o => { o.invoice = invMap[o.id] || null })

      const grouped = { new: [], in_progress: [], ready: [], completed: [] }
      for (const o of ordersData || []) grouped[STATUSES.includes(o.status) ? o.status : 'new'].push(o)
      setOrdersByStatus(grouped)
    } catch (e) {
      setError(e.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const liveCount = (ordersByStatus.new?.length || 0) + (ordersByStatus.in_progress?.length || 0) + (ordersByStatus.ready?.length || 0)

  const updateStatus = async (id, status) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id).eq('restaurant_id', restaurantId)
      if (error) throw error
      loadOrders()
    } catch (e) {
      setError(e.message || 'Failed to update order')
    }
  }

  const completeOrder = async (orderId, paymentMethod) => {
    if (paymentMethod === 'cash') {
      setConfirm({ open: true, orderId })
    } else {
      finalizeCompletion(orderId)
    }
  }

  const finalizeCompletion = async (orderId) => {
    setGeneratingInvoice(orderId)
    try {
      await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId).eq('restaurant_id', restaurantId)
      const resp = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j.error || 'Invoice generation failed')
      }
      loadOrders()
    } catch (e) {
      setError(e.message || 'Failed to complete order')
    } finally {
      setGeneratingInvoice(null)
    }
  }

  const mobileList = useMemo(() => ordersByStatus[mobileFilter] || [], [ordersByStatus, mobileFilter])

  if (checking || restLoading) return <div style={{ padding: 16 }}>Loading…</div>
  if (!restaurantId) return <div style={{ padding: 16 }}>No restaurant found.</div>

  return (
    <div className="orders-wrap">
      <header className="orders-header">
        <h1>Orders Dashboard</h1>
        <div className="header-actions">
          <span>{liveCount} live orders</span>
          <Button variant="outline" onClick={loadOrders}>Refresh</Button>
        </div>
      </header>

      {error && (
        <Card padding={12} style={{ background: '#fee2e2', borderColor: '#fecaca', marginBottom: 12 }}>
          <span style={{ color: '#b91c1c' }}>{error}</span>
        </Card>
      )}

      {loading ? (
        <div className="kanban">
          {STATUSES.map((s, i) => (
            <Card key={i} padding={20} style={{ opacity: 0.5, minHeight: 200 }} />
          ))}
        </div>
      ) : (
        <>
          <div className="mobile-filters">
            {STATUSES.map(s => (
              <button
                key={s}
                className={`chip ${mobileFilter === s ? 'chip--active' : ''}`}
                onClick={() => setMobileFilter(s)}
                aria-label={`Filter ${LABELS[s]}`}
              >
                {LABELS[s]} <span className="chip-count">{ordersByStatus[s]?.length || 0}</span>
              </button>
            ))}
          </div>

          <div className="mobile-list">
            {mobileList.length === 0 ? (
              <Card padding={16} style={{ textAlign: 'center', color: '#6b7280' }}>
                No {LABELS[mobileFilter].toLowerCase()}
              </Card>
            ) : (
              mobileList.map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  statusColor={COLORS[o.status]}
                  onSelect={() => setDetail(o)}
                  onStatusChange={updateStatus}
                  onComplete={completeOrder}
                  generatingInvoice={generatingInvoice}
                />
              ))
            )}
          </div>

          <div className="kanban">
            {STATUSES.map((status) => (
              <Card key={status} padding={12}>
                <div className="kanban-col-header">
                  <strong style={{ color: COLORS[status] }}>{LABELS[status]}</strong>
                  <span className="pill">{ordersByStatus[status]?.length || 0}</span>
                </div>
                <div className="kanban-col-body">
                  {(ordersByStatus[status] || []).length === 0 ? (
                    <div className="empty-col">No {LABELS[status].toLowerCase()}</div>
                  ) : (
                    ordersByStatus[status].map(o => (
                      <OrderCard
                        key={o.id}
                        order={o}
                        statusColor={COLORS[status]}
                        onSelect={() => setDetail(o)}
                        onStatusChange={updateStatus}
                        onComplete={completeOrder}
                        generatingInvoice={generatingInvoice}
                      />
                    ))
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {detail && (
        <OrderDetailModal
          order={detail}
          onClose={() => setDetail(null)}
          onCompleteOrder={completeOrder}
          generatingInvoice={generatingInvoice}
        />
      )}

      {confirm.open && (
        <ConfirmDialog
          title="Confirm Payment Received"
          message="Has the customer paid at the counter?"
          confirmText="Yes"
          cancelText="No"
          onConfirm={() => { setConfirm({ open: false, orderId: null }); finalizeCompletion(confirm.orderId) }}
          onCancel={() => setConfirm({ open: false, orderId: null })}
        />
      )}

      <style jsx>{`
        .orders-wrap { padding: 12px 0 32px; }
        .orders-header {
          display: flex; justify-content: space-between; align-items: center;
          margin: 0 8px 12px;
        }
        .orders-header h1 { margin: 0; font-size: 1.5rem; }
        .header-actions { display: flex; align-items: center; gap: 8px; }
        .mobile-filters {
          display: grid; grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 8px; padding: 0 8px 10px;
        }
        .chip {
          border: 1px solid #e5e7eb; border-radius: 999px; padding: 10px 12px;
          background: #fff; font-size: 12px; display: flex; gap: 6px; justify-content: center; align-items: center;
          min-height: 44px;
        }
        .chip--active { background: #eef2ff; border-color: #c7d2fe; }
        .chip-count { background: #f3f4f6; padding: 0 6px; border-radius: 999px; font-size: 11px; }
        .mobile-list { display: grid; gap: 10px; padding: 0 8px; }
        .kanban {
          display: none;
          grid-template-columns: repeat(4, minmax(0,1fr));
          gap: 16px; padding: 12px;
        }
        .kanban-col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .pill { background: #f3f4f6; padding: 4px 10px; border-radius: 999px; font-size: 12px; }
        .kanban-col-body { display: flex; flex-direction: column; gap: 10px; max-height: 70vh; overflow: auto; }
        .empty-col { text-align: center; color: #9ca3af; padding: 20px; border: 1px dashed #e5e7eb; border-radius: 8px; }
        @media (min-width: 1024px) {
          .mobile-filters, .mobile-list { display: none; }
          .kanban { display: grid; }
          .orders-header { margin: 0 12px 16px; }
        }
        :global(button) { min-height: 48px; }
      `}</style>
    </div>
  )
}

function OrderCard({ order, statusColor, onSelect, onStatusChange, onComplete, generatingInvoice }) {
  const items = toDisplayItems(order)
  const hasInvoice = order?.invoice?.pdf_url
  const total = Number(order?.total_inc_tax ?? order?.total_amount ?? 0)

  return (
    <Card padding={12} style={{ cursor: 'pointer' }} onClick={onSelect}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>#{order.id.slice(0,8)}</strong>
        <span style={{ color: '#6b7280', fontSize: 12 }}>{new Date(order.created_at).toLocaleTimeString()}</span>
      </div>
      <div style={{ margin: '6px 0', color: '#111827', fontSize: 14 }}>
        {items.slice(0, 2).map((it, i) => <div key={i}>{it.quantity}× {it.name}</div>)}
        {items.length > 2 && <div style={{ color: '#9ca3af' }}>+{items.length - 2} more</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <span style={{ fontWeight: 600 }}>{money(total)}</span>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
          {order.status === 'new' && (
            <Button size="sm" onClick={() => onStatusChange(order.id, 'in_progress')}>Start</Button>
          )}
          {order.status === 'in_progress' && (
            <Button size="sm" variant="success" onClick={() => onStatusChange(order.id, 'ready')}>Ready</Button>
          )}
          {order.status === 'ready' && !hasInvoice && (
            <Button
              size="sm"
              onClick={() => onComplete(order.id, order.payment_method)}
              disabled={generatingInvoice === order.id}
            >
              {generatingInvoice === order.id ? 'Processing…' : 'Done'}
            </Button>
          )}
          {hasInvoice && (
            <Button size="sm" variant="outline" onClick={() => window.open(order.invoice.pdf_url, '_blank')}>Bill</Button>
          )}
        </div>
      </div>
      <div style={{ height: 2, marginTop: 8, borderRadius: 2, background: statusColor, opacity: 0.2 }} />
    </Card>
  )
}

function OrderDetailModal({ order, onClose, onCompleteOrder, generatingInvoice }) {
  const items = toDisplayItems(order)
  const hasInvoice = order?.invoice?.pdf_url
  const subtotal = Number(order?.subtotal_ex_tax ?? order?.subtotal ?? 0)
  const tax = Number(order?.total_tax ?? order?.tax_amount ?? 0)
  const total = Number(order?.total_inc_tax ?? order?.total_amount ?? 0)

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0 }}>Order #{order.id.slice(0,8)}</h2>
          <Button variant="outline" onClick={onClose}>×</Button>
        </div>
        <Card padding={16}>
          <div><strong>Time:</strong> {new Date(order.created_at).toLocaleString()}</div>
          <div><strong>Table:</strong> {order.table_number}</div>
          <div><strong>Payment:</strong> {order.payment_method}</div>
        </Card>
        <Card padding={16} style={{ marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Items</h3>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{it.quantity}× {it.name}</span>
              <span>{money(it.quantity * it.price)}</span>
            </div>
          ))}
        </Card>
        <Card padding={16} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span><span>{money(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tax</span><span>{money(tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 6 }}>
            <span>Total</span><span>{money(total)}</span>
          </div>
        </Card>
        <div style={{ textAlign: 'right', marginTop: 12 }}>
          {!hasInvoice && order.status === 'ready' && (
            <Button onClick={() => onCompleteOrder(order.id, order.payment_method)} disabled={generatingInvoice === order.id}>
              {generatingInvoice === order.id ? 'Generating…' : 'Generate Invoice'}
            </Button>
          )}
          {hasInvoice && (
            <Button variant="outline" onClick={() => window.open(order.invoice.pdf_url, '_blank')}>View Invoice</Button>
          )}
        </div>
      </div>
      <style jsx>{`
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 12px; }
        .modal__card { background: #fff; width: 100%; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  )
}

function ConfirmDialog({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal__card" style={{ maxWidth: 420 }}>
        <h3 style={{ marginTop: 12 }}>{title}</h3>
        <p style={{ margin: '8px 0 16px', color: '#374151' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingBottom: 12 }}>
          <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
          <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
      <style jsx>{`
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 12px; }
        .modal__card { background: #fff; width: 100%; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  )
}

