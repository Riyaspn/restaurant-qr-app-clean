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

  // New: packaged goods defaults (optional helpers)
  const [markPackaged, setMarkPackaged] = useState(false);
  const [defaultTax, setDefaultTax] = useState(0);            // e.g., 28 for aerated drinks
  const [defaultCess, setDefaultCess] = useState(0);          // e.g., 12 for aerated drinks compensation cess

  // Reset selection when opening
  useEffect(() => {
    if (!open) return;
    setSelected({});
    setQ('');
    setVegOnly(false);
    setCat('all');
    setMarkPackaged(false);
    setDefaultTax(0);
    setDefaultCess(0);
  }, [open]); // 

  // Load categories (global only) and library items
  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Global categories
        const { data: categories, error: catErr } = await supabase
          .from('categories')
          .select('id,name')
          .eq('is_global', true)
          .order('name');
        if (catErr) throw catErr;

        // Library items
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
  }, [open]); // 

  // Apply search, veg, and category filters
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (list || []).filter(it => {
      if (vegOnly && !it.veg) return false;
      if (cat !== 'all' && it.category_id !== cat) return false;
      if (!needle) return true;
      return (it.name || '').toLowerCase().includes(needle);
    });
  }, [list, vegOnly, cat, q]); // 

  const toggle = (it) => {
    setSelected(prev => {
      const next = { ...prev };
      if (next[it.id] !== undefined) delete next[it.id];
      else next[it.id] = Number(it.default_price ?? 0);
      return next;
    });
  }; // 

  const setPrice = (id, price) => {
    const num = Number(price);
    setSelected(prev => ({ ...prev, [id]: Number.isFinite(num) ? num : 0 }));
  }; // 

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
      // Build rows with optional packaged/tax defaults
      const rows = ids.map(id => {
        const it = list.find(x => x.id === id);
        const price = Number(selected[id] ?? it?.default_price ?? 0);

        // Derive category name for this item (optional)
        const catName = cats.find(c => c.id === it?.category_id)?.name || null;

        return {
          restaurant_id: restaurantId,
          name: it?.name || '',
          price: Number.isFinite(price) ? price : 0,
          veg: !!it?.veg,
          category: catName,
          is_available: true,
          description: it?.description ?? null,
          image_url: it?.image_url ?? null,
          library_item_id: it?.id || null,

          // New fields: optional defaults applied on import so staff can adjust later in ItemEditor
          is_packaged_good: !!markPackaged,
          tax_rate: Number(defaultTax || 0),               // e.g., 28 for HSN 2202 (aerated beverages) when relevant [1]
          compensation_cess_rate: Number(defaultCess || 0) // e.g., 12 compensation cess for aerated beverages when relevant [2]
        };
      });

      const { data, error } = await supabase
        .from('menu_items')
        .insert(rows)
        .select('id, name, price, category, veg, status, hsn, tax_rate, is_packaged_good, compensation_cess_rate, image_url, description')
      if (error) throw error;

      onAdded?.(data || []);
      onClose?.();
    } catch (e) {
      setError(e.message || 'Failed to add selected items');
    } finally {
      setLoading(false);
    }
  }; // 

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

        {/* New: packaged goods defaults row */}
        <div className="row wrap" style={{ gap: 12, marginBottom: 12 }}>
          <label className="row" style={{ alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={markPackaged} onChange={e => setMarkPackaged(e.target.checked)} />
            <span className="muted">Mark as packaged</span>
          </label>
          <label className="row" style={{ alignItems: 'center', gap: 6 }}>
            <span className="muted">Default Tax %</span>
            <input
              className="input"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={defaultTax}
              onChange={e => setDefaultTax(e.target.value)}
              style={{ width: 90 }}
              placeholder="e.g., 28"
            />
          </label>
          <label className="row" style={{ alignItems: 'center', gap: 6 }}>
            <span className="muted">Cess %</span>
            <input
              className="input"
              type="number"
              step="0.01"
              inputMode="decimal"
              value={defaultCess}
              onChange={e => setDefaultCess(e.target.value)}
              style={{ width: 90 }}
              placeholder="e.g., 12"
            />
          </label>
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

      <style jsx>{`
        .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 12px; }
        .modal__card { background: #fff; width: 100%; max-width: 720px; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.1); padding: 16px; }
        .truncate { display: inline-block; max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        @media (max-width: 640px) { .truncate { max-width: 160px; } }
      `}</style>
    </div>
  );
}
