// pages/menu.js
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import Shell from '../components/Shell'
import Alert from '../components/Alert'
import ItemEditor from '../components/ItemEditor'

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

  // Fetch menu items when restaurant is known
  useEffect(() => {
    if (!restaurant?.id) return
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('menu_items')
        .select('id,name,price,category,status,available')
        .eq('restaurant_id', restaurant.id)
        .order('category', { ascending: true })
      setLoading(false)
      if (error) setError(error.message)
      else setItems(data || [])
    }
    load()
  }, [restaurant?.id])

  // Filtered list
  const visible = items.filter(i => {
    const q = filter.trim().toLowerCase()
    if (!q) return true
    const name = (i.name || '').toLowerCase()
    const cat = (i.category || '').toLowerCase()
    return name.includes(q) || cat.includes(q)
  })

  // Toggle status between 'available' and 'out_of_stock'
  const toggleStatus = async (id, current) => {
    const newStatus = current === 'available' ? 'out_of_stock' : 'available'
    // Optimistic update
    setItems(prev => prev.map(i => (i.id === id ? { ...i, status: newStatus } : i)))
    setSnackbar({
      message: `Marked ${newStatus.replace('_', ' ')}`,
      action: 'Undo',
      onAction: () => {
        setItems(prev => prev.map(i => (i.id === id ? { ...i, status: current } : i)))
      }
    })
    // Persist
    const { error } = await supabase
      .from('menu_items')
      .update({ status: newStatus })
      .eq('id', id)
      .eq('restaurant_id', restaurant.id)
    if (error) setError(error.message)
  }

  // Delete item
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
      setItems(snapshot) // revert on error
    }
  }

  // Selection helpers
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = visible.length > 0 && selected.size === visible.length
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(visible.map(i => i.id)))
  }

  // Bulk action for status
  const applyBulk = async (status) => {
    const ids = Array.from(selected)
    if (ids.length === 0) return
    // Optimistic
    setItems(prev => prev.map(i => (ids.includes(i.id) ? { ...i, status } : i)))
    setSelected(new Set())
    setSnackbar({ message: `Bulk updated to ${status.replace('_', ' ')}` })
    // Persist
    const { error } = await supabase
      .from('menu_items')
      .update({ status })
      .in('id', ids)
      .eq('restaurant_id', restaurant.id)
    if (error) setError(error.message)
  }

  if (checking || loadingRestaurant) {
    return (
      <Shell>
        <p>Loading…</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1>Menu Management</h1>

      {error && <Alert type="error">{error}</Alert>}

      {snackbar && (
        <div
          className="snackbar"
          style={{
            position: 'fixed',
            left: '50%',
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

      {/* Responsive actions bar */}
      <div className="actions-bar" style={{ marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search items..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: 1, padding: 8, border: '1px solid #ddd', borderRadius: 4, minWidth: 160 }}
        />
        <button onClick={() => setEditorItem({})}>Add New Item</button>
        <button onClick={() => applyBulk('available')}>Mark Available</button>
        <button onClick={() => applyBulk('out_of_stock')}>Mark Out of Stock</button>
      </div>

      {/* Responsive table wrapper */}
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
              <tr>
                <td colSpan={6} style={{ padding: 12 }}>
                  Loading items…
                </td>
              </tr>
            ) : visible.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 12, color: '#666' }}>
                  No items found.
                </td>
              </tr>
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
                      <button onClick={() => toggleStatus(item.id, item.status)}>
                        {isAvailable ? 'Mark Out of Stock' : 'Mark Available'}
                      </button>
                      <button style={{ marginLeft: 8 }} onClick={() => setEditorItem(item)}>
                        Edit
                      </button>
                      <button style={{ marginLeft: 8, color: '#a00' }} onClick={() => onDelete(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Item editor modal */}
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
    </Shell>
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
