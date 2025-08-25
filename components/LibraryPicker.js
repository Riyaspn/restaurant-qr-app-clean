// components/LibraryPicker.js
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase';
import Button from './ui/Button';

export default function LibraryPicker({ open, onClose, restaurantId, onAdded }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [cat, setCat] = useState('all');
  const [selected, setSelected] = useState({}); // id -> price

  // Reset selection when opening
  useEffect(() => {
    if (!open) return;
    setSelected({});
    setQ('');
    setVegOnly(false);
    setCat('all');
  }, [open]);

  // Load categories (global only) and library items
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Only global categories (is_global column assumed on categories)
        const { data: categories, error: catErr } = await supabase
          .from('categories')
          .select('id,name')
          .eq('is_global', true)
          .order('name');
        if (catErr) throw catErr;

        // Library items from global table
        const { data: items, error: libErr } = await supabase
          .from('menu_library_items')
          .select('id,name,default_price,veg,description,image_url,category_id');
        if (libErr) throw libErr;

        setCats(categories || []);
        setList(items || []);
      } catch (e) {
        setError(e.message || 'Failed to load library');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  // Apply search, veg, and category filters
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (list || []).filter(it => {
      if (vegOnly && !it.veg) return false;
      if (cat !== 'all' && it.category_id !== cat) return false;
      if (!needle) return true;
      return (it.name || '').toLowerCase().includes(needle);
    });
  }, [list, vegOnly, cat, q]);

  const toggle = (it) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[it.id] !== undefined) delete next[it.id];
      else next[it.id] = Number(it.default_price ?? 0);
      return next;
    });
  };

  const setPrice = (id, price) => {
    const num = Number(price);
    setSelected(prev => ({ ...prev, [id]: Number.isFinite(num) ? num : 0 }));
  };

  const addSelected = async () => {
    const ids = Object.keys(selected);
    if (!ids.length) return onClose?.();
    if (!restaurantId) {
      setError('Restaurant not selected.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const rows = ids.map(id => {
        const it = list.find(x => x.id === id);
        const price = Number(selected[id] ?? it?.default_price ?? 0);
        return {
          restaurant_id: restaurantId,
          name: it?.name || '',
          price: Number.isFinite(price) ? price : 0,
          veg: !!it?.veg,
          category: cats.find(c => c.id === it?.category_id)?.name || null,
          is_available: true,
          description: it?.description ?? null,
          image_url: it?.image_url ?? null,
          library_item_id: it?.id || null,
        };
      });

      const { data, error } = await supabase
        .from('menu_items')
        .insert(rows)
        .select('*');
      if (error) throw error;

      onAdded?.(data || []);
      onClose?.();
    } catch (e) {
      setError(e.message || 'Failed to add selected items');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="modal" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal__card">
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Add from Library</h2>

        {error && (
          <div className="card" style={{ padding: 12, borderColor: '#fecaca', background: '#fff1f2', marginBottom: 12 }}>
            <div style={{ color: '#b91c1c' }}>{error}</div>
          </div>
        )}

        <div className="row wrap" style={{ gap: 12, marginBottom: 12 }}>
          <input
            className="input"
            placeholder="Search items…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ flex: 1, minWidth: 200 }}
          />
          <label className="row">
            <input type="checkbox" checked={vegOnly} onChange={e => setVegOnly(e.target.checked)} />
            <span className="muted">Veg only</span>
          </label>
          <select className="select" value={cat} onChange={e => setCat(e.target.value)}>
            <option value="all">All categories</option>
            {cats.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 16 }}>Loading…</div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}></th>
                  <th>Name</th>
                  <th style={{ width: 100 }}>Veg</th>
                  <th style={{ width: 160 }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 12, color: '#6b7280' }}>No items match your filters.</td></tr>
                ) : filtered.map(it => {
                  const checked = selected[it.id] !== undefined;
                  const currentPrice = selected[it.id] ?? it.default_price ?? 0;
                  return (
                    <tr key={it.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(it)}
                          aria-label={`Select ${it.name}`}
                        />
                      </td>
                      <td><span className="truncate">{it.name}</span></td>
                      <td>{it.veg ? 'Veg' : 'Non-veg'}</td>
                      <td>
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          value={currentPrice}
                          onChange={e => setPrice(it.id, e.target.value)}
                          disabled={!checked}
                          style={{ width: 110 }}
                          inputMode="decimal"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={addSelected} disabled={loading}>{loading ? 'Adding…' : 'Add Selected'}</Button>
        </div>
      </div>
    </div>
  );
}
