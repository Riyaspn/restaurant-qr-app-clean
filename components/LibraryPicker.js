// components/LibraryPicker.js
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase'

export default function LibraryPicker({ open, onClose, restaurantId, onAdded }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [list, setList] = useState([])
  const [cats, setCats] = useState([])
  const [q, setQ] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const [cat, setCat] = useState('all')
  const [selected, setSelected] = useState({}) // id -> price (number)

  // Reset selection when opening
  useEffect(() => {
    if (!open) return
    setSelected({})
  }, [open])

  useEffect(() => {
    if (!open) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const [{ data: categories, error: catErr }, { data: items, error: libErr }] = await Promise.all([
          supabase
            .from('categories')
            .select('id,name')
            .eq('is_global', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('menu_library_items')
            .select('id,name,default_price,veg,description,image_url,category_id')
        ])
        if (catErr) throw catErr
        if (libErr) throw libErr
        setCats(categories || [])
        setList(items || [])
      } catch (e) {
        setError(e.message || 'Failed to load library')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [open])

  // Helper: map category_id -> name (so we can save readable category)
  const catNameById = useMemo(() => {
    const map = new Map()
    for (const c of cats) map.set(c.id, c.name)
    return map
  }, [cats])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (list || []).filter(it => {
      if (vegOnly && !it.veg) return false
      if (cat !== 'all' && it.category_id !== cat) return false
      if (!needle) return true
      return (it.name || '').toLowerCase().includes(needle)
    })
  }, [list, vegOnly, cat, q])

  const toggle = (it) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[it.id] !== undefined) delete next[it.id]
      else next[it.id] = Number(it.default_price ?? 0)
      return next
    })
  }

  const setPrice = (id, price) => {
    const num = Number(price)
    setSelected(prev => ({ ...prev, [id]: Number.isFinite(num) ? num : 0 }))
  }

  const addSelected = async () => {
    const ids = Object.keys(selected)
    if (ids.length === 0) return onClose?.()
    if (!restaurantId) {
      setError('Restaurant not selected.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const rows = ids.map(id => {
        const it = list.find(x => x.id === id)
        const price = Number(selected[id] ?? it?.default_price ?? 0)
        // Optional: map global category_id to a readable category name
        const category = it?.category_id ? (catNameById.get(it.category_id) || '') : ''
        return {
          restaurant_id: restaurantId,
          name: it?.name || '',
          price: Number.isFinite(price) ? price : 0,
          category, // keep as '' if you prefer category_id in menu_items instead
          status: 'available',
          veg: it?.veg ?? null,
          description: it?.description ?? null,
          image_url: it?.image_url ?? null,
          library_item_id: it?.id || null
        }
      })

      const { data, error } = await supabase
        .from('menu_items')
        .insert(rows)
        .select('id,name,price,category,status')

      if (error) throw error

      onAdded?.(data || [])
      onClose?.()
    } catch (e) {
      setError(e.message || 'Failed to add selected items')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={(e) => {
        // close when clicking the backdrop (not the modal)
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className="modal-card"
        style={{
          background: '#fff',
          width: 'min(720px, 95vw)',
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 16,
          borderRadius: 8
        }}
      >
        <h3 style={{ marginTop: 0 }}>Add from Library</h3>

        {error && (
          <div style={{ color: '#a00', marginBottom: 8 }}>
            {error}
          </div>
        )}

        <div
          className="actions"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
            alignItems: 'center'
          }}
        >
          <input
            type="text"
            placeholder="Search items…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{
              flex: 1,
              minWidth: 180,
              padding: 8,
              border: '1px solid #ddd',
              borderRadius: 4
            }}
            autoFocus
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input
              type="checkbox"
              checked={vegOnly}
              onChange={e => setVegOnly(e.target.checked)}
            />
            Veg only
          </label>
          <select
            value={cat}
            onChange={e => setCat(e.target.value)}
            style={{ padding: 8, border: '1px solid #ddd', borderRadius: 4 }}
          >
            <option value="all">All categories</option>
            {cats.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 12, color: '#666' }}>No items match your filters.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 48 }}></th>
                  <th>Name</th>
                  <th style={{ width: 100 }}>Veg</th>
                  <th style={{ width: 140 }}>Price</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(it => {
                  const checked = selected[it.id] !== undefined
                  const currentPrice = selected[it.id] ?? it.default_price ?? 0
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
                      <td>
                        <span className="truncate">{it.name}</span>
                      </td>
                      <td>{it.veg ? 'Veg' : 'Non-veg'}</td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={currentPrice}
                          onChange={e => setPrice(it.id, e.target.value)}
                          style={{
                            width: 110,
                            padding: 6,
                            border: '1px solid #ddd',
                            borderRadius: 4
                          }}
                          disabled={!checked}
                          inputMode="decimal"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} disabled={loading}>Cancel</button>
          <button onClick={addSelected} disabled={loading}>
            {loading ? 'Adding…' : 'Add Selected'}
          </button>
        </div>
      </div>
    </div>
  )
}
