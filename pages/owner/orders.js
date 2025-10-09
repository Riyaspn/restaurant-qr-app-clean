// pages/owner/orders.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { getSupabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { subscribeOwnerDevice } from '../../helpers/subscribePush';
import KotPrint from '../../components/KotPrint';



// Constants
const STATUSES = ['new', 'in_progress', 'ready', 'completed'];
const LABELS = { new: 'New', in_progress: 'Cooking', ready: 'Ready', completed: 'Done' };
const COLORS = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' };
const PAGE_SIZE = 20;



// Helpers
const money = (v) => `₹${Number(v ?? 0).toFixed(2)}`;
const prefix = (s) => (s ? s.slice(0, 24) : '');

// Single source of truth for totals: order-level fields only
function computeOrderTotalDisplay(order) {
  const toNum = (v) => (v == null ? null : Number(v))
  const a = toNum(order?.total_inc_tax)
  if (Number.isFinite(a) && a > 0) return a
  const b = toNum(order?.total_amount)
  if (Number.isFinite(b) && b > 0) return b
  const c = toNum(order?.total)
  if (Number.isFinite(c) && c > 0) return c
  return 0
}

function toDisplayItems(order) {
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.order_items)) {
    return order.order_items.map((oi) => ({
      name: oi.menu_items?.name || oi.item_name || 'Item',
      quantity: oi.quantity,
      price: oi.price,
    }));
  }
  return [];
}

// UI Component: PaymentConfirmDialog
function PaymentConfirmDialog({ order, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ backgroundColor: 'white', padding: 20, borderRadius: 8, maxWidth: 400, margin: 16 }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Payment Confirmation</h3>
        <p>Order #{order.id.slice(0, 8)} - Table {order.table_number}</p>
        <p>Amount: {money(computeOrderTotalDisplay(order))}</p>
        <p><strong>Has the customer completed the payment?</strong></p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button onClick={onConfirm} variant="success">Yes, Payment Received</Button>
          <Button onClick={onCancel} variant="outline">Cancel</Button>
        </div>
      </div>
    </div>
  );
}

async function fetchFullOrder(supabase, orderId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .eq('id', orderId)
    .single();
  if (!error && data) return data;
  return null;
}


export default function OrdersPage() {
  const supabase = getSupabase();
  const { user, checking } = useRequireAuth(supabase);
  const { restaurant, loading: restLoading } = useRestaurant();
  const restaurantId = restaurant?.id;
  const [showKotPrint, setShowKotPrint] = useState(null);


  const [ordersByStatus, setOrdersByStatus] = useState({
    new: [], in_progress: [], ready: [], completed: [], mobileFilter: 'new'
  });
  const [completedPage, setCompletedPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generatingInvoice, setGeneratingInvoice] = useState(null);
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState(null);
  const notificationAudioRef = useRef(null);

  // Save token to user profile (optional, unchanged)
  useEffect(() => {
    const saveToken = async () => {
      if (!user || !supabase) return;
      const fcmToken = localStorage.getItem('fcm_token');
      if (!fcmToken) return;
      try {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ fcm_token: fcmToken })
          .eq('id', user.id);
        if (updateError) console.error('profile fcm_token update error', updateError);
      } catch (e) {
        console.error('profile fcm_token update exception', e);
      }
    };
    if (user) saveToken();
  }, [user, supabase]);

  // Subscribe this device token to the restaurant so server can send pushes
  useEffect(() => {
    let canceled = false;

    async function subscribeWith(token) {
      if (!restaurantId || !token) return;
      const platform = Capacitor.isNativePlatform() ? 'android' : 'web';
      console.log('[push] subscribing', { rid: restaurantId, tokenPrefix: prefix(token), platform });
      try {
        await subscribeOwnerDevice({ restaurantId, token, platform });
        if (!canceled) console.log('[push] subscribed OK', { rid: restaurantId });
        // Echo back current prefixes for debug
        try {
          const r = await fetch('/api/push/echo?rid=' + encodeURIComponent(restaurantId));
          const j = await r.json();
          console.log('[push] echo', j);
        } catch {}
      } catch (e) {
        console.warn('[push] subscribe error', e);
      }
    }

    async function run() {
      if (!restaurantId) return;
      // First attempt with whatever is already stored by _app registration
      const stored = localStorage.getItem('fcm_token');
      if (stored) await subscribeWith(stored);

      // Retry shortly to capture refreshed token if it appears a moment later
      setTimeout(() => {
        const again = localStorage.getItem('fcm_token');
        if (!canceled && again && again !== stored) {
          console.log('[push] retry subscribe with updated token', prefix(again));
          subscribeWith(again);
        }
      }, 1500);
    }

    run();
    return () => { canceled = true; };
  }, [restaurantId]);

  // Initialize notification audio
  useEffect(() => {
    const audio = new Audio('/notification-sound.mp3');
    audio.load();
    notificationAudioRef.current = audio;

    function unlockAudio() {
      const a = notificationAudioRef.current;
      if (!a) return;
      const wasMuted = a.muted;
      a.muted = true;
      a.play().catch(() => {});
      a.pause();
      a.currentTime = 0;
      a.muted = wasMuted;
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

  // Play notification sound helper
  const playNotificationSound = useCallback(() => {
    try {
      if (notificationAudioRef.current) {
        notificationAudioRef.current.volume = 0.8;
        notificationAudioRef.current.play().catch(console.error);
      }
    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  }, []);

  // Keep-alive ping
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) fetch('/api/ping', { method: 'POST' }).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch orders helper
  async function fetchBucket(status, page = 1) {
    if (!supabase || !restaurantId) return [];
    let q = supabase
      .from('orders')
      .select('*, order_items(*, menu_items(name))')
      .eq('restaurant_id', restaurantId)
      .eq('status', status);

    if (status === 'completed') {
      const to = page * PAGE_SIZE - 1;
      const { data, error } = await q.order('created_at', { ascending: false }).range(0, to);
      if (error) throw error;
      return data;
    }

    const { data, error } = await q.order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }

  // loadOrders
  const loadOrders = useCallback(async (page = completedPage) => {
    if (!supabase || !restaurantId) return;
    setLoading(true);
    setError('');
    try {
      const [n, i, r, c] = await Promise.all([
        fetchBucket('new'),
        fetchBucket('in_progress'),
        fetchBucket('ready'),
        fetchBucket('completed', page),
      ]);

      const all = [...n, ...i, ...r, ...c];
      const ids = all.map((o) => o.id);
      let invMap = {};

      if (ids.length) {
        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('order_id, pdf_url')
          .in('order_id', ids);
        if (error) console.error('Invoice fetch error:', error);
        invoices?.forEach((inv) => { invMap[inv.order_id] = inv.pdf_url; });
      }

      const attach = (rows) => rows.map((o) => ({ ...o, invoice: invMap[o.id] ? { pdf_url: invMap[o.id] } : null }));

      setOrdersByStatus({
        new: attach(n),
        in_progress: attach(i),
        ready: attach(r),
        completed: attach(c),
        mobileFilter: 'new',
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [completedPage, restaurantId, supabase]);

  useEffect(() => {
    if (restaurantId) {
      setCompletedPage(1);
      loadOrders(1);
    }
  }, [restaurantId, loadOrders]);

  // Realtime subscription & reconnection logic
  useEffect(() => {
  if (!supabase || !restaurantId) return;

  const channel = supabase
    .channel(`orders:${restaurantId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
      (payload) => {
        const order = payload.new;
        if (!order) return;

        setOrdersByStatus((prev) => {
          const updated = { ...prev };
          for (const status of STATUSES) {
            updated[status] = prev[status].filter((o) => o.id !== order.id);
          }
          if (order.status && updated[order.status]) {
            updated[order.status] = [order, ...updated[order.status]];
          }
          return updated;
        });

        // --- Fix: Always fetch order with items before show KOT ---
        if (payload.eventType === 'INSERT' && order.status === 'new') {
          playNotificationSound();

          // Always fetch from backend for correct nested items
          supabase
            .from('orders')
            .select('*, order_items(*, menu_items(name))')
            .eq('id', order.id)
            .single()
            .then(({ data, error }) => {
              if (!error && data) {
                setShowKotPrint(data);
              } else {
                setShowKotPrint(order); // fallback (minimal info)
              }
            });
        }
      }
    )
    .subscribe();

  function onVisible() {
    if (document.visibilityState === 'visible') {
      setTimeout(async () => {
        try {
          if (!supabase) return;
          const { data } = await supabase
            .from('orders')
            .select('*, order_items(*, menu_items(name))')
            .eq('restaurant_id', restaurantId)
            .eq('status', 'new')
            .gte('created_at', new Date(Date.now() - 120000).toISOString())
            .order('created_at', { ascending: true });
          if (data) {
            setOrdersByStatus((prev) => ({
              ...prev,
              new: [...data, ...prev.new].filter((o, i, arr) => arr.findIndex((x) => x.id === o.id) === i),
            }));
          }
        } catch (e) {
          console.warn('Visibility catch-up error:', e);
        }
      }, 500);
    }
  }

  window.addEventListener('visibilitychange', onVisible);
  return () => {
    window.removeEventListener('visibilitychange', onVisible);
    if (supabase) supabase.removeChannel(channel);
  };
}, [supabase, restaurantId, playNotificationSound]);


  // All remaining functions and JSX unchanged

  async function updateStatus(id, next) {
    if (!supabase) return;
    try {
      await supabase.from('orders').update({ status: next }).eq('id', id).eq('restaurant_id', restaurantId);
      loadOrders();
    } catch (e) {
      setError(e.message);
    }
  }

  const finalize = (order) => {
    if (order.payment_method === 'pay_at_counter' || order.payment_method === 'counter') {
      setPaymentConfirmDialog(order);
    } else {
      complete(order.id);
    }
  };

  const handlePaymentConfirmed = () => {
    if (!paymentConfirmDialog) return;
    complete(paymentConfirmDialog.id);
    setPaymentConfirmDialog(null);
  };
  const handlePaymentCanceled = () => setPaymentConfirmDialog(null);

  const complete = async (orderId) => {
    if (!supabase) return;
    setGeneratingInvoice(orderId);
    try {
      await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId).eq('restaurant_id', restaurantId);
      const resp = await fetch('/api/invoices/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId }),
      });
      if (!resp.ok) throw new Error('Invoice generation failed');
      const { pdf_url } = await resp.json();
      if (pdf_url) window.open(pdf_url, '_blank');
      loadOrders();
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingInvoice(null);
    }
  };

  if (checking || restLoading) return <div style={{ padding: 16 }}>Loading…</div>;
  if (!restaurantId) return <div style={{ padding: 16 }}>No restaurant found.</div>;
  if (showKotPrint) {
  console.log('Rendering KOT print modal', showKotPrint);
  return <KotPrint order={showKotPrint} onClose={() => setShowKotPrint(null)} />;
  }

  return (
    <div className="orders-wrap">
      <header className="orders-header">
        <h1>Orders Dashboard</h1>
        <div className="header-actions">
          <span className="muted">
            {['new','in_progress','ready'].reduce((sum, s) => sum + ordersByStatus[s].length, 0)} live orders
          </span>
          <Button variant="outline" onClick={() => { setCompletedPage(1); loadOrders(1); }}>Refresh</Button>
        </div>
      </header>

      {error && (
        <Card padding={12} style={{ background: '#fee2e2', border: '1px solid #fecaca', margin: '0 12px 12px' }}>
          <span style={{ color: '#b91c1c' }}>{error}</span>
        </Card>
      )}

      <div className="mobile-filters">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`chip ${s === (ordersByStatus.mobileFilter || 'new') ? 'chip--active' : ''}`}
            onClick={() => setOrdersByStatus((prev) => ({ ...prev, mobileFilter: s }))}
          >
            <span className="chip-label">{LABELS[s]}</span>
            <span className="chip-count">{ordersByStatus[s].length}</span>
          </button>
        ))}
      </div>

      <div className="mobile-list">
        {ordersByStatus[ordersByStatus.mobileFilter || 'new'].length === 0 ? (
          <Card className="muted" padding={12} style={{ textAlign: 'center' }}>
            No {LABELS[ordersByStatus.mobileFilter || 'new'].toLowerCase()} orders
          </Card>
        ) : (
          ordersByStatus[ordersByStatus.mobileFilter || 'new'].map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              statusColor={COLORS[order.status]}
              onChangeStatus={updateStatus}
              onComplete={finalize}
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
              <span className="pill">{ordersByStatus[status].length}</span>
            </div>
            <div className="kanban-col-body">
              {ordersByStatus[status].length === 0 ? (
                <div className="empty-col">No {LABELS[status].toLowerCase()} orders</div>
              ) : (
                ordersByStatus[status].map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    statusColor={COLORS[status]}
                    onChangeStatus={updateStatus}
                    onComplete={finalize}
                    generatingInvoice={generatingInvoice}
                  />
                ))
              )}
              {status === 'completed' && ordersByStatus.completed.length >= PAGE_SIZE && (
                <>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Showing latest {ordersByStatus.completed.length} completed orders
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <Button variant="outline" onClick={() => { setCompletedPage((p) => p + 1); loadOrders(completedPage + 1); }}>
                      Load more
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      {paymentConfirmDialog && (
        <PaymentConfirmDialog
          order={paymentConfirmDialog}
          onConfirm={handlePaymentConfirmed}
          onCancel={handlePaymentCanceled}
        />
      )}

      <style jsx>{`
        .orders-wrap { padding: 12px 0 32px; }
        .orders-header { display: flex; justify-content: space-between; align-items: center; padding: 0 12px 12px; }
        .orders-header h1 { margin: 0; font-size: clamp(20px, 2.6vw, 28px); }
        .header-actions { display: flex; align-items: center; gap: 10px; }
        .muted { color: #6b7280; font-size: 14px; }
        .mobile-filters { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 0 12px 12px; }
        .chip { border: 1px solid #e5e7eb; border-radius: 14px; padding: 8px; display: flex; justify-content: space-between; background: #fff; cursor: pointer; }
        .chip--active { background: #eef2ff; border-color: #c7d2fe; }
        .chip-label { font-weight: 600; font-size: 13px; }
        .chip-count { background: #111827; color: #fff; border-radius: 9999px; padding: 0 6px; font-size: 12px; }
        .mobile-list { display: grid; gap: 10px; padding: 0 12px; }
        .kanban { display: none; }
        @media (min-width: 1024px) {
          .kanban { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; padding: 12px 16px; }
          .mobile-filters, .mobile-list { display: none; }
        }
        .kanban-col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .pill { background: #f3f4f6; padding: 4px 10px; border-radius: 9999px; font-size: 12px; }
        .kanban-col-body { display: flex; flex-direction: column; gap: 10px; max-height: 70vh; overflow-y: auto; }
        .empty-col { text-align: center; color: #9ca3af; padding: 20px; border: 1px dashed #e5e7eb; border-radius: 8px; }
      `}</style>
    </div>
  );
}

// OrderCard component
  function OrderCard({ order, statusColor, onChangeStatus, onComplete, generatingInvoice }) {
  const items = toDisplayItems(order);
  const hasInvoice = Boolean(order?.invoice?.pdf_url);
  const total = computeOrderTotalDisplay(order);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handlePrintClick = () => {
    console.log('Print KOT clicked for order:', order.id);
    setShowPrintModal(true);
  };

  const handlePrintConfirm = () => {
    console.log('Print confirmed, calling window.print()');
    setShowPrintModal(false);
  };

  const handlePrintClose = () => {
    console.log('Print modal closed');
    setShowPrintModal(false);
  };

  return (
    <>
      <Card padding={12} style={{ border: '1px solid #eef2f7', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <strong>#{order.id.slice(0, 8)}</strong>
          <span style={{ marginLeft: 8 }}><small>Table {order.table_number || 'N/A'}</small></span>
          <span style={{ color: '#6b7280', fontSize: 12 }}>{new Date(order.created_at).toLocaleTimeString()}</span>
        </div>
        <div style={{ margin: '8px 0', fontSize: 14 }}>
          {items.map((it, i) => (<div key={i}>{it.quantity}× {it.name}</div>))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{money(total)}</span>
          <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            {order.status === 'new' && (<Button size="sm" onClick={() => onChangeStatus(order.id, 'in_progress')}>Start</Button>)}
            {order.status === 'in_progress' && (<Button size="sm" variant="success" onClick={() => onChangeStatus(order.id, 'ready')}>Ready</Button>)}
            {order.status === 'ready' && !hasInvoice && (<Button size="sm" onClick={() => onComplete(order)} disabled={generatingInvoice === order.id}>{generatingInvoice === order.id ? 'Processing…' : 'Done'}</Button>)}
            {hasInvoice && (<Button size="sm" onClick={() => window.open(order.invoice.pdf_url, '_blank')}>Bill</Button>)}
            {order.status === 'new' && (
              <button 
                onClick={handlePrintClick} 
                style={{ 
                  background: '#10b981', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '6px 12px', 
                  borderRadius: '4px', 
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Print KOT
              </button>
            )}
          </div>
        </div>
        <div style={{ height: 2, marginTop: 10, background: statusColor, opacity: 0.2, borderRadius: 2 }} />
      </Card>

      {showPrintModal && (
        <KotPrint
          order={order}
          onClose={handlePrintClose}
          onPrint={handlePrintConfirm}
        />
      )}
    </>
  );
}
