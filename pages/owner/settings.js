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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
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
        {label}
        {required && ' *'}
      </label>
      {children}
      {hint && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {hint}
        </div>
      )}
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

  const safeTrim = (val) => (typeof val === 'string' ? val.trim() : val || '')


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
    // Bank Account Details
    bank_account_holder_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_email: '',
    bank_phone: '',
    route_account_id: '', // Razorpay linked account ID
    // KYC fields for Razorpay Route
    profile_category: 'food_and_beverages',
    profile_subcategory: 'restaurant',
    profile_address_street1: '',
    profile_address_street2: '',
    profile_address_city: '',
    profile_address_state: '',
    profile_address_pincode: '',
    profile_address_country: 'IN',
    legal_pan: '',
    legal_gst: '',
    beneficiary_name: '',
    business_type: 'individual', // default to individual
  })

  useEffect(() => {
    if (!restaurant?.id) return
    async function load() {
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
          setForm((prev) => ({
            ...prev,
            ...data,
            default_tax_rate: data.default_tax_rate ?? 5,
            prices_include_tax: data.prices_include_tax ?? true,
            profile_category: data.profile_category || 'food_and_beverages',
            profile_subcategory: data.profile_subcategory || 'restaurant',
            profile_address_country: data.profile_address_country || 'IN',
            business_type: data.business_type || 'individual',
            beneficiary_name: data.beneficiary_name || '',
          }))
          setOriginalTables(data.tables_count || 0)
        } else {
          setIsFirstTime(true)
        }
        const { data: restData, error: restErr } = await supabase
          .from('restaurants')
          .select('route_account_id')
          .eq('id', restaurant.id)
          .single()
        if (!restErr && restData) {
          setForm((prev) => ({
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

  const onChange = (field) => (e) => {
  const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
  setForm((prev) => {
    const updated = { ...prev, [field]: val }
    if (field === 'restaurant_name') {
      // Sync beneficiary_name whenever restaurant_name changes
      updated.beneficiary_name = val
    }
    return updated
  })
}


  const validateBusinessType = (val) => {
    const allowedTypes = [
      'individual',
      'private_limited',
      'proprietorship',
      'partnership',
      'llp',
      'trust',
      'society',
      'ngo',
      'public_limited',
    ]
    return allowedTypes.includes(val)
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const required = [
        'legal_name',
        'restaurant_name',
        'phone',
        'support_email',
        'upi_id',
        'shipping_name',
        'shipping_phone',
        'shipping_address_line1',
        'shipping_city',
        'shipping_state',
        'shipping_pincode',
        'bank_account_holder_name',
        'bank_account_number',
        'bank_ifsc',
        'profile_category',
        'profile_subcategory',
        'profile_address_street1',
        'profile_address_city',
        'profile_address_state',
        'profile_address_pincode',
        'profile_address_country',
        'legal_pan',
        'beneficiary_name',
        'business_type',
      ]
      const missing = required.filter((f) => !form[f] || safeTrim(form[f]) === '')
      if (missing.length) throw new Error(`Missing: ${missing.join(', ')}`)

      if (safeTrim(form.beneficiary_name) !== safeTrim(form.restaurant_name)) {
        throw new Error("'Beneficiary Name' must match 'Business Name'")
      }
      if (!validateBusinessType(form.business_type)) {
        throw new Error('Invalid Business Type selected')
      }

      const UPI_REGEX = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/
      if (!UPI_REGEX.test(safeTrim(form.upi_id)))
        throw new Error('Invalid UPI format. Example: name@bankhandle')

      const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
      const formattedIfsc = safeTrim(form.bank_ifsc).toUpperCase()
      if (!IFSC_REGEX.test(formattedIfsc)) throw new Error('Invalid IFSC code format.')

      const newCount = Number(form.tables_count)
      if (!isFirstTime && newCount < originalTables)
        throw new Error('Cannot decrease tables count')

      const payload = {
        restaurant_id: restaurant.id,
        ...form,
        bank_ifsc: formattedIfsc,
        tables_count: newCount,
        default_tax_rate: Number(form.default_tax_rate) || 5,
        prices_include_tax: !!form.prices_include_tax,
        upi_id: safeTrim(form.upi_id),
        beneficiary_name: safeTrim(form.beneficiary_name),
        business_type: safeTrim(form.business_type),
        profile_category: safeTrim(form.profile_category),
        profile_subcategory: safeTrim(form.profile_subcategory),
        profile_address_street1: safeTrim(form.profile_address_street1),
        profile_address_street2: safeTrim(form.profile_address_street2),
        profile_address_city: safeTrim(form.profile_address_city),
        profile_address_state: safeTrim(form.profile_address_state),
        profile_address_pincode: safeTrim(form.profile_address_pincode),
        profile_address_country: safeTrim(form.profile_address_country).toUpperCase(),
        legal_pan: safeTrim(form.legal_pan).toUpperCase(),
        legal_gst: safeTrim(form.legal_gst),
      }

      const { error: upsertErr } = await supabase
        .from('restaurant_profiles')
        .upsert(
          {
            ...payload,
            route_account_id: undefined,
          },
          { onConflict: 'restaurant_id' }
        )
      if (upsertErr) throw upsertErr

      await supabase
        .from('restaurants')
        .update({ name: form.restaurant_name })
        .eq('id', restaurant.id)

      if (!form.route_account_id) {
        const profile = {
          category: payload.profile_category,
          subcategory: payload.profile_subcategory,
          addresses: {
            registered: {
              street1: payload.profile_address_street1,
              street2: payload.profile_address_street2,
              city: payload.profile_address_city,
              state: payload.profile_address_state,
              postal_code: payload.profile_address_pincode,
              country: payload.profile_address_country,
            },
          },
        }
        const legal_info = {
          pan: payload.legal_pan,
        }
        if (form.gst_enabled && form.legal_gst) {
          legal_info.gst = payload.legal_gst.toUpperCase()
        }
        const res = await fetch('/api/route/create-account', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    business_name: form.restaurant_name || form.legal_name,
    display_name: form.restaurant_name,
    business_type: form.business_type,
    beneficiary_name: form.beneficiary_name, // should be synced to restaurant_name
    account_number: form.bank_account_number,
    ifsc: formattedIfsc,
    email: form.bank_email || form.support_email,
    phone: form.bank_phone || form.phone,
    owner_id: restaurant.id,
    profile,
    legal_info,
  }),
})
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to create linked Route account')
        }
        const { account_id } = await res.json()
        setForm((prev) => ({ ...prev, route_account_id: account_id }))
        const { error: updErr } = await supabase
          .from('restaurants')
          .update({ route_account_id: account_id })
          .eq('id', restaurant.id)
        if (updErr) console.warn('Failed to save route_account_id:', updErr.message)
      }

      // Email logic for tables (optional)
      const emailData = {
        restaurantName: form.restaurant_name,
        legalName: form.legal_name,
        phone: form.phone,
        email: form.support_email,
        address: `${form.shipping_address_line1}${
          form.shipping_address_line2 ? ', ' + form.shipping_address_line2 : ''
        }, ${form.shipping_city}, ${form.shipping_state} - ${form.shipping_pincode}`,
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
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}
          >
            <Field label="Legal Name" required>
              <input
                className="input"
                value={form.legal_name}
                onChange={onChange('legal_name')}
              />
            </Field>
            <Field label="Display Name" required>
              <input
                className="input"
                value={form.restaurant_name}
                onChange={onChange('restaurant_name')}
              />
            </Field>
            <Field label="Phone" required>
              <input
                className="input"
                type="tel"
                value={form.phone}
                onChange={onChange('phone')}
                style={{ fontSize: 16 }}
              />
            </Field>
            <Field label="Support Email" required>
              <input
                className="input"
                type="email"
                value={form.support_email}
                onChange={onChange('support_email')}
                style={{ fontSize: 16 }}
              />
            </Field>
          </div>
        </Section>
        <Section title="Bank Account Details" icon="🏦">
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}
          >
            <Field label="Account Holder Name" required>
              <input
                className="input"
                value={form.bank_account_holder_name}
                onChange={onChange('bank_account_holder_name')}
              />
            </Field>
            <Field label="Account Number" required>
              <input
                className="input"
                value={form.bank_account_number}
                onChange={onChange('bank_account_number')}
              />
            </Field>
            <Field label="IFSC Code" required hint="Example: HDFC0001234">
              <input
                className="input"
                value={form.bank_ifsc}
                onChange={onChange('bank_ifsc')}
                style={{ textTransform: 'uppercase' }}
              />
            </Field>
            <Field label="Email (optional)">
              <input
                className="input"
                type="email"
                value={form.bank_email}
                onChange={onChange('bank_email')}
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                className="input"
                type="tel"
                value={form.bank_phone}
                onChange={onChange('bank_phone')}
              />
            </Field>
          </div>
        </Section>
        <Section title="KYC Information" icon="📝">
          <Field label="Business Category" required>
            <select value={form.profile_category} onChange={onChange('profile_category')}>
              <option value="food_and_beverages">Food & Beverages</option>
              {/* Add more as needed */}
            </select>
          </Field>
          <Field label="Business Subcategory" required>
            <select value={form.profile_subcategory} onChange={onChange('profile_subcategory')}>
              <option value="restaurant">Restaurant</option>
              {/* Add more as needed */}
            </select>
          </Field>
          <Field label="Registered Address Line 1" required>
            <input
              className="input"
              value={form.profile_address_street1}
              onChange={onChange('profile_address_street1')}
            />
          </Field>
          <Field label="Registered Address Line 2">
            <input
              className="input"
              value={form.profile_address_street2}
              onChange={onChange('profile_address_street2')}
            />
          </Field>
          <div
            className="grid"
            style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}
          >
            <Field label="City" required>
              <input
                className="input"
                value={form.profile_address_city}
                onChange={onChange('profile_address_city')}
              />
            </Field>
            <Field label="State" required>
              <input
                className="input"
                value={form.profile_address_state}
                onChange={onChange('profile_address_state')}
              />
            </Field>
            <Field label="Pincode" required>
              <input
                className="input"
                value={form.profile_address_pincode}
                onChange={onChange('profile_address_pincode')}
              />
            </Field>
            <Field label="Country" required>
              <input
                className="input"
                value={form.profile_address_country}
                onChange={onChange('profile_address_country')}
              />
            </Field>
          </div>
          <Field label="PAN" required>
            <input
              className="input"
              value={form.legal_pan}
              onChange={onChange('legal_pan')}
              placeholder="ABCDE1234F"
            />
          </Field>
          {form.gst_enabled && (
            <Field label="GSTIN">
              <input
                className="input"
                value={form.legal_gst}
                onChange={onChange('legal_gst')}
                placeholder="22AAAAA0000A1Z5"
              />
            </Field>
          )}
          <Field label="Business Type" required hint="Select your business type">
            <select value={form.business_type} onChange={onChange('business_type')}>
              <option value="">-- Select --</option>
              <option value="individual">Individual</option>
              <option value="private_limited">Private Limited</option>
              <option value="proprietorship">Proprietorship</option>
              <option value="partnership">Partnership</option>
              <option value="llp">LLP</option>
              <option value="trust">Trust</option>
              <option value="society">Society</option>
              <option value="ngo">NGO</option>
              <option value="public_limited">Public Limited</option>
            </select>
          </Field>
          <Field label="Beneficiary Name" required hint="Must match Business Name">
            <input
              className="input"
              value={form.beneficiary_name}
              onChange={onChange('beneficiary_name')}
            />
          </Field>
        </Section>
        {/* Rest of your form sections for tax, delivery, etc. */}
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
                    navigator.clipboard.writeText(
                      `${window.location.origin}/kitchen?rid=${restaurant.id}`
                    )
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
