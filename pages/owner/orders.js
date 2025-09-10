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
import OrderDetailModal from '../../components/OrderDetailsModal';
import ConfirmDialog from '../../components/ConfirmDialog';

// Constants
const STATUSES = ['new', 'in_progress', 'ready', 'completed'];
const LABELS   = { new: 'New', in_progress: 'Cooking', ready: 'Ready', completed: 'Done' };
const COLORS   = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' };
const VAPID_KEY = 'BOsAl1-5erAp7aw-yA2IqcYSXGxOyWmCTAfegUo_Lekrxll5ukCAz78NgkYeGxBmbjRN_ecq4yQNuySziWPMFnQ';
const PAGE     = 20;
const SHOW_DONE_COUNT = true;
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://restaurant-qr-app-clean.vercel.app';

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
  const userEmail = user?.email;

  const [ordersByStatus, setOrdersByStatus] = useState({
    new: [], in_progress: [], ready: [], completed: []
  });
  const [completedPage, setCompletedPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilter, setMobileFilter] = useState('new');
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, orderId: null });
  const [generatingInvoice, setGeneratingInvoice] = useState(null);
  const notificationAudioRef = useRef(null);

  useEffect(() => {
    const a = new Audio('/notification-sound.mp3');
    a.load();
    notificationAudioRef.current = a;
  }, []);

  const mobileList = useMemo(
    () => ordersByStatus[mobileFilter] || [],
    [ordersByStatus, mobileFilter]
  );

  // Fetch orders and attach invoice URLs
  async function fetchBucket(status, page = 1) {
    let q = supabase.from('orders')
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
        (invs || []).forEach(inv => { invMap[inv.order_id] = inv.pdf_url; });
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

  // Initial load
  useEffect(() => {
    if (restaurantId) {
      setCompletedPage(1);
      loadOrders(1);
    }
  }, [restaurantId]);

  // Real-time updates: reload full bucket on INSERT
  useEffect(() => {
    if (!restaurantId) return;
    const channel = supabase
      .channel(`orders-${restaurantId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'orders',
        filter: `restaurant_id=eq.${restaurantId}`
      }, () => {
        // play sound, show notification
        if (Notification.permission === 'granted') {
          new Notification('🔔 New Order!');
        }
        notificationAudioRef.current?.play().catch(() => {});
        // reload only the 'new' bucket to include items
        fetchBucket('new').then(newOrders => {
          setOrdersByStatus(prev => ({
            ...prev,
            new: newOrders.map(o => ({
              ...o,
              invoice: prev.new.find(p => p.id === o.id)?.invoice || null
            }))
          }));
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [restaurantId]);

  const updateStatus = async (id, next) => {
    try {
      await supabase.from('orders').update({ status: next })
        .eq('id', id).eq('restaurant_id', restaurantId);
      loadOrders();
    } catch (e) {
      setError(e.message);
    }
  };

  const finalizeComplete = async id => {
    setGeneratingInvoice(id);
    try {
      await supabase.from('orders').update({ status: 'completed' })
        .eq('id', id).eq('restaurant_id', restaurantId);

      const resp = await fetch('/api/invoices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: id })
      });
      if (!resp.ok) throw new Error('Invoice gen failed');
      const { pdf_url } = await resp.json();

      if (pdf_url) {
        if (Capacitor.isNativePlatform()) {
          const { Browser } = await import('@capacitor/browser');
          await Browser.open({ url: pdf_url });
        } else {
          window.open(pdf_url, '_blank', 'noopener,noreferrer');
        }
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
              ) : ordersByStatus[status].map(o => (
                <OrderCard
                  key={o.id}
                  order={o}
                  statusColor={COLORS[status]}
                  onStatusChange={updateStatus}
                  onComplete={finalizeComplete}
                  generatingInvoice={generatingInvoice}
                />
              ))}
              {status === 'completed' && ordersByStatus.completed.length >= PAGE && (
                <>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    Showing latest {ordersByStatus.completed.length} completed orders
                  </div>
                  <div style={{ paddingTop: 8 }}>
                    <Button variant="outline" onClick={() => { setCompletedPage(completedPage + 1); loadOrders(completedPage + 1); }}>
                      Load more
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>
      <OrderDetailModal
        order={detail}
        onClose={() => setDetail(null)}
        onCompleteOrder={finalizeComplete}
        generatingInvoice={generatingInvoice}
      />
      <ConfirmDialog
        open={confirm.open}
        title="Confirm Payment Received"
        message="Has the customer paid at the counter?"
        confirmText="Yes"
        cancelText="No"
        onConfirm={() => finalizeComplete(confirm.orderId)}
        onCancel={() => setConfirm({ open: false, orderId: null })}
      />
      <style jsx>{`
        .orders-wrap { padding: 12px 0 32px; }
        .orders-header { display: flex; justify-content: space-between; align-items: center; padding: 0 12px 12px; }
        .orders-header h1 { margin: 0; font-size: clamp(20px, 2.6vw, 28px); }
        .header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .muted { color: #6b7280; font-size: 14px; }
        .kanban { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 16px; padding: 12px 16px; }
        .kanban-col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .pill { background: #f3f4f6; padding: 4px 10px; border-radius: 999px; font-size: 12px; }
        .kanban-col-body { display: flex; flex-direction: column; gap: 10px; max-height: 70vh; overflow: auto; }
        .empty-col { text-align: center; color: #9ca3af; padding: 20px; border: 1px dashed #e5e7eb; border-radius: 8px; }
        @media (max-width: 1024px) { .kanban { display: none; } }
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
    <Card padding={12} style={{ border: '1px solid #eef2f7', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <strong>#{order.id.slice(0, 8)}</strong>
        <span style={{ color: '#6b7280', fontSize: 12 }}>
          {new Date(order.created_at).toLocaleTimeString()}
        </span>
      </div>
      <div style={{ margin: '8px 0', fontSize: 14 }}>
        {items.map((it, i) => (
          <div key={i}>{it.quantity}× {it.name}</div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{money(total)}</span>
        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          {order.status === 'new' && (
            <Button size="sm" onClick={() => onStatusChange(order.id, 'in_progress')}>Start</Button>
          )}
          {order.status === 'in_progress' && (
            <Button size="sm" variant="success" onClick={() => onStatusChange(order.id, 'ready')}>Ready</Button>
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
