// components/OrdersBoard.js
import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import OrderCard from './OrderCard';
import { supabase } from '../services/supabase';

const STATUSES = ['new', 'in_progress', 'ready', 'completed', 'cancelled'];
const DEFAULT_BUCKETS = { new: [], in_progress: [], ready: [], completed: [], cancelled: [] };

export default function OrdersBoard({ restaurantId }) {
  const [orders, setOrders] = useState(DEFAULT_BUCKETS);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;
    let cancel = false;

    const load = async () => {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true });

      if (cancel) return;

      if (error) {
        setError(error.message || 'Failed to load orders');
        setOrders(DEFAULT_BUCKETS);
        setLoading(false);
        return;
      }

      const rows = Array.isArray(data) ? data : [];
      const grouped = { new: [], in_progress: [], ready: [], completed: [], cancelled: [] };
      rows.forEach((o) => {
        const key = STATUSES.includes(String(o.status)) ? String(o.status) : 'new';
        grouped[key].push(o);
      });

      setOrders(grouped);
      setLoading(false);
    };

    load();
    return () => { cancel = true; };
  }, [restaurantId]);

  const updateStatus = async (order, next) => {
    if (!STATUSES.includes(next)) return;
    const id = order.id;

    // optimistic move
    setOrders((prev) => {
      const copy = { new: [], in_progress: [], ready: [], completed: [], cancelled: [] };
      STATUSES.forEach((s) => { copy[s] = prev[s].filter((o) => o.id !== id); });
      const updated = { ...order, status: next };
      copy[next] = [updated, ...copy[next]];
      return copy;
    });

    const { error } = await supabase.from('orders').update({ status: next }).eq('id', id);
    if (error) {
      // reload on failure
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: true });
      const rows = Array.isArray(data) ? data : [];
      const grouped = { new: [], in_progress: [], ready: [], completed: [], cancelled: [] };
      rows.forEach((o) => {
        const key = STATUSES.includes(String(o.status)) ? String(o.status) : 'new';
        grouped[key].push(o);
      });
      setOrders(grouped);
    }
  };

  return (
    <div className="grid" style={{ gap: 24 }}>
      <h1 className="page-title">Orders Dashboard</h1>

      {error && (
        <Card padding="12px" elevated={false} style={{ borderColor: 'rgba(239,68,68,.35)' }}>
          <div style={{ color: '#ef4444' }}>Error: {error}</div>
        </Card>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} padding="20px" elevated sheen={false} style={{ opacity: 0.4, minHeight: 120 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {['new', 'in_progress', 'ready', 'completed'].map((col) => (
            <Card key={col} padding="14px" style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ letterSpacing: .2, fontSize: 16, textTransform: 'capitalize' }}>{col}</strong>
                <span className="subtle" style={{ fontSize: 12 }}>{orders[col].length} orders</span>
              </div>

              <div className="scroll-soft" style={{ maxHeight: 520, display: 'grid', gap: 10, paddingRight: 6 }}>
                {orders[col].map((o) => (
                  <OrderCard
                    key={o.id}
                    order={o}
                    onStart={() => updateStatus(o, 'in_progress')}
                    onReady={() => updateStatus(o, 'ready')}
                    onDone={() => updateStatus(o, 'completed')}
                    onCancel={() => updateStatus(o, 'cancelled')}
                  />
                ))}
                {orders[col].length === 0 && (
                  <div className="subtle" style={{ fontSize: 13, padding: 8 }}>No orders</div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
