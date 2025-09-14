// pages/owner/settings.js
import React, { useEffect, useState } from 'react'
import { useRequireAuth } from '../../lib/useRequireAuth'
import { useRestaurant } from '../../context/RestaurantContext'
import { supabase } from '../../services/supabase'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'

function Section({ title, icon, children }) {
  return (
    <Card padding={24}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>{children}</div>
    </Card>
  )
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
        {label}{required && ' *'}
      </label>
      {children}
      {hint && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export default function SettingsPage() {
  const { checking } = useRequireAuth()
  const { restaurant, loading: loadingRestaurant } = useRestaurant()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isFirstTime, setIsFirstTime] = useState(false)
  const [originalTables, setOriginalTables] = useState(0)
  const [form, setForm] = useState({
    legal_name: '',
    restaurant_name: '',
    phone: '',
    support_email: '',
    gstin: '',
    gst_enabled: false,
    prices_include_tax: true,
    default_tax_rate: 5,
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
    website_url: '',
    instagram_handle: '',
    facebook_page: '',
    description: '',
    swiggy_api_key: '',
    swiggy_api_secret: '',
    swiggy_webhook_secret: '',
    zomato_api_key: '',
    zomato_api_secret: '',
    zomato_webhook_secret: '',
    // New fields for Bank Account Details
    bank_account_holder_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_email: '',
    bank_phone: '',
    route_account_id: '', // store created Razorpay route account ID
  })

  useEffect(() => {
    if (!restaurant?.id) return
    const load = async () => {
      setLoading(true)
      setError('')
      try {
        const { data, error } = await supabase
          .from('restaurant_profiles')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .maybeSingle()
        if (error) throw error
        if (data) {
          setForm(prev => ({
            ...prev,
            ...data,
            default_tax_rate: data.default_tax_rate ?? 5,
            prices_include_tax: data.prices_include_tax ?? true
          }))
          setOriginalTables(data.tables_count || 0)
        } else {
          setIsFirstTime(true)
        }
        // Load route_account_id from restaurants table, if saved
        const { data: restData, error: restErr } = await supabase
          .from('restaurants')
          .select('route_account_id')
          .eq('id', restaurant.id)
          .single()
        if (!restErr && restData) {
          setForm(prev => ({
            ...prev,
            route_account_id: restData.route_account_id || '',
          }))
        }
      } catch (e) {
        setError(e.message || 'Failed to load settings')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [restaurant?.id])

  const onChange = field => e => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(prev => ({ ...prev, [field]: val }))
  }

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const required = [
        'legal_name', 'restaurant_name', 'phone', 'support_email',
        'upi_id', 'shipping_name', 'shipping_phone', 'shipping_address_line1',
        'shipping_city', 'shipping_state', 'shipping_pincode',
        // Require bank details mandatorily
        'bank_account_holder_name', 'bank_account_number', 'bank_ifsc'
      ]
      const missing = required.filter(f => !form[f] || form[f].toString().trim() === '')
      if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`)

      // Validate UPI
      const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/
      if (!UPI_REGEX.test(form.upi_id.trim())) throw new Error('Invalid UPI format. Example: name@bankhandle')

      // Validate IFSC (simple check)
      const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
      const formattedIfsc = form.bank_ifsc.trim().toUpperCase()
      if (!IFSC_REGEX.test(formattedIfsc)) throw new Error('Invalid IFSC code format.')

      const newCount = Number(form.tables_count)
      if (!isFirstTime && newCount < originalTables) throw new Error('Cannot decrease tables count')

      const payload = {
        restaurant_id: restaurant.id,
        ...form,
        bank_ifsc: formattedIfsc,
        tables_count: newCount,
        default_tax_rate: Number(form.default_tax_rate) || 5,
        prices_include_tax: !!form.prices_include_tax,
        upi_id: form.upi_id.trim(),
      }
      // Upsert the profile data first (excluding route_account_id for now)
      const { error: upsertErr } = await supabase
        .from('restaurant_profiles')
        .upsert({
          ...payload,
          route_account_id: undefined // avoid overwriting route_account_id here
        }, { onConflict: 'restaurant_id' })
      if (upsertErr) throw upsertErr

      // Update restaurant name too
      await supabase.from('restaurants').update({ name: form.restaurant_name }).eq('id', restaurant.id)

      // If route_account_id not saved yet, create via Razorpay Route API
     if (!form.route_account_id) {
  const res = await fetch('/api/route/create-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      business_name: form.restaurant_name || form.legal_name,
      business_type: 'Individual', // Or collect from user input if variable
      beneficiary_name: form.bank_account_holder_name,
      account_number: form.bank_account_number,
      ifsc: form.bank_ifsc.toUpperCase(),
      email: form.bank_email || form.support_email,
      phone: form.bank_phone || form.phone,
      owner_id: restaurant.id,
    }),
  });

  if (!res.ok) {
    const errData = await res.json();
    throw new Error(errData.error || 'Failed to create linked Route account');
  }
  const { account_id } = await res.json();
  setForm(prev => ({ ...prev, route_account_id: account_id }));

  // Save in restaurants table
  const { error: updErr } = await supabase
    .from('restaurants')
    .update({ route_account_id: account_id })
    .eq('id', restaurant.id);

  if (updErr) console.warn('Failed to save route_account_id:', updErr.message);
}


      // Send notification emails for tables if needed
      const emailData = {
        restaurantName: form.restaurant_name,
        legalName: form.legal_name,
        phone: form.phone,
        email: form.support_email,
        address: `${form.shipping_address_line1}${form.shipping_address_line2 ? ', ' + form.shipping_address_line2 : ''}, ${form.shipping_city}, ${form.shipping_state} - ${form.shipping_pincode}`,
        tablesCount: newCount,
        tablePrefix: form.table_prefix,
      }
      if (isFirstTime) {
        const allCodes = generateQRArray(1, newCount)
        const ok = await sendEmail({ qrCodes: allCodes, data: emailData, incremental: false })
        setSuccess(ok ? 'Email sent for all tables' : 'Saved, but email failed')
      } else if (newCount > originalTables) {
        const newCodes = generateQRArray(originalTables + 1, newCount)
        const ok = await sendEmail({
          qrCodes: newCodes,
          data: {
            ...emailData,
            newTablesAdded: newCount - originalTables,
            fromTable: originalTables + 1,
            toTable: newCount,
          },
          incremental: true,
        })
        setSuccess(ok ? 'Email sent for new tables' : 'Saved, but email failed')
      } else {
        setSuccess('Settings saved')
      }

      setOriginalTables(newCount)
      setIsFirstTime(false)

    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const generateQRArray = (start, end) => {
    const arr = []
    const base = `${window.location.origin}/order?r=${restaurant.id}`
    for (let i = start; i <= end; i++) {
      arr.push({ tableNumber: `${form.table_prefix} ${i}`, qrUrl: `${base}&t=${i}`, tableId: i })
    }
    return arr
  }

  const sendEmail = async ({ qrCodes, data, incremental }) => {
    const res = await fetch('/api/send-qr-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodes, restaurantData: data, isIncremental: incremental }),
    })
    return res.ok
  }

  if (checking || loadingRestaurant) return <div>Loading…</div>
  if (loading) return <div>Loading settings…</div>

  return (
    <div className="container" style={{ padding: '20px 8px 40px' }}>
      <h1 className="h1">Restaurant Settings</h1>
      {error && (
        <Card padding={12} style={{ background: '#fee2e2', borderColor: '#fecaca' }}>
          <div style={{ color: '#b91c1c' }}>{error}</div>
        </Card>
      )}
      {success && (
        <Card padding={12} style={{ background: '#ecfdf5', borderColor: '#bbf7d0' }}>
          <div style={{ color: '#166534' }}>{success}</div>
        </Card>
      )}
      <form onSubmit={save} style={{ display: 'grid', gap: 24 }}>
        <Section title="Business Info" icon="🏢">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Legal Name" required>
              <input className="input" value={form.legal_name} onChange={onChange('legal_name')} />
            </Field>
            <Field label="Display Name" required>
              <input className="input" value={form.restaurant_name} onChange={onChange('restaurant_name')} />
            </Field>
            <Field label="Phone" required>
              <input className="input" type="tel" value={form.phone} onChange={onChange('phone')} style={{ fontSize: 16 }} />
            </Field>
            <Field label="Support Email" required>
              <input className="input" type="email" value={form.support_email} onChange={onChange('support_email')} style={{ fontSize: 16 }} />
            </Field>
          </div>
        </Section>
        <Section title="Bank Account Details" icon="🏦">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Account Holder Name" required>
              <input className="input" value={form.bank_account_holder_name} onChange={onChange('bank_account_holder_name')} />
            </Field>
            <Field label="Account Number" required>
              <input className="input" value={form.bank_account_number} onChange={onChange('bank_account_number')} />
            </Field>
            <Field label="IFSC Code" required hint="Example: HDFC0001234">
              <input className="input" value={form.bank_ifsc} onChange={onChange('bank_ifsc')} style={{ textTransform: 'uppercase' }} />
            </Field>
            <Field label="Email (optional)">
              <input className="input" type="email" value={form.bank_email} onChange={onChange('bank_email')} />
            </Field>
            <Field label="Phone (optional)">
              <input className="input" type="tel" value={form.bank_phone} onChange={onChange('bank_phone')} />
            </Field>
          </div>
        </Section>
        <Section title="Tax Info" icon="📋">
          <label>
            <input type="checkbox" checked={form.gst_enabled} onChange={onChange('gst_enabled')} /> GST Registered
          </label>
          <label>
            <input type="checkbox" checked={form.prices_include_tax} onChange={onChange('prices_include_tax')} /> Menu prices include tax
          </label>
          {form.gst_enabled && (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
              <Field label="GSTIN">
                <input className="input" value={form.gstin} onChange={onChange('gstin')} placeholder="22AAAAA0000A1Z5" />
              </Field>
              <Field label="Default Tax Rate (%)" hint="Applied if item does not override its own tax rate">
                <input className="input" type="number" min="0" step="0.01" value={form.default_tax_rate} onChange={onChange('default_tax_rate')} />
              </Field>
            </div>
          )}
        </Section>
        <Section title="Delivery Address" icon="📦">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Recipient" required>
              <input className="input" value={form.shipping_name} onChange={onChange('shipping_name')} />
            </Field>
            <Field label="Contact" required>
              <input className="input" type="tel" value={form.shipping_phone} onChange={onChange('shipping_phone')} style={{ fontSize: 16 }} />
            </Field>
          </div>
          <Field label="Address Line 1" required>
            <input className="input" value={form.shipping_address_line1} onChange={onChange('shipping_address_line1')} />
          </Field>
          <Field label="Address Line 2">
            <input className="input" value={form.shipping_address_line2} onChange={onChange('shipping_address_line2')} />
          </Field>
          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <Field label="City" required>
              <input className="input" value={form.shipping_city} onChange={onChange('shipping_city')} />
            </Field>
            <Field label="State" required>
              <input className="input" value={form.shipping_state} onChange={onChange('shipping_state')} />
            </Field>
            <Field label="Pincode" required>
              <input className="input" value={form.shipping_pincode} onChange={onChange('shipping_pincode')} style={{ fontSize: 16 }} />
            </Field>
          </div>
        </Section>
        <Section title="Operations" icon="⚙️">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Tables Count" required>
              <input className="input" type="number" min={originalTables || 0} max="100" value={form.tables_count} onChange={onChange('tables_count')} />
              {originalTables > 0 && <div className="muted" style={{ fontSize: 12 }}>Current: {originalTables}</div>}
            </Field>
            <Field label="Table Prefix">
              <input className="input" value={form.table_prefix} onChange={onChange('table_prefix')} placeholder="T" />
            </Field>
            <Field label="UPI ID" required>
              <input className="input" value={form.upi_id} onChange={onChange('upi_id')} placeholder="name@upi" />
            </Field>
          </div>
          <div style={{ background: '#eff6ff', padding: 12, border: '1px solid #bfdbfe', borderRadius: 8 }}>
            <span>ℹ️ Business hours in Availability tab</span>
          </div>
        </Section>
        <Section title="Brand & Web" icon="🎨">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Logo URL">
              <input className="input" type="url" value={form.brand_logo_url} onChange={onChange('brand_logo_url')} />
            </Field>
            <Field label="Brand Color">
              <input className="input" type="color" value={form.brand_color} onChange={onChange('brand_color')} />
            </Field>
            <Field label="Website URL">
              <input className="input" type="url" value={form.website_url} onChange={onChange('website_url')} />
            </Field>
            <Field label="Instagram">
              <input className="input" value={form.instagram_handle} onChange={onChange('instagram_handle')} />
            </Field>
            <Field label="Facebook">
              <input className="input" type="url" value={form.facebook_page} onChange={onChange('facebook_page')} />
            </Field>
          </div>
          <Field label="Description">
            <textarea className="input" rows="3" value={form.description} onChange={onChange('description')} />
          </Field>
        </Section>
        <Section title="Aggregator Integration Keys" icon="🔗">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Swiggy API Key">
              <input className="input" type="password" autoComplete="off" value={form.swiggy_api_key} onChange={onChange('swiggy_api_key')} />
            </Field>
            <Field label="Swiggy API Secret">
              <input className="input" type="password" autoComplete="off" value={form.swiggy_api_secret} onChange={onChange('swiggy_api_secret')} />
            </Field>
            <Field label="Swiggy Webhook Secret">
              <input className="input" type="password" autoComplete="off" value={form.swiggy_webhook_secret} onChange={onChange('swiggy_webhook_secret')} />
            </Field>
            <Field label="Zomato API Key">
              <input className="input" type="password" autoComplete="off" value={form.zomato_api_key} onChange={onChange('zomato_api_key')} />
            </Field>
            <Field label="Zomato API Secret">
              <input className="input" type="password" autoComplete="off" value={form.zomato_api_secret} onChange={onChange('zomato_api_secret')} />
            </Field>
            <Field label="Zomato Webhook Secret">
              <input className="input" type="password" autoComplete="off" value={form.zomato_webhook_secret} onChange={onChange('zomato_webhook_secret')} />
            </Field>
          </div>
        </Section>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isFirstTime ? 'Complete Setup' : 'Save Changes'}
          </Button>
        </div>
        <Section title="Kitchen Dashboard Link" icon="🔗">
          <Field label="Kitchen Dashboard URL">
            {restaurant?.id ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="input"
                  readOnly
                  value={`${window.location.origin}/kitchen?rid=${restaurant.id}`}
                  onFocus={(e) => e.target.select()}
                  style={{ flex: 1 }}
                />
                <Button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/kitchen?rid=${restaurant.id}`)
                    alert('Kitchen URL copied to clipboard')
                  }}
                >
                  Copy URL
                </Button>
              </div>
            ) : (
              <div>Loading link…</div>
            )}
          </Field>
        </Section>
      </form>
    </div>
  )
}
