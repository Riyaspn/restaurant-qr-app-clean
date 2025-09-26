//pages/owner/order
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '../../lib/firebaseClient';

// Constants
const STATUSES = ['new', 'in_progress', 'ready', 'completed'];
const LABELS = { new: 'New', in_progress: 'Cooking', ready: 'Ready', completed: 'Done' };
const COLORS = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' };
const PAGE = 20;

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
function PaymentConfirmDialog({ order, onConfirm, onCancel }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 8,
        maxWidth: 400,
        margin: 16
      }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Payment Confirmation</h3>
        <p>Order #{order.id.slice(0, 8)} - Table {order.table_number}</p>
        <p>Amount: ₹{Number(order.total_inc_tax ?? order.total_amount ?? 0).toFixed(2)}</p>
        <p><strong>Has the customer completed the payment?</strong></p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <Button onClick={onConfirm} variant="success">
            Yes, Payment Received
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

  return [];
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
  const [generatingInvoice, setGeneratingInvoice] = useState(null);
  const [paymentConfirmDialog, setPaymentConfirmDialog] = useState(null);
  const notificationAudioRef = useRef(null);
  
  // Audio ref and battery/ping setup
  const [audioRef, setAudioRef] = useState(null);

  
  // Consolidated audio initialization and unlock
  useEffect(() => {
    const a = new Audio('/notification-sound.mp3');
    a.load();
    notificationAudioRef.current = a;

    function unlockAudio() {
      const audio = notificationAudioRef.current;
      if (!audio) return;
      const wasMuted = audio.muted;
      audio.muted = true;
      audio.play().catch(() => {});
      audio.pause();
      audio.currentTime = 0;
      audio.muted = wasMuted;
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

  // New audio ref setup (fallback) and mobile unlock
  useEffect(() => {
    const audio = new Audio('/beep.wav');
    audio.load();
    setAudioRef(audio);
    
    const unlockAudio = () => {
      if (audio) {
        audio.muted = true;
        audio.play().catch(() => {});
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      }
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
    
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('click', unlockAudio, { once: true });
    
    return () => {
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('click', unlockAudio);
    };
  }, []);

  // Function to play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      if (audioRef) {
        audioRef.volume = 0.8;
        audioRef.play().catch(console.error);
      }
    } catch (e) {
      console.log('Audio playback failed:', e);
    }
  }, [audioRef]);

  // Battery & keep-alive ping
  useEffect(() => {
    if ('navigator' in window && 'getBattery' in navigator) {
      console.log('Consider adding battery optimization exemption');
    }
    
    const keepAlive = setInterval(() => {
      if (!document.hidden) {
        fetch('/api/ping', { method: 'POST' }).catch(() => {});
      }
    }, 30000);
    
    return () => clearInterval(keepAlive);
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

    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // listen for INSERT, UPDATE, DELETE if needed
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const order = payload.new; // new row data
          if (!order) return; // for DELETE events, payload.new is null

          setOrdersByStatus((prev) => {
            // Remove the order from all status buckets
            const updated = { ...prev };
            for (const status of ['new', 'in_progress', 'ready', 'completed']) {
              updated[status] = prev[status].filter((o) => o.id !== order.id);
            }
            // Add the order to its current status bucket (if any)
            if (order.status && updated.hasOwnProperty(order.status)) {
              updated[order.status] = [order, ...updated[order.status]];
            }
            return updated;
          });

          // Play fallback sound for new orders via playNotificationSound
          if (payload.eventType === 'INSERT' && order.status === 'new') {
            playNotificationSound();
            
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('🔔 New Order!', {
                body: `Table ${order.table_number || ''} - ${order.total_inc_tax ? `₹${order.total_inc_tax}` : ''}`,
                icon: '/favicon.ico',
                tag: 'new-order',
              });
            }
          }
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
                    arr.findIndex((o) => o.id === order.id) === index
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
                  arr.findIndex((o) => o.id === order.id) === index
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
  }, [restaurantId, playNotificationSound, loadOrders]); // Added loadOrders and playNotificationSound to dependencies

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

  const finalizeComplete = async (order) => {
  // Check if it's a "Pay at Counter" order
  if (order.payment_method === 'pay_at_counter' || order.payment_method === 'counter') {
    setPaymentConfirmDialog(order);
    return;
  }

  // For other payment methods, proceed normally
  await completeOrder(order.id);
};

const handlePaymentConfirmed = async () => {
  const order = paymentConfirmDialog;
  setPaymentConfirmDialog(null);
  await completeOrder(order.id);
};

const handlePaymentCanceled = () => {
  setPaymentConfirmDialog(null);
};

const completeOrder = async (orderId) => {
  setGeneratingInvoice(orderId);
  try {
    await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId)
      .eq('restaurant_id', restaurantId);

    const resp = await fetch('/api/invoices/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
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
          {/* Removed old EnableAlertsButton in favor of hook */}
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
              onComplete={(order) => finalizeComplete(order)}
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
                    onComplete={(order) => finalizeComplete(order)}
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

// OrderCard component
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
        <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
          Table {order.table_number || 'N/A'}
        </span>
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
            <Button size="sm" onClick={() => onComplete(order)} disabled={generatingInvoice === order.id}>
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
