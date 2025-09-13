// Updated KitchenOrderCard.js - Replace your current component with this

import React from 'react';
import Card from './ui/Card';
import Button from './ui/Button';

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

export default function KitchenOrderCard({ order, onStart }) {
  // Use the same helper function as the working orders.js
  const items = toDisplayItems(order);

  console.log('KitchenOrderCard received order:', order);
  console.log('Raw order.items:', order.items);
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button size="sm" variant="success" onClick={() => onStart(order.id)}>
          Start
        </Button>
      </div>
    </Card>
  );
}
