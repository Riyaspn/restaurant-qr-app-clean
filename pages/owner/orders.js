// pages/owner/orders.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '../../lib/firebaseClient';
import { Capacitor } from '@capacitor/core';
import { PushNotificationService } from '../../services/pushNotifications';

// Constants
const STATUSES = ['new', 'in_progress', 'ready', 'completed'];
const LABELS   = { new: 'New', in_progress: 'Cooking', ready: 'Ready', completed: 'Done' };
const COLORS   = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' };
const PAGE     = 20;

// Helpers
const money = v => `₹${Number(v ?? 0).toFixed(2)}`;
function toDisplayItems(order) {
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.order_items)) {
    return order.order_items.map(oi => ({
      name: oi.menu_items?.name || oi.item_name || 'Item',
      quantity: oi.quantity,
      price: oi.price
    }));
  }
  return [];
}

export default function OrdersPage() {
  const { checking, user } = useRequireAuth();
  const { restaurant, loading: restLoading } = useRestaurant();
  const restaurantId = restaurant?.id;

  const [ordersByStatus, setOrdersByStatus] = useState({
    new: [], in_progress: [], ready: [], completed: []
  });
  const [completedPage, setCompletedPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, orderId: null });
  const [generatingInvoice, setGeneratingInvoice] = useState(null);
  const notificationAudioRef = useRef(null);

  useEffect(() => {
    const a = new Audio('/notification-sound.mp3');
    a.load();
    notificationAudioRef.current = a;
  }, []);
  // Request browser notification permission once at mount
useEffect(() => {
if (typeof window !== 'undefined' && 'Notification' in window) {
if (Notification.permission === 'default') {
Notification.requestPermission().catch(() => {});
}
}
}, []);

// Prime/unlock audio on first user interaction (mobile autoplay guard)
useEffect(() => {
function unlockAudio() {
const a = notificationAudioRef.current;
if (!a) return;
const wasMuted = a.muted;
a.muted = true; // ensure allowed
a.play().catch(() => {}); // try play to unlock
a.pause();
a.currentTime = 0;
a.muted = wasMuted; // restore
window.removeEventListener('touchstart', unlockAudio, { capture: true });
window.removeEventListener('click', unlockAudio, { capture: true });
}
window.addEventListener('touchstart', unlockAudio, { capture: true, once: true });
window.addEventListener('click', unlockAudio, { capture: true, once: true });
return () => {
window.removeEventListener('touchstart', unlockAudio, { capture: true });
window.removeEventListener('click', unlockAudio, { capture: true });
};
}, []);



  async function fetchBucket(status, page = 1) {
    let q = supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .eq('restaurant_id', restaurantId)
      .eq('status', status);

    if (status === 'completed') {
      const to = page * PAGE - 1;
      const { data, error } = await q.order('created_at', { ascending: false }).range(0, to);
      if (error) throw error;
      return data;
    }

    const { data, error } = await q.order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  async function loadOrders(page = completedPage) {
    if (!restaurantId) return;
    setLoading(true);
    setError('');

    try {
      const [n, i, r, c] = await Promise.all([
        fetchBucket('new'),
        fetchBucket('in_progress'),
        fetchBucket('ready'),
        fetchBucket('completed', page)
      ]);

      const all = [...n, ...i, ...r, ...c];
      const ids = all.map(o => o.id);
      let invMap = {};

      if (ids.length) {
        const { data: invs } = await supabase
          .from('invoices')
          .select('order_id,pdf_url')
          .in('order_id', ids);
        (invs || []).forEach(inv => {
          invMap[inv.order_id] = inv.pdf_url;
        });
      }

      const attach = rows => rows.map(o => ({
        ...o,
        invoice: invMap[o.id] ? { pdf_url: invMap[o.id] } : null
      }));

      setOrdersByStatus({
        new: attach(n),
        in_progress: attach(i),
        ready: attach(r),
        completed: attach(c)
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (restaurantId) {
      setCompletedPage(1);
      loadOrders(1);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
.channel(orders-${restaurantId})
.on('postgres_changes', {
event: 'INSERT',
schema: 'public',
table: 'orders',
filter: restaurant_id=eq.${restaurantId}
}, async () => {
if (Notification.permission === 'granted') {
new Notification('🔔 New Order!');
}
notificationAudioRef.current?.play().catch(() => {});
setTimeout(async () => {
const newOrders = await fetchBucket('new');
setOrdersByStatus(prev => ({
...prev,
new: newOrders.map(o => ({
...o,
invoice: prev.new.find(p => p.id === o.id)?.invoice || null
}))
}));
}, 250);
})
.subscribe();

    return () => supabase.removeChannel(channel);
  }, [restaurantId]);

  const updateStatus = async (id, next) => {
    try {
      await supabase
        .from('orders')
        .update({ status: next })
        .eq('id', id)
        .eq('restaurant_id', restaurantId);
      loadOrders();
    } catch (e) {
      setError(e.message);
    }
  };

  const finalizeComplete = async id => {
    setGeneratingInvoice(id);
    try {
      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', id)
        .eq('restaurant_id', restaurantId);

      const resp = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: id })
      });

      if (!resp.ok) throw new Error('Invoice gen failed');
      const { pdf_url } = await resp.json();

      if (pdf_url) {
        window.open(pdf_url, '_blank', 'noopener,noreferrer');
      }

      loadOrders();
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingInvoice(null);
    }
  };

  if (checking || restLoading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!restaurantId) return <div style={{ padding: 16 }}>No restaurant found.</div>;

  return (
    <div className="orders-wrap">
      <header className="orders-header">
        <h1>Orders Dashboard</h1>
        <div className="header-actions">
          <span className="muted">
            {['new','in_progress','ready'].reduce((sum, s) => sum + ordersByStatus[s].length, 0)} live orders
          </span>
          <Button
            variant="outline"
            onClick={() => { setCompletedPage(1); loadOrders(1); }}
          >
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <Card padding={12} style={{ background: '#fee2e2', border: '1px solid #fecaca', margin: '0 12px 12px' }}>
          <span style={{ color: '#b91c1c' }}>{error}</span>
        </Card>
      )}

      {/* Mobile view */}
      <div className="mobile-filters">
        {STATUSES.map(s => (
          <button
            key={s}
            className={`chip ${s === (ordersByStatus.mobileFilter || 'new') ? 'chip--active' : ''}`}
            onClick={() => setOrdersByStatus(prev => ({ ...prev, mobileFilter: s }))}
          >
            <span className="chip-label">{LABELS[s]}</span>
            <span className="chip-count">{ordersByStatus[s].length}</span>
          </button>
        ))}
      </div>
      <div className="mobile-list">
        {ordersByStatus[ordersByStatus.mobileFilter || 'new'].length === 0 ? (
          <Card padding={16} style={{ textAlign: 'center', color: '#6b7280' }}>
            No {LABELS[ordersByStatus.mobileFilter || 'new'].toLowerCase()}
          </Card>
        ) : (
          ordersByStatus[ordersByStatus.mobileFilter || 'new'].map(o => (
            <OrderCard
              key={o.id}
              order={o}
              statusColor={COLORS[o.status]}
              onStatusChange={updateStatus}
              onComplete={finalizeComplete}
              generatingInvoice={generatingInvoice}
            />
          ))
        )}
      </div>

      {/* Desktop kanban */}
      <div className="kanban">
        {STATUSES.map(status => (
          <Card key={status} padding={12}>
            <div className="kanban-col-header">
              <strong style={{ color: COLORS[status] }}>{LABELS[status]}</strong>
              <span className="pill">{ordersByStatus[status].length}</span>
            </div>
            <div className="kanban-col-body">
              {ordersByStatus[status].length === 0 ? (
                <div className="empty-col">No {LABELS[status].toLowerCase()}</div>
              ) : (
                ordersByStatus[status].map(o => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    statusColor={COLORS[status]}
                    onStatusChange={updateStatus}
                    onComplete={finalizeComplete}
                    generatingInvoice={generatingInvoice}
                  />
                ))
              )}
              {status === 'completed' && ordersByStatus.completed.length >= PAGE && (
                <>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Showing latest {ordersByStatus.completed.length} completed orders
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCompletedPage(completedPage + 1);
                        loadOrders(completedPage + 1);
                      }}
                    >
                      Load more
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {detail && (
        <OrderDetailModal
          order={detail}
          onClose={() => setDetail(null)}
          onCompleteOrder={finalizeComplete}
          generatingInvoice={generatingInvoice}
        />
      )}

      {confirm.open && (
        <ConfirmDialog
          title="Confirm Payment Received"
          message="Has the customer paid at the counter?"
          confirmText="Yes"
          cancelText="No"
          onConfirm={() => {
            finalizeComplete(confirm.orderId);
            setConfirm({ open: false, orderId: null });
          }}
          onCancel={() => setConfirm({ open: false, orderId: null })}
        />
      )}

      <style jsx>{`
        .orders-wrap { padding: 12px 0 32px; }
        .orders-header { display: flex; justify-content: space-between; align-items: center; padding: 0 12px 12px; }
        .orders-header h1 { margin: 0; font-size: clamp(20px, 2.6vw, 28px); }
        .header-actions { display: flex; align-items: center; gap: 10px; }
        .muted { color: #6b7280; font-size: 14px; }

        /* Mobile */
        .mobile-filters {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
          padding: 0 12px 12px;
        }
        .chip {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 8px;
          display: flex;
          justify-content: space-between;
          background: #fff;
        }
        .chip--active { background: #eef2ff; border-color: #c7d2fe; }
        .chip-label { font-weight: 600; font-size: 13px; }
        .chip-count {
          background: #111827;
          color: #fff;
          border-radius: 999px;
          padding: 0 6px;
          font-size: 12px;
        }
        .mobile-list {
          display: grid;
          gap: 10px;
          padding: 0 12px;
        }

        /* Desktop Kanban */
        .kanban {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          padding: 12px 16px;
        }
        .kanban-col-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .pill {
          background: #f3f4f6;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 12px;
        }
        .kanban-col-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 70vh;
          overflow: auto;
        }
        .empty-col {
          text-align: center;
          color: #9ca3af;
          padding: 20px;
          border: 1px dashed #e5e7eb;
          border-radius: 8px;
        }

        @media (max-width: 1024px) {
          .kanban { display: none; }
        }
        @media (min-width: 1024px) {
          .mobile-filters, .mobile-list { display: none; }
        }
      `}</style>
    </div>
  );
}

// OrderCard component
function OrderCard({ order, statusColor, onStatusChange, onComplete, generatingInvoice }) {
  const items = toDisplayItems(order);
  const hasInvoice = Boolean(order.invoice?.pdf_url);
  const total = Number(order.total_inc_tax ?? order.total_amount ?? 0);

  return (
    <Card padding={12} style={{
      border:'1px solid #eef2f7',
      borderRadius:12,
      boxShadow:'0 1px 2px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <strong>#{order.id.slice(0,8)}</strong>
        <span style={{ color:'#6b7280', fontSize:12 }}>
          {new Date(order.created_at).toLocaleTimeString()}
        </span>
      </div>
      <div style={{ margin:'8px 0', fontSize:14 }}> {items.map((it,i) => ( <div key={i}>{it.quantity}× {it.name}</div> ))} </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:16, fontWeight:700 }}>{money(total)}</span>
        <div style={{ display:'flex', gap:6 }} onClick={e=>e.stopPropagation()}>
          {order.status==='new' && (
            <Button size="sm" onClick={()=>onStatusChange(order.id,'in_progress')}>Start</Button>
          )}
          {order.status==='in_progress' && (
            <Button size="sm" variant="success" onClick={()=>onStatusChange(order.id,'ready')}>Ready</Button>
          )}
          {order.status==='ready' && !hasInvoice && (
            <Button size="sm" onClick={()=>onComplete(order.id)} disabled={generatingInvoice===order.id}>
              {generatingInvoice===order.id ? 'Processing…' : 'Done'}
            </Button>
          )}
          {hasInvoice && (
            <Button size="sm" variant="outline" onClick={()=>window.open(order.invoice.pdf_url,'_blank')}>
              Bill
            </Button>
          )}
        </div>
      </div>
      <div style={{ height:2, marginTop:10, background:statusColor, opacity:0.2, borderRadius:2 }}/>
    </Card>
  );
}

// OrderDetailModal component
function OrderDetailModal({ order, onClose, onCompleteOrder, generatingInvoice }) {
  const items = toDisplayItems(order);
  const hasInvoice = Boolean(order.invoice?.pdf_url);
  const subtotal = Number(order.subtotal_ex_tax ?? order.subtotal ?? 0);
  const tax      = Number(order.total_tax ?? order.tax_amount ?? 0);
  const total    = Number(order.total_inc_tax ?? order.total_amount ?? 0);

  return (
    <div className="modal" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal__card">
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <h2>Order #{order.id.slice(0,8)}</h2>
          <Button variant="outline" onClick={onClose}>×</Button>
        </div>
        <Card padding={16}>
          <div><strong>Time:</strong> {new Date(order.created_at).toLocaleString()}</div>
          <div><strong>Table:</strong> {order.table_number||'—'}</div>
          <div><strong>Payment:</strong> {order.payment_method}</div>
        </Card>
        <Card padding={16} style={{ marginTop:12 }}>
          <h3>Items</h3>
          {items.map((it,i)=>
            <div key={i} style={{ display:'flex', justifyContent:'space-between' }}>
              <span>{it.quantity}× {it.name}</span>
              <span>{money(it.quantity * it.price)}</span>
            </div>
          )}
        </Card>
        <Card padding={16} style={{ marginTop:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between' }}><span>Tax</span><span>{money(tax)}</span></div>
          <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, marginTop:6 }}><span>Total</span><span>{money(total)}</span></div>
        </Card>
        <div style={{ textAlign:'right', marginTop:12 }}>
          {!hasInvoice && order.status==='ready' && (
            <Button onClick={()=>onCompleteOrder(order.id)} disabled={generatingInvoice===order.id}>
              {generatingInvoice===order.id ? 'Generating…' : 'Generate Invoice'}
            </Button>
          )}
          {hasInvoice && (
            <Button variant="outline" onClick={()=>window.open(order.invoice.pdf_url,'_blank')}>
              View Invoice
            </Button>
          )}
        </div>
      </div>
      <style jsx>{`
        .modal {position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:50;padding:12px;}
        .modal__card {background:#fff;width:100%;max-width:520px;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.15);overflow:auto;}
      `}</style>
    </div>
  );
}

// ConfirmDialog component
function ConfirmDialog({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
  return (
    <div className="modal" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="modal__card" style={{maxWidth:420}}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
          <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
          <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
      <style jsx>{`
        .modal {position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;alignItems:center;justifyContent:center;z-index:50;padding:12px;}
        .modal__card {background:#fff;padding:16px;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.15);}
      `}</style>
    </div>
  );
}
