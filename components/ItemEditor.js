// components/ItemEditor.js
import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

export default function ItemEditor({ open, onClose, item, restaurantId, onSaved, onError }) {
  const isEdit = !!item?.id
  const [name, setName] = useState(item?.name || '')
  const [price, setPrice] = useState(item?.price ?? 0)
  const [category, setCategory] = useState(item?.category || 'main')
  const [status, setStatus] = useState(item?.status || 'available')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setName(item?.name || '')
    setPrice(item?.price ?? 0)
    setCategory(item?.category || 'main')
    setStatus(item?.status || 'available')
  }, [item])

  if (!open) return null

  const save = async (e) => {
    e.preventDefault()
    if (!name.trim()) return onError?.('Name is required')
    const numericPrice = Number(price)
    if (Number.isNaN(numericPrice) || numericPrice < 0) return onError?.('Price must be a positive number')
    setSaving(true)

    if (isEdit) {
      const { error } = await supabase
        .from('menu_items')
        .update({ name: name.trim(), price: numericPrice, category: category.trim(), status })
        .eq('id', item.id)
        .eq('restaurant_id', restaurantId)
      setSaving(false)
      if (error) return onError?.(error.message)
      onSaved?.({ ...item, name: name.trim(), price: numericPrice, category: category.trim(), status })
      onClose()
    } else {
      const { data, error } = await supabase
        .from('menu_items')
        .insert([{ restaurant_id: restaurantId, name: name.trim(), price: numericPrice, category: category.trim(), status }])
        .select('id,name,price,category,status')
        .single()
      setSaving(false)
      if (error) return onError?.(error.message)
      onSaved?.(data)
      onClose()
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={save} style={{ background: '#fff', width: 420, padding: 16, borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>{isEdit ? 'Edit Item' : 'Add Item'}</h3>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#555' }}>Name</div>
          <input value={name} onChange={e => setName(e.target.value)} required style={input} />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#555' }}>Price</div>
          <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} required style={input} />
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: '#555' }}>Category</div>
          <input value={category} onChange={e => setCategory(e.target.value)} style={input} />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#555' }}>Status</div>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...input, height: 36 }}>
            <option value="available">available</option>
            <option value="out_of_stock">out_of_stock</option>
            <option value="paused">paused</option>
          </select>
        </label>

        <div style={{ textAlign: 'right' }}>
          <button type="button" onClick={onClose} style={{ marginRight: 8 }} disabled={saving}>Cancel</button>
          <button type="submit" disabled={saving}>{saving ? 'Saving…' : (isEdit ? 'Save' : 'Add')}</button>
        </div>
      </form>
    </div>
  )
}

const input = { width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }
