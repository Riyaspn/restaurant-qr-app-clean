// components/KitchenOrderCard.js
import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

export default function KitchenOrderCard({ order }) {
  const items = Array.isArray(order.order_items)
    ? order.order_items.map((oi) => ({ name: oi.menu_items?.name || oi.item_name, qty: oi.quantity }))
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
        {items.map((it, i) => (
          <div key={i} style={{ fontSize: 14 }}>
            {it.qty}× {it.name}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button size="sm" variant="success" onClick={() => handleMarkInProgress(order.id)}>
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
