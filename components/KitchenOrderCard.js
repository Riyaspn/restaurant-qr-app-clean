// Updated KitchenOrderCard.js component to use order.items JSON

import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

export default function KitchenOrderCard({ order, onStart }) {
  // Map over order.items JSON array, fallback keys for name and quantity
  const items = Array.isArray(order.items)
  ? order.items.map((oi) => ({
      name: oi.name || oi.item_name || 'Unknown Item',
      qty: oi.quantity ?? oi.qty ?? 1,
    }))
  : [];

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
  await fetch('/api/kitchen/update-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, status: 'in_progress' }),
  });
}
