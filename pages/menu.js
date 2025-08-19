// pages/menu.js
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabase'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import Alert from '../components/Alert'
import ItemEditor from '../components/ItemEditor'
import LibraryPicker from '../components/LibraryPicker'

export default function MenuPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: loadingRestaurant } = useRestaurant()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [snackbar, setSnackbar] = useState(null)
  const [editorItem, setEditorItem] = useState(null)
  const [showLib, setShowLib] = useState(false)

  useEffect(() => {
    if (!restaurant?.id) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('menu_items')
        .select('id,name,price,category,status')
        .eq('restaurant_id', restaurant.id)
        .order('category', { ascending: true })
        .order('name', { ascending: true })
      setLoading(false)
      if (error) setError(error.message)
      else setItems(data || [])
    }
    load()
  }, [restaurant?.id])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return items
    return items.filter(i => {
      const name = (i.name || '').toLowerCase()
      const cat = (i.category || '').toLowerCase()
      return name.includes(q) || cat.includes(q)
    })
  }, [items, filter])

  const toggleStatus = async (id, current) => {
    const next = current === 'available' ? 'out_of_stock' : 'available'
    setItems(prev => prev.map(i => (i.id === id ? { ...i, status: next } : i)))
    setSnackbar({
      message: `Marked ${next.replace('_', ' ')}`,
      action: 'Undo',
      onAction: () => {
        setItems(prev => prev.map(i => (i.id === id ? { ...i, status: current } : i)))
      }
    })
    const { error } = await supabase
      .from('menu_items')
      .update({ status: next })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
    if (error) setError(error.message)
  }

  const onDelete = async (id) => {
    const snapshot = items
    setItems(prev => prev.filter(i => i.id !== id))
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
    if (error) {
      setError(error.message)
      setItems(snapshot)
    }
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allSelected = visible.length > 0 && selected.size === visible.length
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(visible.map(i => i.id)))
  }

  const applyBulk = async (status) => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    setItems(prev => prev.map(i => (ids.includes(i.id) ? { ...i, status } : i)))
    setSelected(new Set())
    setSnackbar({ message: `Bulk updated to ${status.replace('_', ' ')}` })
    const { error } = await supabase
      .from('menu_items')
      .update({ status })
      .in('id', ids)
      .eq('restaurant_id', restaurant.id)
    if (error) setError(error.message)
  }

  if (checking || loadingRestaurant || !restaurant?.id) return <p>Loading…</p>

  return (
    <div className="menu-page" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <h1>Menu Management</h1>

      {error && <Alert type="error">{error}</Alert>}

      {snackbar && (
        <div
          className="snackbar"
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            background: '#333',
            color: '#fff',
            padding: 12,
            borderRadius: 4,
            zIndex: 60
          }}
        >
          {snackbar.message}
          {snackbar.action && (
            <button
              onClick={snackbar.onAction}
              style={{
                marginLeft: 16,
                color: '#4caf50',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {snackbar.action}
            </button>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="actions-bar" style={{ marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search items..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 4, minWidth: 160 }}
        />
        <button onClick={() => setEditorItem({})}>Add New Item</button>
        <button onClick={() => setShowLib(true)}>Add from Library</button>
        <button onClick={() => applyBulk('available')}>Mark Available</button>
        <button onClick={() => applyBulk('out_of_stock')}>Mark Out of Stock</button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr style={{ background: '#f6f6f6' }}>
              <th style={th}>
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
              </th>
              <th style={th}>Name</th>
              <th style={th}>Category</th>
              <th style={th}>Price</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 12 }}>Loading items…</td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 12, color: '#666' }}>No items found.</td></tr>
            ) : (
              visible.map(item => {
                const isAvailable = item.status === 'available'
                const isOut = item.status === 'out_of_stock'
                const badgeBg = isAvailable ? '#e6ffe6' : isOut ? '#ffe6e6' : '#fff5cc'
                const badgeColor = isAvailable ? '#0a8a0a' : isOut ? '#a00' : '#8a6d00'
                const statusLabel = (item.status || '').replaceAll('_', ' ')
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={td}>
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                      />
                    </td>
                    <td style={td}><span className="truncate">{item.name}</span></td>
                    <td style={td}><span className="truncate">{item.category || '—'}</span></td>
                    <td style={td}>₹{Number(item.price ?? 0).toFixed(2)}</td>
                    <td style={td}>
                      <span
                        className="status-chip"
                        style={{
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: 12,
                          background: badgeBg,
                          color: badgeColor,
                          textTransform: 'capitalize',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <button onClick={() => toggleStatus(item.id, item.status)} style={{ padding: '6px 10px' }}>
                          {isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
                        </button>
                        <button style={{ padding: '6px 10px' }} onClick={() => setEditorItem(item)}>
                          Edit
                        </button>
                        <button style={{ padding: '6px 10px', color: '#a00' }} onClick={() => onDelete(item.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Item editor */}
      <ItemEditor
        open={!!editorItem}
        onClose={() => setEditorItem(null)}
        item={editorItem?.id ? editorItem : null}
        restaurantId={restaurant.id}
        onSaved={(saved) => {
          setItems(prev => {
            const idx = prev.findIndex(i => i.id === saved.id)
            if (idx === -1) return [saved, ...prev]
            const next = [...prev]
            next[idx] = saved
            return next
          })
        }}
        onError={(msg) => setError(msg)}
      />

      {/* Library picker */}
      <LibraryPicker
        open={showLib}
        onClose={() => setShowLib(false)}
        restaurantId={restaurant.id}
        onAdded={(rows) => {
          if (!rows || rows.length === 0) return
          setItems(prev => [...rows, ...prev])
        }}
      />
    </div>
  )
}

const th = {
  textAlign: 'left',
  padding: 10,
  borderBottom: '1px solid #eee',
  fontWeight: 600,
  fontSize: 13
}
const td = { padding: 10, verticalAlign: 'middle' }
