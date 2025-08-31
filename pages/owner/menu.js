// pages/owner/menu.js
import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../services/supabase'
import { useRequireAuth } from '../../lib/useRequireAuth'
import { useRestaurant } from '../../context/RestaurantContext'
import Alert from '../../components/Alert'
import ItemEditor from '../../components/ItemEditor'
import LibraryPicker from '../../components/LibraryPicker'
import Button from '../../components/ui/Button'

export default function MenuPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: loadingRestaurant } = useRestaurant()

  const [items, setItems] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterText, setFilterText] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [vegOnly, setVegOnly] = useState(false)
  const [pkgOnly, setPkgOnly] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [editorItem, setEditorItem] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)

  const restaurantId = restaurant?.id || ''

  useEffect(() => {
    if (checking || loadingRestaurant || !restaurantId) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data: cats, error: catsErr } = await supabase
          .from('categories')
          .select('id,name')
          .or(`is_global.eq.true,restaurant_id.eq.${restaurantId}`)
          .order('name')
        if (catsErr) throw catsErr

        const { data: its, error: itsErr } = await supabase
          .from('menu_items')
          .select('id, name, category, price, hsn, tax_rate, status, veg, is_packaged_good, compensation_cess_rate')
          .eq('restaurant_id', restaurantId)
          .order('category', { ascending: true })
          .order('name', { ascending: true })
        if (itsErr) throw itsErr

        setCategories(cats || [])
        setItems(its || [])
      } catch (e) {
        setError(e.message || 'Failed to load menu')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [checking, loadingRestaurant, restaurantId])

  const visible = useMemo(() => {
    const q = filterText.trim().toLowerCase()
    return items.filter(i => {
      if (vegOnly && !i.veg) return false
      if (pkgOnly && !i.is_packaged_good) return false
      if (filterCategory !== 'all' && i.category !== filterCategory) return false
      if (!q) return true
      return (i.name || '').toLowerCase().includes(q) || (i.category || '').toLowerCase().includes(q)
    })
  }, [items, filterText, filterCategory, vegOnly, pkgOnly])

  const toggleSelect = id => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = visible.length > 0 && selected.size === visible.length
  const toggleSelectAll = () => setSelected(allSelected ? new Set() : new Set(visible.map(i => i.id)))

  const applyBulk = async status => {
    const ids = Array.from(selected)
    if (!ids.length) return
    setItems(prev => prev.map(i => (ids.includes(i.id) ? { ...i, status } : i)))
    setSelected(new Set())
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ status })
        .in('id', ids)
        .eq('restaurant_id', restaurantId)
      if (error) throw error
    } catch (e) {
      setError(e.message || 'Bulk update failed')
    }
  }

  const toggleStatus = async (id, current) => {
    const next = current === 'available' ? 'out_of_stock' : 'available'
    setItems(prev => prev.map(i => (i.id === id ? { ...i, status: next } : i)))
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ status: next })
        .eq('id', id)
        .eq('restaurant_id', restaurantId)
      if (error) throw error
    } catch (e) {
      setError(e.message || 'Update failed')
    }
  }

  const handleSaved = (updated) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === updated.id)
      if (idx === -1) return [updated, ...prev]
      const copy = [...prev]
      copy[idx] = { ...copy[idx], ...updated }
      return copy
    })
  }

  if (checking || loadingRestaurant || !restaurantId) return <p style={{ padding: 24 }}>Loading…</p>

  return (
    <div className="menu-page">
      <h1 className="h1">Menu Management</h1>
      {error && <Alert type="error">{error}</Alert>}

      {/* Toolbar */}
      <div className="toolbar">
        <input
          className="input search-input"
          placeholder="Search items..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
        <select
          className="select category-select"
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
        >
          <option value="all">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>

        <div className="checkbox-group">
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

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>Name</th>
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
                <tr><td colSpan={10} style={{ padding: 12 }}>Loading items…</td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 12, color: '#666' }}>No items found.</td></tr>
              ) : visible.map(item => {
                const available = item.status === 'available'
                const typeBadge = item.is_packaged_good ? 'Packaged' : 'Menu'
                return (
                  <tr key={item.id}>
                    <td><input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                    <td style={{ maxWidth: 200 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ fontWeight: 500, overflowWrap: 'anywhere' }}>{item.name}</span>
                        {/* Mobile-only inline actions */}
                        <span className="only-sm mobile-actions">
                          <Button size="sm" variant="outline" onClick={() => setEditorItem(item)}>Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(item.id, item.status)}>
                            {available ? 'Out' : 'Avail'}
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={async () => {
                              if (!confirm('Delete this item?')) return
                              const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
                              if (error) setError(error.message)
                              else setItems(prev => prev.filter(i => i.id !== item.id))
                            }}
                          >
                            Del
                          </Button>
                        </span>
                      </div>
                    </td>
                    <td className="hide-sm">{item.category || '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{Number(item.price ?? 0).toFixed(2)}</td>
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
                      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(item.id, item.status)}>
                          {available ? 'Mark Out of Stock' : 'Mark Available'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditorItem(item)}>Edit</Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            if (!confirm('Delete this item?')) return
                            const { error } = await supabase.from('menu_items').delete().eq('id', item.id)
                            if (error) setError(error.message)
                            else setItems(prev => prev.filter(i => i.id !== item.id))
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <ItemEditor
        open={!!editorItem}
        onClose={() => setEditorItem(null)}
        item={editorItem?.id ? editorItem : null}
        restaurantId={restaurantId}
        onSaved={handleSaved}
      />
      <LibraryPicker
        open={showLibrary}
        onClose={() => setShowLibrary(false)}
        restaurantId={restaurantId}
        onAdded={(rows) => { if (rows?.length) setItems(prev => [...rows, ...prev]) }}
      />

      <style jsx>{`
        .menu-page { 
          padding: 20px 8px 40px; 
          max-width: 100%;
          min-height: 100vh;
        }

        .table-scroll { 
          width: 100%; 
          overflow-x: auto; 
          -webkit-overflow-scrolling: touch; 
        }

        /* Badges */
        .pill {
          display: inline-block; padding: 4px 10px; border-radius: 999px;
          font-size: 12px; background: #f3f4f6; white-space: nowrap;
        }
        .pill--pkg { background: #ecfeff; color: #0369a1; }
        .pill--menu { background: #f5f3ff; color: #6d28d9; }

        .chip { padding: 2px 8px; border-radius: 999px; font-size: 12px; background: #e5e7eb; white-space: nowrap; }
        .chip--avail { background: #dcfce7; color: #166534; }
        .chip--out { background: #fee2e2; color: #991b1b; }

        /* Toolbar - mobile first */
        .toolbar {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin: 16px 0;
        }
        
        .search-input {
          width: 100%;
        }
        
        .category-select {
          width: 100%;
        }
        
        .checkbox-group {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }
        
        .flag { 
          display: inline-flex; 
          align-items: center; 
          gap: 6px; 
          white-space: nowrap; 
        }

        .toolbar-cta {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 8px;
        }

        .mobile-actions {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* Default: mobile-only chunks hidden */
        .only-sm { display: none; }

        /* Small phones */
        @media (max-width: 480px) {
          .hide-xs { display: none; }
          .only-sm { display: flex !important; }
        }

        /* Medium phones */
        @media (max-width: 640px) {
          .hide-sm { display: none; }
          .table td, .table th { 
            white-space: nowrap; 
            padding: 8px 6px;
            font-size: 14px;
          }
          .table thead th { 
            position: sticky; 
            top: 0; 
            z-index: 2; 
            background: #f9fafb; 
          }
        }

        /* Tablet and up */
        @media (min-width: 641px) {
          .toolbar {
            display: grid;
            grid-template-columns: 1fr 200px auto;
            align-items: center;
            gap: 12px;
          }
          
          .checkbox-group {
            grid-column: 3;
          }
          
          .toolbar-cta {
            grid-column: 1 / -1;
            display: flex;
            flex-wrap: wrap;
          }
        }

        /* Desktop */
        @media (min-width: 900px) {
          .toolbar {
            grid-template-columns: 1fr 220px auto auto;
          }
          
          .checkbox-group {
            grid-column: auto;
          }
        }
      `}</style>
    </div>
  )
}
