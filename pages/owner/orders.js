// pages/owner/orders.js
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '../../lib/firebaseClient';

// Constants
const STATUSES = ['new', 'in_progress', 'ready', 'completed'];
const LABELS   = { new: 'New', in_progress: 'Cooking', ready: 'Ready', completed: 'Done' };
const COLORS   = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' };
const PAGE     = 20;

// Helpers
const money = (v) => `₹${Number(v ?? 0).toFixed(2)}`;
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

// Enhanced Enable Alerts Button with iOS support and state persistence
function EnableAlertsButton({ restaurantId, userEmail }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Check if device already has notifications enabled
  useEffect(() => {
    const checkExistingPermission = async () => {
      const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      setIsIOS(isiOS);
      
      if ('Notification' in window && Notification.permission === 'granted') {
        // Check if we have a token stored for this device
        try {
          const messaging = await getMessagingIfSupported();
          if (messaging) {
            const token = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });
            if (token) {
              setEnabled(true);
            }
          }
        } catch (e) {
          console.log('Token check failed:', e);
        }
      }
    };
    checkExistingPermission();
  }, []);

  const enablePush = async () => {
    setLoading(true);
    try {
      // iOS Safari web push check
      if (isIOS) {
        if (!('Notification' in window)) {
          alert('iOS Safari web push notifications require iOS 16.4+ and adding this site to Home Screen. Please use Chrome or add to Home Screen first.');
          return;
        }
      } else if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Please allow notifications to receive order alerts.');
        return;
      }

      // For iOS, use native notifications
      if (isIOS) {
        // iOS will use native notifications, store a placeholder token
        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deviceToken: 'ios-native-' + Date.now(),
            restaurantId,
            userEmail,
            platform: 'ios',
          }),
        });
        
        if (!res.ok) throw new Error('Subscribe failed');
        
        setEnabled(true);
        alert('Order alerts enabled! You will receive notifications for new orders.');
        return;
      }

      // For Android/Windows - use FCM
      await navigator.serviceWorker.ready;
      const messaging = await getMessagingIfSupported();
      if (!messaging) throw new Error('Messaging not supported');

      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
      });

      if (!token) throw new Error('Failed to get push token');

      const ua = navigator.userAgent || '';
      const platform = /Android/i.test(ua) ? 'android' : 'web';

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken: token,
          restaurantId,
          userEmail,
          platform,
        }),
      });
      
      if (!res.ok) throw new Error('Subscribe failed');

      // Test audio unlock
      try { 
        const audio = new Audio('/notification-sound.mp3');
        audio.volume = 0.1;
        await audio.play(); 
      } catch {}

      setEnabled(true);
      alert('Order alerts enabled successfully!');
    } catch (e) {
      console.error('Enable alerts failed:', e);
      alert(`Failed to enable alerts: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={enablePush} 
      disabled={loading}
      variant={enabled ? "success" : "outline"}
    >
      {loading ? 'Enabling...' : enabled ? 'Alerts Active' : isIOS ? 'Enable iOS Alerts' : 'Enable Push Alerts'}
    </Button>
  );
}

export default function OrdersPage() {
  const { checking, user } = useRequireAuth();
  const { restaurant, loading: restLoading } = useRestaurant();
  const restaurantId = restaurant?.id;

  const [ordersByStatus, setOrdersByStatus] = useState({
    new: [], in_progress: [], ready: [], completed: [], mobileFilter: 'new'
  });
  const [completedPage, setCompletedPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, orderId: null });
  const [generatingInvoice, setGeneratingInvoice] = useState(null);

  const notificationAudioRef = useRef(null);

  // Auto-register FCM token if permission already granted (non-intrusive)
  useEffect(() => {
    const bootstrap = async () => {
      if (!restaurantId || !user) return;

      const messaging = await getMessagingIfSupported();
      if (messaging && 'Notification' in window && Notification.permission === 'granted') {
        try {
          const reg = await navigator.serviceWorker.ready;
          const token = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: reg,
          });
          if (token) {
            console.log('FCM Token auto-registered:', token);
            await fetch('/api/push/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceToken: token,
                restaurantId,
                userEmail: user.email,
                platform: /Android/.test(navigator.userAgent) ? 'android' : 'web',
              }),
            });
          }
        } catch (error) {
          console.error('Auto FCM setup failed:', error);
        }
      }
    };
    bootstrap();
  }, [restaurantId, user]);

  // Preload audio and unlock after first interaction
  useEffect(() => {
    const a = new Audio('/notification-sound.mp3');
    a.load();
    notificationAudioRef.current = a;
  }, []);

  useEffect(() => {
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
        fetchBucket('completed', page),
      ]);

      const all = [...n, ...i, ...r, ...c];
      const ids = all.map((o) => o.id);

      let invMap = {};
      if (ids.length) {
        const { data: invs, error: invError } = await supabase
          .from('invoices')
          .select('order_id,pdf_url')
          .in('order_id', ids);
        if (invError) console.error('Invoice fetch error:', invError);
        (invs || []).forEach((inv) => {
          invMap[inv.order_id] = inv.pdf_url;
        });
      }

      const attach = (rows) =>
        rows.map((o) => ({
          ...o,
          invoice: invMap[o.id] ? { pdf_url: invMap[o.id] } : null,
        }));

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
  }

  useEffect(() => {
    if (restaurantId) {
      setCompletedPage(1);
      loadOrders(1);
    }
  }, [restaurantId]);

  // Enhanced Supabase Realtime with reconnection and Android throttling handling
  useEffect(() => {
    if (!restaurantId) return;

    console.log('Setting up realtime subscription for restaurant:', restaurantId);

    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          console.log('Realtime INSERT received:', payload);
          const order = payload.new;
          
          // Play sound
          notificationAudioRef.current?.play().catch(() => {});
          
          // Cross-platform notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 New Order!', {
              body: `Table ${order.table_number || ''} - ${order.total_inc_tax ? `₹${order.total_inc_tax}` : ''}`,
              icon: '/favicon.ico',
              tag: 'new-order'
            });
          }
          
          // Update UI immediately
          setOrdersByStatus((prev) => ({
            ...prev,
            new: [order, ...prev.new],
          }));
        }
      )
      .subscribe((status) => {
        console.log('Realtime channel status:', status);
        
        // Handle reconnection issues
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          setTimeout(async () => {
            try {
              const { data } = await supabase
                .from('orders')
                .select('*, order_items(*, menu_items(name))')
                .eq('restaurant_id', restaurantId)
                .eq('status', 'new')
                .gte('created_at', new Date(Date.now() - 60000).toISOString())
                .order('created_at', { ascending: true });
              
              if (data?.length) {
                setOrdersByStatus((prev) => ({
                  ...prev,
                  new: [...data, ...prev.new].filter((order, index, arr) => 
                    arr.findIndex(o => o.id === order.id) === index
                  ),
                }));
              }
            } catch (e) {
              console.warn('Catch-up fetch failed:', e);
            }
          }, 1000);
        }
      });

    // Handle visibility change for Android throttling
    function onVisible() {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible, checking for missed orders');
        setTimeout(async () => {
          try {
            const { data } = await supabase
              .from('orders')
              .select('*, order_items(*, menu_items(name))')
              .eq('restaurant_id', restaurantId)
              .eq('status', 'new')
              .gte('created_at', new Date(Date.now() - 120000).toISOString())
              .order('created_at', { ascending: true });
            
            if (data?.length) {
              setOrdersByStatus((prev) => ({
                ...prev,
                new: [...data, ...prev.new].filter((order, index, arr) => 
                  arr.findIndex(o => o.id === order.id) === index
                ),
              }));
            }
          } catch (e) {
            console.warn('Visibility catch-up failed:', e);
          }
        }, 500);
      }
    }
    
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
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

  const finalizeComplete = async (id) => {
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
        body: JSON.stringify({ order_id: id }),
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
          <EnableAlertsButton restaurantId={restaurantId} userEmail={user?.email} />
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
          <Card padding={16} style={{ textAlign: 'center', color: '#6b7280' }}>
            No {LABELS[ordersByStatus.mobileFilter || 'new'].toLowerCase()}
          </Card>
        ) : (
          ordersByStatus[ordersByStatus.mobileFilter || 'new'].map((o) => (
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
        {STATUSES.map((status) => (
          <Card key={status} padding={12}>
            <div className="kanban-col-header">
              <strong style={{ color: COLORS[status] }}>{LABELS[status]}</strong>
              <span className="pill">{ordersByStatus[status].length}</span>
            </div>
            <div className="kanban-col-body">
              {ordersByStatus[status].length === 0 ? (
                <div className="empty-col">No {LABELS[status].toLowerCase()}</div>
              ) : (
                ordersByStatus[status].map((o) => (
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
                        setCompletedPage((p) => p + 1);
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
          cursor: pointer;
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

// OrderCard component remains the same...
function OrderCard({ order, statusColor, onStatusChange, onComplete, generatingInvoice }) {
  const items = toDisplayItems(order);
  const hasInvoice = Boolean(order?.invoice?.pdf_url);
  const total = Number(order.total_inc_tax ?? order.total_amount ?? 0);

  return (
    <Card
      padding={12}
      style={{
        border: '1px solid #eef2f7',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <strong>#{order.id.slice(0, 8)}</strong>
        <span style={{ color: '#6b7280', fontSize: 12 }}>
          {new Date(order.created_at).toLocaleTimeString()}
        </span>
      </div>

      <div style={{ margin: '8px 0', fontSize: 14 }}>
        {items.map((it, i) => (
          <div key={i}>
            {it.quantity}× {it.name}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{money(total)}</span>
        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          {order.status === 'new' && (
            <Button size="sm" onClick={() => onStatusChange(order.id, 'in_progress')}>
              Start
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button size="sm" variant="success" onClick={() => onStatusChange(order.id, 'ready')}>
              Ready
            </Button>
          )}
          {order.status === 'ready' && !hasInvoice && (
            <Button size="sm" onClick={() => onComplete(order.id)} disabled={generatingInvoice === order.id}>
              {generatingInvoice === order.id ? 'Processing…' : 'Done'}
            </Button>
          )}
          {hasInvoice && (
            <Button size="sm" variant="outline" onClick={() => window.open(order.invoice.pdf_url, '_blank')}>
              Bill
            </Button>
          )}
        </div>
      </div>

      <div style={{ height: 2, marginTop: 10, background: statusColor, opacity: 0.2, borderRadius: 2 }} />
    </Card>
  );
}

// OrderDetailModal and ConfirmDialog remain the same...
function OrderDetailModal({ order, onClose, onCompleteOrder, generatingInvoice }) {
  const items = toDisplayItems(order);
  const hasInvoice = Boolean(order?.invoice?.pdf_url);
  const subtotal = Number(order.subtotal_ex_tax ?? order.subtotal ?? 0);
  const tax = Number(order.total_tax ?? order.tax_amount ?? 0);
  const total = Number(order.total_inc_tax ?? order.total_amount ?? 0);

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h2>Order #{order.id.slice(0, 8)}</h2>
          <Button variant="outline" onClick={onClose}>
            ×
          </Button>
        </div>

        <Card padding={16}>
          <div>
            <strong>Time:</strong> {new Date(order.created_at).toLocaleString()}
          </div>
          <div>
            <strong>Table:</strong> {order.table_number || '—'}
          </div>
          <div>
            <strong>Payment:</strong> {order.payment_method}
          </div>
        </Card>

        <Card padding={16} style={{ marginTop: 12 }}>
          <h3>Items</h3>
          {items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>
                {it.quantity}× {it.name}
              </span>
              <span>{money(it.quantity * it.price)}</span>
            </div>
          ))}
        </Card>

        <Card padding={16} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tax</span>
            <span>{money(tax)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: 6 }}>
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
        </Card>

        <div style={{ textAlign: 'right', marginTop: 12 }}>
          {!hasInvoice && order.status === 'ready' && (
            <Button onClick={() => onCompleteOrder(order.id)} disabled={generatingInvoice === order.id}>
              {generatingInvoice === order.id ? 'Generating…' : 'Generate Invoice'}
            </Button>
          )}
          {hasInvoice && (
            <Button variant="outline" onClick={() => window.open(order.invoice.pdf_url, '_blank')}>
              View Invoice
            </Button>
          )}
        </div>
      </div>

      <style jsx>{`
        .modal {position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:50;padding:12px;}
        .modal__card {background:#fff;width:100%;max-width:520px;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.15);overflow:auto;padding:20px;}
      `}</style>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmText, cancelText, onConfirm, onCancel }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal__card" style={{ maxWidth: 420 }}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="outline" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
      <style jsx>{`
        .modal {position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:50;padding:12px;}
        .modal__card {background:#fff;padding:16px;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.15);}
      `}</style>
    </div>
  );
}
