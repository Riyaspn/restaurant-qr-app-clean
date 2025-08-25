// components/InventoryPanel.js
import React, { useEffect, useState } from 'react';
import Button from './ui/Button';
import Card from './ui/Card';
import { supabase } from '../services/supabase';

export default function InventoryPanel({ restaurantId }) {
  const [items, setItems] = useState([]); // default to []
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!restaurantId) return;
    setLoading(true);
    setError('');
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name', { ascending: true });

    if (error) {
      setError(error.message || 'Failed to load menu items');
      setItems([]); // keep array
    } else {
      setItems(Array.isArray(data) ? data : []); // ensure array
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const toggleAvailability = async (item) => {
    const next = !item.is_available;
    // optimistic update
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: next } : i)));
    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: next })
      .eq('id', item.id);
    if (error) {
      // rollback
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !next } : i)));
      setError(error.message || 'Update failed');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>Inventory</h2>
        <Button onClick={load} variant="outline">Reload</Button>
      </div>

      {error && (
        <Card padding="12px" elevated={false} style={{ borderColor: 'rgba(239,68,68,.35)' }}>
          <div style={{ color: '#ef4444', fontSize: 14 }}>Error: {error}</div>
        </Card>
      )}

      {loading ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} padding="16px" elevated sheen={false} style={{ opacity: 0.5, minHeight: 56 }} />
          ))}
        </div>
      ) : (
        <div style={{ maxHeight: '60vh', overflowY: 'auto', display: 'grid', gap: 12, paddingRight: 6 }}>
          {(items || []).length === 0 ? (
            <Card padding="16px">
              <div style={{ color: '#6b7280', fontSize: 14 }}>No menu items found.</div>
            </Card>
          ) : (
            (items || []).map((item) => (
              <Card
                key={item.id}
                padding="12px"
                elevated={false}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'grid' }}>
                  <strong style={{ margin: 0 }}>{item.name}</strong>
                  <span style={{ color: '#6b7280', fontSize: 13 }}>₹{Number(item.price || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button
                    variant={item.is_available ? 'success' : 'outline'}
                    onClick={() => toggleAvailability(item)}
                  >
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
