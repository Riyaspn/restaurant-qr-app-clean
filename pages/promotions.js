// pages/promotions.js
import { useState } from 'react'
import Alert from '../components/Alert'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'

export default function PromotionsPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading } = useRestaurant()
  const [error] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [promos, setPromos] = useState([]) // placeholder state

  if (checking || loading) return <p>Loading…</p>
  if (!restaurant) return <p>No restaurant found.</p>

  const addPromo = (promo) => {
    setPromos(prev => [promo, ...prev])
    setModalOpen(false)
  }

  return (
    <>
      <h1>Promotions</h1>
      {error && <Alert type="error">{error}</Alert>}

      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setModalOpen(true)}>Create promotion</button>
      </div>

      {promos.length === 0 ? (
        <p style={{ color: '#666' }}>No promotions yet.</p>
      ) : (
        <div style={{ border: '1px solid #eee', borderRadius: 8 }}>
          {promos.map((p, i) => (
            <div key={i} style={{ padding: 12, borderBottom: '1px solid #eee' }}>
              <strong>{p.name}</strong> — {p.type} {p.value}{p.type === 'percent' ? '%' : ''}
              <div style={{ color: '#666' }}>
                {p.start} to {p.end || 'no end'}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && <PromoModal onClose={() => setModalOpen(false)} onSave={addPromo} />}
    </>
  )
}

function PromoModal({ onClose, onSave }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('percent')
  const [value, setValue] = useState(10)
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')

  const save = (e) => {
    e.preventDefault()
    onSave({ name: name.trim(), type, value: Number(value), start, end })
  }

  return (
    <div style={backdrop} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={save} style={card}>
        <h3 style={{ marginTop: 0 }}>Create promotion</h3>

        <Field label="Name">
          <input value={name} onChange={e => setName(e.target.value)} required style={input} />
        </Field>

        <Field label="Type">
          <select value={type} onChange={e => setType(e.target.value)} style={{ ...input, height: 36 }}>
            <option value="percent">percent</option>
            <option value="amount">amount</option>
          </select>
        </Field>

        <Field label="Value">
          <input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} required style={input} />
        </Field>

        <Field label="Start">
          <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} style={input} />
        </Field>

        <Field label="End">
          <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} style={input} />
        </Field>

        <div style={{ textAlign: 'right' }}>
          <button type="button" onClick={onClose} style={{ marginRight: 8 }}>Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  )
}

const backdrop = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const card = { background: '#fff', width: 420, padding: 16, borderRadius: 8 }
const input = { width: '100%', padding: 8, border: '1px solid #ddd', borderRadius: 4 }
