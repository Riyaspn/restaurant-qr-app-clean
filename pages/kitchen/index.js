// pages/kitchen/index.js

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '../../lib/firebaseClient';

// Helper to handle both JSONB items and relational order_items
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
        <Button size="sm" variant="success" onClick={() => onStart(order.id)}>
          Start
        </Button>
      </div>
    </Card>
  );
}

// Push notifications enable button with better error handling
function EnableAlertsButton({ restaurantId, userEmail }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkPermission = async () => {
      // Check if Notification API is supported
      if (typeof Notification === 'undefined') {
        console.warn('Notification API not supported in this browser');
        return;
      }
      
      if (Notification.permission === 'granted') {
        try {
          const messaging = await getMessagingIfSupported();
          if (messaging) {
            const token = await getToken(messaging, {
              vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });
            if (token) setEnabled(true);
          }
        } catch (error) {
          console.error('Error checking notification permission:', error);
        }
      }
    };
    checkPermission();
  }, []);

  const enablePush = async () => {
    setLoading(true);
    try {
      // Check if Notification API is supported
      if (typeof Notification === 'undefined') {
        alert('Notifications are not supported in this browser.');
        return;
      }

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        alert('Please allow notifications.');
        return;
      }
      
      await navigator.serviceWorker.ready;
      const messaging = await getMessagingIfSupported();
      if (!messaging) throw new Error('Messaging not supported');
      
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: await navigator.serviceWorker.getRegistration(),
      });
      
      if (!token) throw new Error('Failed to get token');
      
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceToken: token, restaurantId, userEmail }),
      });
      
      if (!res.ok) throw new Error('Subscribe failed');
      setEnabled(true);
      alert('Alerts enabled!');
    } catch (e) {
      console.error('Error enabling push notifications:', e);
      alert(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={enablePush} disabled={loading || enabled} variant={enabled ? 'success' : 'primary'}>
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
  const channelRef = useRef(null);

  // Preload notification sound
  useEffect(() => {
    const a = new Audio('/notification-sound.mp3');
    a.load();
    audioRef.current = a;
  }, []);

  // Initial fetch of new orders
  useEffect(() => {
    if (!restaurantId) return;
    (async () => {
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
      } catch (e) {
        console.error('Fetch error:', e);
      }
    })();
  }, [restaurantId]);

  // Real-time subscription with proper cleanup
  useEffect(() => {
    if (!restaurantId) return;

    // Clean up existing channel
    if (channelRef.current) {
      console.log('Cleaning up existing channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Create new channel with unique name
    const channelName = `kitchen-orders-${restaurantId}-${Date.now()}`;
    console.log('Creating channel:', channelName);
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          console.log('🔥 Kitchen realtime payload received:', payload);
          
          try {
            const ord = payload.new;
            if (!ord) {
              console.log('No new order data in payload');
              return;
            }

            // Fetch complete order with relations
            const { data: orderData, error } = await supabase
              .from('orders')
              .select('*, order_items(*, menu_items(name))')
              .eq('id', ord.id)
              .single();

            if (error) {
              console.error('Error fetching order details:', error);
              return;
            }

            if (!orderData) {
              console.log('No order data returned');
              return;
            }

            console.log('📦 Complete order data:', orderData);

            setNewOrders((prev) => {
              const filtered = prev.filter((o) => o.id !== orderData.id);
              
              if (payload.eventType === 'INSERT' && orderData.status === 'new') {
                console.log('🆕 Adding new order to kitchen dashboard');
                
                // Play notification sound
                if (audioRef.current) {
                  audioRef.current.play().catch((err) => console.error('Audio play failed:', err));
                }
                
                // Show browser notification if supported
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                  new Notification('🔔 New Kitchen Order!', {
                    body: `Table ${orderData.table_number || 'N/A'} • #${orderData.id.slice(0, 8)}`,
                    icon: '/favicon.ico',
                    tag: `order-${orderData.id}`,
                  });
                }
                
                return [orderData, ...filtered];
              }
              
              if (payload.eventType === 'UPDATE') {
                console.log(`📝 Order ${orderData.id} updated, status: ${orderData.status}`);
                return orderData.status === 'new' ? [orderData, ...filtered] : filtered;
              }
              
              if (payload.eventType === 'DELETE') {
                console.log(`🗑️ Order ${ord.id} deleted`);
                return filtered;
              }
              
              return prev;
            });
          } catch (error) {
            console.error('Error processing realtime event:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to kitchen orders');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel subscription error');
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Channel subscription timed out');
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up kitchen dashboard subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [restaurantId]);

  // Handler to move order to "in_progress"
  const handleStart = async (orderId) => {
    try {
      console.log(`🚀 Starting order: ${orderId}`);
      const { error } = await supabase
        .from('orders')
        .update({ status: 'in_progress' })
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId);
        
      if (error) throw error;
      
      // Optimistically remove from local state
      setNewOrders((prev) => prev.filter((o) => o.id !== orderId));
      console.log(`✅ Order ${orderId} moved to in_progress`);
    } catch (e) {
      console.error('Error starting order:', e);
      alert('Failed to start order. Please try again.');
    }
  };

  if (checking || restLoading) return <div>Loading…</div>;
  if (!restaurantId) return <div>No restaurant found.</div>;

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Kitchen Dashboard</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <EnableAlertsButton restaurantId={restaurantId} userEmail={user?.email} />
          <Button onClick={() => window.location.reload()}>Refresh</Button>
        </div>
      </header>

      {newOrders.length === 0 ? (
        <Card padding={24} style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>No new orders</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            Connected to: {restaurantId?.slice(0, 8)}...
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {newOrders.map((order) => (
            <KitchenOrderCard key={order.id} order={order} onStart={handleStart} />
          ))}
        </div>
      )}
    </div>
  );
}
