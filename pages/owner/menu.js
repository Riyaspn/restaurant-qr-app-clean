// pages/owner/menu.js
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Alert from '../../components/Alert';
import ItemEditor from '../../components/ItemEditor';
import LibraryPicker from '../../components/LibraryPicker';
import Button from '../../components/ui/Button';

export default function MenuPage() {
  const { checking } = useRequireAuth();
  const { restaurant, loading: loadingRestaurant } = useRestaurant();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [editorItem, setEditorItem] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const restaurantId = restaurant?.id || '';

  useEffect(() => {
    if (checking || loadingRestaurant || !restaurantId) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Load global + restaurant-specific categories
        const { data: cats, error: catsErr } = await supabase
          .from('categories')
          .select('id,name')
          .or(`is_global.eq.true,restaurant_id.eq.${restaurantId}`)
          .order('name');
        if (catsErr) throw catsErr;

        // Load menu items
        const { data: its, error: itsErr } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurantId)
          .order('category', { ascending: true })
          .order('name', { ascending: true });
        if (itsErr) throw itsErr;

        setCategories(cats || []);
        setItems(its || []);
      } catch (e) {
        setError(e.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [checking, loadingRestaurant, restaurantId]);

  const visible = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return items.filter(i => {
      if (vegOnly && !i.veg) return false;
      if (filterCategory !== 'all' && i.category !== filterCategory) return false;
      if (!q) return true;
      return (i.name || '').toLowerCase().includes(q)
          || (i.category || '').toLowerCase().includes(q);
    });
  }, [items, filterText, filterCategory, vegOnly]);

  const toggleSelect = id => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = visible.length > 0 && selected.size === visible.length;
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(visible.map(i => i.id)));
  };

  const applyBulk = async status => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setItems(prev => prev.map(i => (ids.includes(i.id) ? { ...i, status } : i)));
    setSelected(new Set());
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ status })
        .in('id', ids)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } catch (e) {
      setError(e.message || 'Bulk update failed');
    }
  };

  const toggleStatus = async (id, current) => {
    const next = current === 'available' ? 'out_of_stock' : 'available';
    setItems(prev => prev.map(i => (i.id === id ? { ...i, status: next } : i)));
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ status: next })
        .eq('id', id)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    } catch (e) {
      setError(e.message || 'Update failed');
    }
  };

  if (checking || loadingRestaurant || !restaurantId)
    return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <div className="menu-page container" style={{ padding: '20px 0 40px' }}>
      <h1 className="h1">Menu Management</h1>
      {error && <Alert type="error">{error}</Alert>}

      {/* Filters & Actions */}
      <div className="row wrap" style={{ margin: '16px 0', gap: 12 }}>
        <input
          className="input"
          placeholder="Search items..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <select
          className="select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <label className="row">
          <input type="checkbox" checked={vegOnly} onChange={e => setVegOnly(e.target.checked)} />
          <span className="muted">Veg only</span>
        </label>
        <Button onClick={() => setEditorItem({})}>Add New Item</Button>
        <Button onClick={() => setShowLibrary(true)}>Add from Library</Button>
        <Button variant="success" onClick={() => applyBulk('available')}>Mark Available</Button>
        <Button variant="outline" onClick={() => applyBulk('out_of_stock')}>Mark Out of Stock</Button>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 40 }}><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} /></th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th className="hide-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 12 }}>Loading items…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 12, color: '#666' }}>No items found.</td></tr>
            ) : visible.map(item => {
              const available = item.status === 'available';
              return (
                <tr key={item.id}>
                  <td><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                  <td>{item.name}</td>
                  <td>{item.category || '—'}</td>
                  <td>₹{Number(item.price).toFixed(2)}</td>
                  <td>
                    <span className={`chip ${available ? 'chip--avail' : 'chip--out'}`}>
                      {available ? 'Available' : 'Out of Stock'}
                    </span>
                  </td>
                  <td>
                    <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(item.id, item.status)}>
                        {available ? 'Mark Out of Stock' : 'Mark Available'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditorItem(item)}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={async () => {
                        if (!confirm('Delete this item?')) return;
                        const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
                        if (error) setError(error.message);
                        else setItems(prev => prev.filter(i => i.id !== item.id));
                      }}>Delete</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ItemEditor
        open={!!editorItem}
        onClose={() => setEditorItem(null)}
        item={editorItem?.id ? editorItem : null}
        restaurantId={restaurantId}
        onSaved={updated => {
          setItems(prev => {
            const idx = prev.findIndex(i => i.id === updated.id);
            if (idx === -1) return [updated, ...prev];
            const copy = [...prev]; copy[idx] = updated; return copy;
          });
        }}
      />

      <LibraryPicker
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        restaurantId={restaurantId}
        onAdded={rows => {
          if (!rows?.length) return;
          setItems(prev => [...rows, ...prev]);
        }}
      />
    </div>
  );
}
