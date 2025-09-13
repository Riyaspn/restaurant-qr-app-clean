// pages/kitchen/index.js - Complete updated version
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '../../lib/firebaseClient';

// Helper function from orders.js to handle both order.items and order.order_items
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

// Kitchen order card component
function KitchenOrderCard({ order, onStart }) {
  const items = toDisplayItems(order);

  console.log('KitchenOrderCard rendering order:', order);
  console.log('Items derived using toDisplayItems:', items);

  return (
    <Card padding={16} style={{ border: '1px solid #ddd', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>#{order.id.slice(0, 8)}</strong>
        <span style={{ fontSize: 12, color: '#666' }}>
          {new Date(order.created_at).toLocaleTimeString()}
        </span>
      </div>
      <div style={{ marginBottom: 12 }}>
        {items.length === 0 ? (
          <div style={{ fontSize: 14, fontStyle: 'italic', color: '#999' }}>No items found</div>
        ) : (
          items.map((it, i) => (
            <div key={i} style={{ fontSize: 14 }}>
              {it.quantity || 1}× {it.name}
            </div>
          ))
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="sm"
          variant="success"
          onClick={() => onStart(order.id)}
        >
          Start
        </Button>
      </div>
    </Card>
  );
}

// Push notifications component
function EnableAlertsButton({ restaurantId, userEmail }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkExistingPermission = async () => {
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const messaging = await getMessagingIfSupported();
          if (messaging) {
            const token = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });
            if (token) setEnabled(true);
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
      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Please allow notifications to receive order alerts.');
        return;
      }

      await navigator.serviceWorker.ready;
      const messaging = await getMessagingIfSupported();
      if (!messaging) throw new Error('Messaging not supported');

      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
      });

      if (!token) throw new Error('Failed to get push token');

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceToken: token,
          restaurantId,
          userEmail,
          platform: /Android/.test(navigator.userAgent) ? 'android' : 'web',
        }),
      });

      if (!res.ok) throw new Error('Subscribe failed');

      setEnabled(true);
      alert('Kitchen alerts enabled successfully!');
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
      disabled={loading || enabled}
      variant={enabled ? 'success' : 'primary'}
    >
      {loading ? 'Enabling...' : enabled ? 'Alerts Active' : 'Enable Alerts'}
    </Button>
  );
}

export default function KitchenPage() {
  const { checking, user } = useRequireAuth();
  const { restaurant, loading: restLoading } = useRestaurant();
  const restaurantId = restaurant?.id;
  const [newOrders, setNewOrders] = useState([]);
  const audioRef = useRef(null);

  // Preload notification sound
  useEffect(() => {
    const a = new Audio('/notification-sound.mp3');
    a.load();
    audioRef.current = a;
  }, []);

  // Initial fetch of "new" orders with nested data
  useEffect(() => {
    if (!restaurantId) return;
    
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, order_items(*, menu_items(name))')
          .eq('restaurant_id', restaurantId)
          .eq('status', 'new')
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        console.log('Initial orders fetched:', data);
        setNewOrders(data || []);
      } catch (error) {
        console.error('Initial fetch error:', error);
      }
    };

    fetchOrders();
  }, [restaurantId]);

  // Enhanced real-time subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`kitchen_orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          console.log('Realtime payload received:', payload);
          const order = payload.new;
          
          if (!order) return;

          // Fetch complete order with nested data for realtime events
          let completeOrder = order;
          try {
            const { data: fullOrder } = await supabase
              .from('orders')
              .select('*, order_items(*, menu_items(name))')
              .eq('id', order.id)
              .single();
            
            if (fullOrder) {
              completeOrder = fullOrder;
              console.log('Complete order fetched:', completeOrder);
            }
          } catch (e) {
            console.warn('Failed to fetch complete order:', e);
          }

          setNewOrders((prev) => {
            const updated = prev.filter((o) => o.id !== order.id);
            
            if (payload.event === 'INSERT' && order.status === 'new') {
              // Play notification sound and show notification
              audioRef.current?.play().catch(() => {});
              
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('🔔 New Kitchen Order!', {
                  body: `Table ${order.table_number || ''} - Order #${order.id.slice(0, 8)}`,
                  icon: '/favicon.ico',
                  tag: 'new-kitchen-order',
                });
              }
              
              return [completeOrder, ...updated];
            }
            
            if (payload.event === 'UPDATE' && order.status !== 'new') {
              return updated; // Remove from kitchen dashboard
            }
            
            if (payload.event === 'UPDATE' && order.status === 'new') {
              return [completeOrder, ...updated];
            }
            
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log('Kitchen realtime status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  // Handler to move order to "in_progress"
  const handleStart = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'in_progress' })
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId);

      if (error) throw error;

      // Remove from local state
      setNewOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  if (checking || restLoading) {
    return <div style={{ padding: 16 }}>Loading…</div>;
  }

  if (!restaurantId) {
    return <div style={{ padding: 16 }}>No restaurant found.</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1>Kitchen Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <EnableAlertsButton restaurantId={restaurantId} userEmail={user?.email} />
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </header>

      {newOrders.length === 0 ? (
        <Card padding={24} style={{ marginTop: 16, textAlign: 'center' }}>
          No new orders
        </Card>
      ) : (
        <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
          {newOrders.map((order) => (
            <KitchenOrderCard key={order.id} order={order} onStart={handleStart} />
          ))}
        </div>
      )}
    </div>
  );
}
