// pages/owner/orders.js
import React, { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const STATUSES = ['new', 'in_progress', 'ready', 'completed'];

function groupByStatus(rows) {
  const buckets = { new: [], in_progress: [], ready: [], completed: [] };
  (rows || []).forEach((o) => {
    const s = o?.status && buckets[o.status] ? o.status : 'new';
    buckets[s].push(o);
  });
  return buckets;
}

// Build items for display from orders.items or fallback to order_items join
function toDisplayItems(order) {
  if (Array.isArray(order?.items) && order.items.length) {
    return order.items.map(it => ({
      name: it.name ?? 'Item',
      quantity: Number(it.quantity ?? 1) || 1,
      price: Number(it.price ?? 0) || 0,
    }));
  }
  if (Array.isArray(order?.order_items) && order.order_items.length) {
    return order.order_items.map(oi => ({
      name: oi.item_name || oi.menu_items?.name || 'Item',
      quantity: Number(oi.quantity ?? 1) || 1,
      price: Number(oi.price ?? 0) || 0,
    }));
  }
  return [];
}

export default function OrdersPage() {
  const { checking } = useRequireAuth();
  const { restaurant, loading: restLoading } = useRestaurant();

  const [orders, setOrders] = useState({ new: [], in_progress: [], ready: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, orderId: null }); // local confirm modal

  const restaurantId = restaurant?.id || '';

  // Initial load with nested join
  useEffect(() => {
    if (!restaurantId || checking || restLoading) return;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, menu_items(name))')
          .eq('restaurant_id', restaurantId)
          .in('status', STATUSES)
          .order('created_at', { ascending: true });

        if (error) throw error;
        setOrders(groupByStatus(data));
      } catch (e) {
        setError(e.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [restaurantId, checking, restLoading]);

  // Realtime subscription (Channel API)
  useEffect(() => {
    if (!restaurantId) return;

    const channelName = `orders:restaurant:${restaurantId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const newOrder = payload.new;
          setOrders((prev) => ({ ...prev, new: [{ ...newOrder, order_items: [] }, ...prev.new] }));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` },
        (payload) => {
          const updated = payload.new;
          setOrders((prev) => {
            const all = []
              .concat(prev.new, prev.in_progress, prev.ready, prev.completed)
              .filter((o) => o.id !== updated.id)
              .concat({ ...updated });
            return groupByStatus(all);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  const updateStatus = async (id, status) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } catch (e) {
      setError(e.message || 'Failed to update order');
    }
  };

  // Ensure detail has latest joined rows if needed
  const openDetail = async (order) => {
    if ((Array.isArray(order.items) && order.items.length) || (Array.isArray(order.order_items) && order.order_items.length)) {
      setDetail(order);
      return;
    }
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, order_items(*, menu_items(name))')
        .eq('id', order.id)
        .single();
      setDetail(data || order);
    } catch {
      setDetail(order);
    }
  };

  if (checking || restLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!restaurantId) return <div style={{ padding: 24 }}>No restaurant found.</div>;

  const liveCount = orders.new.length + orders.in_progress.length + orders.ready.length;

  return (
    <div className="container" style={{ padding: '20px 0 40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="h1">Orders Dashboard</h1>
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <span className="muted">{liveCount} live orders</span>
          <Button variant="outline" onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </header>

      {error && (
        <Card padding={12} style={{ background: '#fff1f2', borderColor: '#fecaca', marginBottom: 16 }}>
          <div style={{ color: '#b91c1c' }}>{error}</div>
        </Card>
      )}

      {loading ? (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <Card key={i} padding={20} style={{ opacity: 0.4, minHeight: 180 }} />
          ))}
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 16 }}>
          {STATUSES.map((status) => (
            <StatusCol
              key={status}
              status={status}
              orders={orders[status]}
              onStatusChange={updateStatus}
              onSelect={openDetail}
              onAskCancel={(orderId) => setConfirm({ open: true, orderId })}
            />
          ))}
        </div>
      )}

      {detail && (
        <OrderDetailModal
          order={detail}
          onClose={() => setDetail(null)}
          onChangeStatus={updateStatus}
        />
      )}

      {/* Small confirm popup for cancellation */}
      {confirm.open && (
        <ConfirmDialog
          title="Cancel this order?"
          message="This action cannot be undone."
          confirmText="Cancel Order"
          cancelText="Keep Order"
          onConfirm={() => {
            const id = confirm.orderId;
            setConfirm({ open: false, orderId: null });
            if (id) updateStatus(id, 'cancelled');
          }}
          onCancel={() => setConfirm({ open: false, orderId: null })}
        />
      )}
    </div>
  );
}

function StatusCol({ status, orders, onStatusChange, onSelect, onAskCancel }) {
  const label = { new: 'New', in_progress: 'In Progress', ready: 'Ready', completed: 'Completed' }[status];
  const color = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' }[status];

  return (
    <Card padding={16}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <strong style={{ color, textTransform: 'capitalize' }}>{label}</strong>
        <span style={{ background: '#f3f4f6', padding: '2px 8px', borderRadius: 999 }}>{orders.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto' }}>
        {orders.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9ca3af', padding: 20, border: '1px dashed #e5e7eb', borderRadius: 8 }}>
            No {label.toLowerCase()}
          </div>
        ) : (
          orders.map((o) => {
            const items = toDisplayItems(o);
            return (
              <Card key={o.id} padding={12} style={{ cursor: 'pointer' }} onClick={() => onSelect(o)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong>#{o.id.slice(0, 8)}</strong>
                  <span className="muted">{new Date(o.created_at).toLocaleTimeString()}</span>
                </div>

                <div style={{ marginBottom: 8, color: '#374151' }}>
                  {items.length > 0
                    ? items.slice(0, 3).map((it, i) => <div key={i}>{it.quantity || 1}× {it.name}</div>)
                    : 'No items'}
                  {items.length > 3 && <div className="muted">+{items.length - 3} more</div>}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>₹{Number(o.total_amount || o.total || 0).toFixed(2)}</span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {status === 'new' && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); onStatusChange(o.id, 'in_progress'); }}>
                        Start
                      </Button>
                    )}
                    {status === 'in_progress' && (
                      <Button size="sm" variant="success" onClick={(e) => { e.stopPropagation(); onStatusChange(o.id, 'ready'); }}>
                        Ready
                      </Button>
                    )}
                    {status === 'ready' && (
                      <Button size="sm" onClick={(e) => { e.stopPropagation(); onStatusChange(o.id, 'completed'); }}>
                        Done
                      </Button>
                    )}
                    {status !== 'completed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAskCancel(o.id); // open confirm popup
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </Card>
  );
}

function OrderDetailModal({ order, onClose, onChangeStatus }) {
  const items = toDisplayItems(order);

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal__card" style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}>Order #{order.id.slice(0, 8)}</h2>
          <Button variant="outline" onClick={onClose}>×</Button>
        </div>

        <Card padding={16}>
          <div className="muted">Time</div>
          <div>{new Date(order.created_at).toLocaleString()}</div>
          <div className="muted" style={{ marginTop: 8 }}>Table</div>
          <div>{order.table_number}</div>
        </Card>

        <Card padding={16} style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Items</h3>
          {items.length === 0 ? (
            <div className="muted">No items</div>
          ) : (
            items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>{it.quantity || 1}× {it.name}</div>
                <div>₹{((it.quantity || 1) * (it.price || 0)).toFixed(2)}</div>
              </div>
            ))
          )}
        </Card>

        <Card padding={16} style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Subtotal</span>
            <span>₹{Number(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="muted">Tax</span>
            <span>₹{Number(order.tax_amount || order.tax || 0).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: 8 }}>
            <span>Total</span>
            <span>₹{Number(order.total_amount || order.total || 0).toFixed(2)}</span>
          </div>
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          {order.status === 'new' && <Button onClick={() => { onChangeStatus(order.id, 'in_progress'); onClose(); }}>Start Cooking</Button>}
          {order.status === 'in_progress' && <Button variant="success" onClick={() => { onChangeStatus(order.id, 'ready'); onClose(); }}>Mark Ready</Button>}
          {order.status === 'ready' && <Button onClick={() => { onChangeStatus(order.id, 'completed'); onClose(); }}>Complete</Button>}
        </div>
      </div>
    </div>
  );
}

/* A tiny reusable confirm dialog used for destructive actions.
   Styles assume your global .modal/.modal__card exist; tweak as needed. */
function ConfirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) {
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal__card" style={{ maxWidth: 420 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ margin: '8px 0 16px', color: '#374151' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
          <Button variant="danger" onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}
