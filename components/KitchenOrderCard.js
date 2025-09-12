// Updated KitchenOrderCard.js with detailed logs for debugging

import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

export default function KitchenOrderCard({ order, onStart }) {
  // Log the received order object completely
  console.log('KitchenOrderCard received order:', order);

  // Log raw items array before mapping
  console.log('Raw order.items:', order.items);

  // Map over order.items JSON array, fallback keys for name and quantity
  const items = Array.isArray(order.items)
    ? order.items.map((oi) => {
        const itemName = oi.name || oi.item_name || 'Unknown Item';
        const itemQty = oi.quantity ?? oi.qty ?? 1;
        return { name: itemName, qty: itemQty };
      })
    : [];

  // Log items derived after mapping
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button size="sm" variant="success" onClick={() => onStart(order.id)}>
          Start
        </Button>
      </div>
    </Card>
  );
}

async function handleMarkInProgress(orderId) {
  try {
    const response = await fetch('/api/kitchen/update-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, status: 'in_progress' }),
    });
    if (!response.ok) {
      console.error('Failed to mark order in progress:', await response.text());
    } else {
      console.log(`Order ${orderId} marked as in_progress`);
    }
  } catch (error) {
    console.error('Error during status update:', error);
  }
}
