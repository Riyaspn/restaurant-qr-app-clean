import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSupabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

// Constants
const STATUSES = ['new', 'in_progress', 'ready', 'completed'];
const LABELS = { new: 'New', in_progress: 'Cooking', ready: 'Ready', completed: 'Done' };
const COLORS = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' };
const PAGE_SIZE = 20;

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

// UI Component: PaymentConfirmDialog (No Changes Needed)
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

export default function OrdersPage() {
  const supabase = getSupabase();
  const { user, checking } = useRequireAuth(supabase); // Get user object
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

  // ========================================================================
  // === CHANGE 1: ADDED - Logic to save the FCM token to the database ===
  // ========================================================================
  useEffect(() => {
    const saveToken = async () => {
      if (!user || !supabase) return; // Wait for user and supabase client

      // Retrieve the token that _app.js placed in storage.
      const fcmToken = localStorage.getItem('fcm_token');
      
      if (fcmToken) {
        console.log('Orders page: Found FCM token, saving to database...');
        try {
          // Update the user's profile with the new FCM token
          const { error: updateError } = await supabase
            .from('profiles') // Assuming your user table is named 'profiles'
            .update({ fcm_token: fcmToken })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error saving FCM token:', updateError);
          } else {
            console.log('✅ FCM token saved to user profile.');
          }
        } catch (e) {
            console.error('Exception while saving FCM token:', e);
        }
      } else {
        console.log('Orders page: Waiting for FCM token from _app.js...');
      }
    };

    // Run this check when the user object is available.
    if (user) {
        saveToken();
    }
  }, [user, supabase]); // Dependency array ensures this runs when the user is authenticated.

  // Initialize notification audio (No Changes Needed)
  useEffect(() => {
    const audio = new Audio('/notification-sound.mp3');
    audio.load();
    notificationAudioRef.current = audio;

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

  // Play notification sound helper (No Changes Needed)
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

  // Keep alive ping (No Changes Needed)
  useEffect(() => {
    if ('navigator' in window && 'getBattery' in navigator) {
      console.log('Consider adding battery optimization exemption');
    }
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetch('/api/ping', { method: 'POST' }).catch(() => {});
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch orders helper function (No Changes Needed)
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

  // loadOrders function (No Changes Needed)
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
        invoices?.forEach((inv) => {
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
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
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

          // ========================================================================
          // === CHANGE 2: SIMPLIFIED - Only play a sound for foreground alerts. ===
          // ========================================================================
          // The visual notification is now handled by _app.js (for native)
          // and firebase-messaging-sw.js (for web background).
          if (payload.eventType === 'INSERT' && order.status === 'new') {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    function onVisible() {
      if (document.visibilityState === 'visible') {
        setTimeout(async () => {
          try {
            if (!supabase) return; // Add guard inside timeout
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
                    new: [...data, ...prev.new].filter((order, i, arr) => arr.findIndex((o) => o.id === order.id) === i),
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

  // All remaining functions (updateStatus, finalize, etc.) and JSX are unchanged.

  async function updateStatus(id, next) {
    if (!supabase) return;
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

  if (checking || restLoading) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }
  if (!restaurantId) {
    return <div style={{ padding: 16 }}>No restaurant found.</div>;
  }

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
            onClick={() => {
              setCompletedPage(1);
              loadOrders(1);
            }}
          >
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <Card
          padding={12}
          style={{ background: '#fee2e2', border: '1px solid #fecaca', margin: '0 12px 12px' }}
        >
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
        /* Your existing styles remain unchanged */
        .orders-wrap {
          padding: 12px 0 32px;
        }
        .orders-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 12px 12px;
        }
        .orders-header h1 {
          margin: 0;
          font-size: clamp(20px, 2.6vw, 28px);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .muted {
          color: #6b7280;
          font-size: 14px;
        }
        .mobile-filters {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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
        .chip--active {
          background: #eef2ff;
          border-color: #c7d2fe;
        }
        .chip-label {
          font-weight: 600;
          font-size: 13px;
        }
        .chip-count {
          background: #111827;
          color: #fff;
          border-radius: 9999px;
          padding: 0 6px;
          font-size: 12px;
        }
        .mobile-list {
          display: grid;
          gap: 10px;
          padding: 0 12px;
        }
        .kanban {
          display: none; /* Default to mobile-first */
        }
        @media (min-width: 1024px) {
          .kanban {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            padding: 12px 16px;
          }
          .mobile-filters, .mobile-list {
            display: none;
          }
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
          border-radius: 9999px;
          font-size: 12px;
        }
        .kanban-col-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 70vh;
          overflow-y: auto;
        }
        .empty-col {
          text-align: center;
          color: #9ca3af;
          padding: 20px;
          border: 1px dashed #e5e7eb;
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}

// OrderCard component (No changes needed)
function OrderCard({ order, statusColor, onChangeStatus, onComplete, generatingInvoice }) {
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
        <span style={{ marginLeft: 8 }}><small>Table {order.table_number || 'N/A'}</small></span>
        <span style={{ color: '#6b7280', fontSize: 12 }}>{new Date(order.created_at).toLocaleTimeString()}</span>
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
            <Button size="sm" onClick={() => onChangeStatus(order.id, 'in_progress')}>
              Start
            </Button>
          )}
          {order.status === 'in_progress' && (
            <Button size="sm" variant="success" onClick={() => onChangeStatus(order.id, 'ready')}>
              Ready
            </Button>
          )}
          {order.status === 'ready' && !hasInvoice && (
            <Button size="sm" onClick={() => onComplete(order)} disabled={generatingInvoice === order.id}>
              {generatingInvoice === order.id ? 'Processing…' : 'Done'}
            </Button>
          )}
          {hasInvoice && (
            <Button size="sm" onClick={() => window.open(order.invoice.pdf_url, '_blank')}>
              Bill
            </Button>
          )}
        </div>
      </div>
      <div style={{ height: 2, marginTop: 10, background: statusColor, opacity: 0.2, borderRadius: 2 }} />
    </Card>
  );
}
