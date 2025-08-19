// pages/settings.js
import { useEffect, useState } from 'react'
import { useRequireAuth } from '../lib/useRequireAuth'
import { useRestaurant } from '../context/RestaurantContext'
import { supabase } from '../services/supabase'
import Alert from '../components/Alert'

export default function SettingsPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: loadingRestaurant } = useRestaurant()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    legal_name: '',
    phone: '',
    support_email: '',
    gstin: '',
    shipping_name: '',
    shipping_phone: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_pincode: '',
    tables_count: 0,
    table_prefix: 'T',
    upi_id: '',
    brand_logo_url: '',
    brand_color: '',
  })

  useEffect(() => {
    const load = async () => {
      if (!restaurant?.id) return
      setLoading(true)
      setError('')
      setSaved(false)
      const { data, error } = await supabase
        .from('restaurant_profiles')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .maybeSingle()
      if (error) {
        setError(error.message)
      } else if (data) {
        setForm(prev => ({ ...prev, ...data }))
      }
      setLoading(false)
    }
    load()
  }, [restaurant?.id])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    if (!restaurant?.id) return

    const payload = {
      ...form,
      restaurant_id: restaurant.id,
      tables_count: Number(form.tables_count || 0),
    }

    const { error } = await supabase
      .from('restaurant_profiles')
      .upsert(payload, { onConflict: 'restaurant_id' })

    if (error) setError(error.message)
    else setSaved(true)
  }

  const onChange = (k) => (e) => setForm(s => ({ ...s, [k]: e.target.value }))

  if (checking || loadingRestaurant) return <p>Loading…</p>
  if (loading) return <p>Loading settings…</p>

  return (
    <>
      <h1>Settings</h1>

      {error && <Alert type="error">{error}</Alert>}
      {saved && <Alert type="success">Saved</Alert>}

      <form onSubmit={save} className="card" style={{ display: 'grid', gap: 12, maxWidth: 900 }}>
        <h3 style={{ marginTop: 0 }}>Restaurant Profile</h3>

        <Section title="Business">
          <Field label="Legal name">
            <input value={form.legal_name} onChange={onChange('legal_name')} />
          </Field>
          <Field label="Phone">
            <input value={form.phone} onChange={onChange('phone')} />
          </Field>
          <Field label="Support email">
            <input type="email" value={form.support_email} onChange={onChange('support_email')} />
          </Field>
          <Field label="GSTIN">
            <input value={form.gstin} onChange={onChange('gstin')} />
          </Field>
        </Section>

        <Section title="Shipping (for QR stands)">
          <Field label="Recipient name">
            <input value={form.shipping_name} onChange={onChange('shipping_name')} />
          </Field>
          <Field label="Recipient phone">
            <input value={form.shipping_phone} onChange={onChange('shipping_phone')} />
          </Field>
          <Field label="Address line 1">
            <input value={form.shipping_address_line1} onChange={onChange('shipping_address_line1')} />
          </Field>
          <Field label="Address line 2">
            <input value={form.shipping_address_line2} onChange={onChange('shipping_address_line2')} />
          </Field>
          <div className="actions" style={{ gap: 12 }}>
            <div style={{ flex: 2 }}>
              <Field label="City">
                <input value={form.shipping_city} onChange={onChange('shipping_city')} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="State">
                <input value={form.shipping_state} onChange={onChange('shipping_state')} />
              </Field>
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Pincode">
                <input value={form.shipping_pincode} onChange={onChange('shipping_pincode')} />
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Operations">
          <div className="actions" style={{ gap: 12 }}>
            <Field label="Number of tables">
              <input type="number" min="0" value={form.tables_count} onChange={onChange('tables_count')} />
            </Field>
            <Field label="Table prefix">
              <input value={form.table_prefix} onChange={onChange('table_prefix')} />
            </Field>
          </div>
          <Field label="UPI ID">
            <input value={form.upi_id} onChange={onChange('upi_id')} placeholder="example@upi" />
          </Field>
        </Section>

        <Section title="Branding">
          <Field label="Logo URL">
            <input value={form.brand_logo_url} onChange={onChange('brand_logo_url')} />
          </Field>
          <Field label="Brand color (hex)">
            <input value={form.brand_color} onChange={onChange('brand_color')} placeholder="#ff6600" />
          </Field>
        </Section>

        <div style={{ textAlign: 'right', marginTop: 8 }}>
          <button type="submit">Save</button>
        </div>
      </form>
    </>
  )
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ display: 'grid', gap: 8 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12, color: '#555', marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  )
}
