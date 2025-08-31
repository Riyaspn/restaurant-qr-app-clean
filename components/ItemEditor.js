// components/ItemEditor.js
import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../services/supabase'

export default function ItemEditor({ open, onClose, item, restaurantId, onSaved, onError }) {
  const isEdit = !!item?.id

  // Form state
  const [name, setName] = useState(item?.name || '')
  const [price, setPrice] = useState(item?.price ?? 0)
  const [category, setCategory] = useState(item?.category || 'main')
  const [status, setStatus] = useState(item?.status || 'available')
  const [veg, setVeg] = useState(item?.veg ?? true)

  // Tax fields
  const [hsn, setHsn] = useState(item?.hsn || '')
  const [taxRate, setTaxRate] = useState(item?.tax_rate ?? 0)
  const [isPackaged, setIsPackaged] = useState(!!item?.is_packaged_good)
  const [cessRate, setCessRate] = useState(item?.compensation_cess_rate ?? 0)

  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    setName(item?.name || '')
    setPrice(item?.price ?? 0)
    setCategory(item?.category || 'main')
    setStatus(item?.status || 'available')
    setVeg(item?.veg ?? true)
    setHsn(item?.hsn || '')
    setTaxRate(item?.tax_rate ?? 0)
    setIsPackaged(!!item?.is_packaged_good)
    setCessRate(item?.compensation_cess_rate ?? 0)
    setErr('')
  }, [item])

  const canSubmit = useMemo(() => {
    if (!name?.trim()) return false
    const p = Number(price)
    if (Number.isNaN(p) || p < 0) return false
    const tr = Number(taxRate)
    const cr = Number(cessRate)
    if (tr < 0 || cr < 0) return false
    return true
  }, [name, price, taxRate, cessRate])

  if (!open) return null

  const save = async (e) => {
    e.preventDefault()
    setErr('')
    if (!canSubmit) {
      return onError?.('Please fill required fields with valid values.')
    }

    const numericPrice = Number(price)
    const payload = {
      name: name.trim(),
      price: numericPrice,
      category: String(category || 'main').trim(),
      status,
      veg: !!veg,
      hsn: hsn?.trim() || null,
      tax_rate: Number(taxRate || 0),                 // per-item tax; used for packaged goods or overrides [2][1]
      is_packaged_good: !!isPackaged,                 // goods vs restaurant service [2][1]
      compensation_cess_rate: Number(cessRate || 0),  // for aerated/fizzy beverages, etc. [1][2]
    }

    try {
      setSaving(true)
      if (isEdit) {
        const { error } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', item.id)
          .eq('restaurant_id', restaurantId)
        if (error) throw error
        onSaved?.({ ...item, ...payload })
      } else {
        const { data, error } = await supabase
          .from('menu_items')
          .insert([{ restaurant_id: restaurantId, ...payload }])
          .select('id, name, price, category, status, veg, hsn, tax_rate, is_packaged_good, compensation_cess_rate')
          .single()
        if (error) throw error
        onSaved?.(data)
      }
      onClose?.()
    } catch (ex) {
      const msg = ex?.message || 'Failed to save item'
      setErr(msg)
      onError?.(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 12
      }}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      aria-modal="true"
      role="dialog"
      aria-labelledby="menu-item-editor-title"
    >
      <form onSubmit={save} className="modal-card" style={{ background: '#fff', width: '100%', maxWidth: 420, padding: 16, borderRadius: 8 }}>
        <h3 id="menu-item-editor-title" style={{ marginTop: 0 }}>{isEdit ? 'Edit Item' : 'Add Item'}</h3>

        {err && (
          <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: 8, borderRadius: 6, marginBottom: 10 }}>
            {err}
          </div>
        )}

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={label}>Name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={input} placeholder="e.g., Classic Mojito" />
        </label>

        <div style={row2}>
          <label style={{ display: 'block' }}>
            <div style={label}>Price</div>
            <input type="number" step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} required style={input} />
          </label>
          <label style={{ display: 'block' }}>
            <div style={label}>Category</div>
            <input value={category} onChange={(e) => setCategory(e.target.value)} style={input} placeholder="e.g., beverages" />
          </label>
        </div>

        <div style={row2}>
          <label style={{ display: 'block' }}>
            <div style={label}>Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...input, height: 36 }}>
              <option value="available">available</option>
              <option value="out_of_stock">out_of_stock</option>
              <option value="paused">paused</option>
            </select>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 22 }}>
            <input type="checkbox" checked={veg} onChange={(e) => setVeg(e.target.checked)} />
            <span style={{ ...label, margin: 0 }}>Veg</span>
          </label>
        </div>

        <div style={{ height: 1, background: '#eee', margin: '8px 0 10px' }} />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <input type="checkbox" checked={isPackaged} onChange={(e) => setIsPackaged(e.target.checked)} />
          <span style={label}>Packaged goods</span>
        </label>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={label}>HSN</div>
          <input
            value={hsn ?? ''}
            onChange={(e) => setHsn(e.target.value)}
            style={input}
            placeholder={isPackaged ? 'e.g., 2202 for aerated drinks' : 'optional'}
          />
        </label>

        <div style={row2}>
          <label style={{ display: 'block' }}>
            <div style={label}>Tax %</div>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              style={input}
              placeholder={isPackaged ? 'e.g., 28' : 'e.g., 5 or 18'}
            />
          </label>

          <label style={{ display: 'block' }}>
            <div style={label}>Cess %</div>
            <input
              type="number"
              step="0.01"
              inputMode="decimal"
              value={cessRate}
              onChange={(e) => setCessRate(e.target.value)}
              style={input}
              disabled={!isPackaged}
              placeholder={isPackaged ? 'e.g., 12' : '—'}
            />
          </label>
        </div>

        <div style={{ textAlign: 'right', marginTop: 10 }}>
          <button type="button" onClick={onClose} style={{ marginRight: 8 }} disabled={saving}>Cancel</button>
          <button type="submit" disabled={saving || !canSubmit}>{saving ? 'Saving…' : isEdit ? 'Save' : 'Add'}</button>
        </div>
      </form>
    </div>
  )
}

const input = { width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4, height: 36 }
const label = { fontSize: 12, color: '#555', marginBottom: 4 }
const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }
