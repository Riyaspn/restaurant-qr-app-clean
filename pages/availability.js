// pages/availability.js
import { useState, useEffect } from 'react'
import Shell from '../components/Shell'
import Alert from '../components/Alert'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../services/supabase'

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function AvailabilityPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading } = useRestaurant()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hours, setHours] = useState(() =>
    DAYS.map(d => ({ day: d, open: '10:00', close: '22:00', enabled: true }))
  )

  useEffect(() => {
    if (restaurant) setPaused(!!restaurant.online_paused)
  }, [restaurant])

  if (checking || loading) return <Shell><p>Loading…</p></Shell>
  if (!restaurant) return <Shell><p>No restaurant found.</p></Shell>

  const togglePause = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('restaurants')
      .update({ online_paused: !paused })
      .eq('id', restaurant.id)
    setSaving(false)
    if (error) setError(error.message)
    else setPaused(!paused)
  }

  const onHourChange = (idx, key, value) => {
    setHours(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [key]: value }
      return next
    })
  }

  const saveHours = async () => {
    // Placeholder: persist to a future table like restaurant_hours
    // For now, just show a success notification.
    alert('Hours saved (placeholder).')
  }

  return (
    <Shell>
      <h1>Availability & Hours</h1>
      {error && <Alert type="error">{error}</Alert>}

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={paused} onChange={togglePause} disabled={saving} />
          Pause online ordering {saving && '…'}
        </label>
        <p style={{ color: '#666', marginTop: 8 }}>
          When paused, customers can view the menu but cannot place new orders.
        </p>
      </div>

      <h3>Service hours</h3>
      <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
        {hours.map((h, idx) => (
          <div key={h.day} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <strong style={{ width: 40 }}>{h.day}</strong>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="checkbox"
                checked={h.enabled}
                onChange={e => onHourChange(idx, 'enabled', e.target.checked)}
              />
              Open
            </label>
            <input type="time" value={h.open} onChange={e => onHourChange(idx, 'open', e.target.value)} />
            <span>to</span>
            <input type="time" value={h.close} onChange={e => onHourChange(idx, 'close', e.target.value)} />
          </div>
        ))}
        <div style={{ textAlign: 'right' }}>
          <button onClick={saveHours}>Save hours</button>
        </div>
      </div>
    </Shell>
  )
}
