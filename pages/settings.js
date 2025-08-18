// pages/settings.js
import Shell from '../components/Shell'
import Alert from '../components/Alert'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../services/supabase'
import { useState } from 'react'

export default function SettingsPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading } = useRestaurant()
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (checking || loading) return <Shell><p>Loading…</p></Shell>
  if (!restaurant) return <Shell><p>No restaurant found.</p></Shell>

  const paused = !!restaurant.online_paused

  const togglePause = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('restaurants')
      .update({ online_paused: !paused })
      .eq('id', restaurant.id)
    setSaving(false)
    if (error) setError(error.message)
    else location.reload()
  }

  return (
    <Shell>
      <h1>Settings</h1>
      {error && <Alert type="error">{error}</Alert>}

      <section style={section}>
        <h3 style={h3}>Online ordering</h3>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={paused} onChange={togglePause} disabled={saving} />
          Pause online ordering {saving && '…'}
        </label>
      </section>

      <section style={section}>
        <h3 style={h3}>Restaurant profile</h3>
        <p style={{ color: '#666' }}>Name: {restaurant.name}</p>
        <p style={{ color: '#666' }}>Owner email: {restaurant.owner_email}</p>
        <p style={{ color: '#666' }}>UPI ID: {restaurant.upi_id || '—'}</p>
      </section>

      <section style={section}>
        <h3 style={h3}>Taxes & fees</h3>
        <p style={{ color: '#666' }}>Tax rate: {Number(restaurant.tax_rate ?? 0).toFixed(2)}%</p>
        <p style={{ color: '#666' }}>Editing UI coming soon.</p>
      </section>
    </Shell>
  )
}

const section = { border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 16 }
const h3 = { margin: '8px 0' }
