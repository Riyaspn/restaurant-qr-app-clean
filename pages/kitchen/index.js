// pages/kitchen/index.js
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

// Kitchen order card component
function KitchenOrderCard({ order, onStart }) {
  const items = Array.isArray(order.order_items)
    ? order.order_items.map((oi) => ({
        name: oi.menu_items?.name || oi.item_name,
        qty: oi.quantity,
      }))
    : [];

  // Debugging logs for order and items:
  console.log('KitchenOrderCard rendering order:', order);
  console.log('Items derived:', items);

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
              {it.qty}× {it.name}
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

  // In pages/kitchen/index.js - Update the initial fetch
useEffect(() => {
  if (!restaurantId) return;
  supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))') // This is the key - same as orders.js
    .eq('restaurant_id', restaurantId)
    .eq('status', 'new')
    .order('created_at', { ascending: true })
    .then(({ data, error }) => {
      if (error) {
        console.error('Initial fetch error:', error);
      } else {
        setNewOrders(data || []);
        console.log('Initial orders fetched:', data);
      }
    });
}, [restaurantId]);

  // Real-time subscription for new orders and updates
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel(`orders:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // listen for INSERT and UPDATE
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          console.log('Realtime payload received:', payload);
          const order = payload.new;
          if (!order) return;

          console.log('Order from realtime event:', order);
          console.log('Order items in realtime:', order.order_items);

          setNewOrders((prev) => {
            // Remove the order if it existed in the newOrders list
            const updated = prev.filter((o) => o.id !== order.id);

            // Using payload.event property for event type
            const eventType = payload.event || '';

            // If it's a newly inserted "new" order, prepend it
            if (eventType === 'INSERT' && order.status === 'new') {
              audioRef.current?.play().catch(() => {});
              return [order, ...updated];
            }

            // If it's an updated order and its status changed away from "new", keep it removed
            if (eventType === 'UPDATE' && order.status !== 'new') {
              return updated;
            }

            // Otherwise (e.g., UPDATE back to "new"), show it again
            if (eventType === 'UPDATE' && order.status === 'new') {
              audioRef.current?.play().catch(() => {});
              return [order, ...updated];
            }

            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  // Handler to move order to "in_progress"
  const handleStart = async (orderId) => {
    // Update status in database
    try {
      await supabase
        .from('orders')
        .update({ status: 'in_progress' })
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId);

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
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Kitchen Dashboard</h1>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
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
