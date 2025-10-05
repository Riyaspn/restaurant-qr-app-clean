import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Alert from '../../components/Alert';
import ItemEditor from '../../components/ItemEditor';
import LibraryPicker from '../../components/LibraryPicker';
import Button from '../../components/ui/Button';
import { getSupabase } from '../../services/supabase';

export default function MenuPage() {
  // --- FIXES APPLIED HERE ---
  // 1. Get the single supabase client instance
  const supabase = getSupabase();
  
  // 2. Add useRequireAuth back to protect the page. 'checking' is now defined.
  const { checking } = useRequireAuth(supabase); 
  // --- END OF FIXES ---

  const { restaurant, loading: loadingRestaurant } = useRestaurant();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterText, setFilterText] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [vegOnly, setVegOnly] = useState(false);
  const [pkgOnly, setPkgOnly] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [editorItem, setEditorItem] = useState(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const restaurantId = restaurant?.id || '';

  useEffect(() => {
    // The dependency array now correctly uses the 'checking' variable
    if (checking || loadingRestaurant || !restaurantId || !supabase) return;
    
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: cats, error: catsErr } = await supabase
          .from('categories')
          .select('id,name')
          .or(`is_global.eq.true,restaurant_id.eq.${restaurantId}`)
          .order('name');
        if (catsErr) throw catsErr;

        const { data: its, error: itsErr } = await supabase
          .from('menu_items')
          // --- FIX: Added 'code_number' back to the select query ---
          .select('id, name, category, price, code_number, hsn, tax_rate, status, veg, is_packaged_good, compensation_cess_rate')
          .eq('restaurant_id', restaurantId)
          .order('category', { ascending: true })
          .order('name', { ascending: true });
        if (itsErr) throw itsErr;

        setCategories(cats || []);
        setItems(its || []);
      } catch (e) {
        setError(e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [checking, loadingRestaurant, restaurantId, supabase]);

  const visible = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return items.filter(i => {
      if (vegOnly && !i.veg) return false;
      if (pkgOnly && !i.is_packaged_good) return false;
      if (filterCategory !== 'all' && i.category !== filterCategory) return false;
      if (!q) return true;
      // --- FIX: Added 'code_number' back to the search logic ---
      return i.name.toLowerCase().includes(q) 
        || (i.category || '').toLowerCase().includes(q)
        || (i.code_number || '').toLowerCase().includes(q);
    });
  }, [items, filterText, filterCategory, vegOnly, pkgOnly]);

  const toggleSelect = useCallback(id => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const allSelected = useMemo(() => {
    return visible.length > 0 && selected.size === visible.length;
  }, [visible, selected]);

  const toggleSelectAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(visible.map(i => i.id)));
  }, [allSelected, visible]);

  const applyBulk = useCallback(async (status) => {
    if (!supabase) return;
    const ids = Array.from(selected);
    if (ids.length === 0) return;
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
  }, [selected, supabase, restaurantId]);

  const toggleStatus = useCallback(async (id, current) => {
    if (!supabase) return;
    const next = current === 'available' ? 'out_of_stock' : 'available';
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: next } : i));
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
  }, [supabase, restaurantId]);

  const handleSaved = useCallback((updated) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === updated.id);
      if (idx === -1) return [updated, ...prev];
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...updated };
      return copy;
    });
  }, []);
  
  // 'checking' is now defined and will correctly show a loading state
  if (checking || loadingRestaurant || !restaurantId) return <p style={{ padding: 24 }}>Loading…</p>;

  return (
    <div className="menu-page">
      <h1 className="h1">Menu Management</h1>
      {error && <Alert type="error">{error}</Alert>}

      <div className="toolbar">
        <input
          className="input search-input"
          placeholder="Search by name, code, or category..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{ fontSize: 16 }}
        />
        <select
          className="select category-select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          style={{ fontSize: 16 }}
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>

        <div className="checkbox-row">
          <label className="flag">
            <input type="checkbox" checked={vegOnly} onChange={e => setVegOnly(e.target.checked)} />
            <span>Veg only</span>
          </label>
          <label className="flag">
            <input type="checkbox" checked={pkgOnly} onChange={e => setPkgOnly(e.target.checked)} />
            <span>Packaged goods</span>
          </label>
        </div>

        <div className="toolbar-cta">
          <Button onClick={() => setEditorItem({})}>Add New Item</Button>
          <Button onClick={() => setShowLibrary(true)}>Add from Library</Button>
          <Button variant="success" onClick={() => applyBulk('available')}>Mark Available</Button>
          <Button variant="outline" onClick={() => applyBulk('out_of_stock')}>Mark Out of Stock</Button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>Name</th>
                {/* --- FIX: Added 'Code' column back to the table --- */}
                <th className="hide-sm">Code</th>
                <th className="hide-sm">Category</th>
                <th>Price</th>
                <th className="hide-sm">HSN</th>
                <th className="hide-xs">Tax %</th>
                <th className="hide-sm">Cess %</th>
                <th className="hide-xs">Type</th>
                <th className="hide-xs">Status</th>
                <th className="hide-sm" style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ padding: 12 }}>Loading…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: 12, color: '#666' }}>No items found.</td></tr>
              ) : visible.map(item => {
                const available = item.status === 'available';
                const typeBadge = item.is_packaged_good ? 'Packaged' : 'Menu';
                return (
                  <tr key={item.id}>
                    <td><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{item.name}</span>
                        <span className="only-sm mobile-actions">
                          <Button size="sm" variant="outline" onClick={() => setEditorItem(item)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(item.id, item.status)}>
                            {available ? 'Out' : 'Avail'}
                          </Button>
                          <Button size="sm" variant="outline" onClick={async () => {
                            if (!confirm('Delete?')) return;
                            try {
                              if (!supabase) throw new Error("Client not ready");
                              const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
                              if (error) throw error;
                              setItems(prev => prev.filter(i => i.id !== item.id));
                            } catch (e) {
                              setError(e.message);
                            }
                          }}>Del</Button>
                        </span>
                      </div>
                    </td>
                    {/* --- FIX: Added cell for 'code_number' --- */}
                    <td className="hide-sm" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                      {item.code_number || '—'}
                    </td>
                    <td className="hide-sm">{item.category || '—'}</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(item.price ?? 0).toFixed(2)}</td>
                    <td className="hide-sm">{item.hsn || '—'}</td>
                    <td className="hide-xs">{item.tax_rate != null ? Number(item.tax_rate).toFixed(2) : '—'}</td>
                    <td className="hide-sm">{item.is_packaged_good ? Number(item.compensation_cess_rate ?? 0).toFixed(2) : '—'}</td>
                    <td className="hide-xs">
                      <span className={`pill ${item.is_packaged_good ? 'pill--pkg' : 'pill--menu'}`}>{typeBadge}</span>
                    </td>
                    <td className="hide-xs">
                      <span className={`chip ${available ? 'chip--avail' : 'chip--out'}`}>{available ? 'Available' : 'Out of Stock'}</span>
                    </td>
                    <td className="hide-sm" style={{ textAlign: 'right' }}>
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(item.id, item.status)}>
                          {available ? 'Out' : 'Avail'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditorItem(item)}>Edit</Button>
                        <Button size="sm" variant="outline" onClick={async () => {
                          if (!confirm('Delete?')) return;
                          try {
                            if (!supabase) throw new Error("Client not ready");
                            const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
                            if (error) throw error;
                            setItems(prev => prev.filter(i => i.id !== item.id));
                          } catch (e) {
                            setError(e.message);
                          }
                        }}>Del</Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ItemEditor
        open={!!editorItem}
        onClose={() => setEditorItem(null)}
        item={editorItem?.id ? editorItem : null}
        restaurantId={restaurantId}
        supabase={supabase}
        onSaved={handleSaved}
      />
      <LibraryPicker
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        supabase={supabase}
        restaurantId={restaurantId}
        onAdded={(rows) => {
          if (rows?.length) setItems(prev => [...rows, ...prev]);
        }}
      />
    </div>
  );
}
