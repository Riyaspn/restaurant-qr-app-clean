import React, { useEffect, useState } from 'react';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import { supabase } from '../../services/supabase';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

function Section({ title, icon, children }) {
  return (
    <Card padding24>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <h3 style={{ margin: 0, fontSize: 18 }}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        {children}
      </div>
    </Card>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
      </label>
      {children}
      {hint && (
        <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { checking } = useRequireAuth();
  const { restaurant, loading: loadingRestaurant } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [routeAccountId, setRouteAccountId] = useState('');

  const [form, setForm] = useState({
    legal_name: '',
    restaurant_name: '',
    phone: '',
    support_email: '',
    gst_enabled: false,
    gstin: '',
    default_tax_rate: 5,
    prices_include_tax: true,
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
    online_payment_enabled: false,
    use_own_gateway: false,
    razorpay_key_id: '',
    razorpay_key_secret: '',
    bank_account_holder_name: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_email: '',
    bank_phone: '',
    profile_category: 'food_and_beverages',
    profile_subcategory: 'restaurant',
    business_type: 'individual',
    legal_pan: '',
    legal_gst: '',
    beneficiary_name: '',
    brand_logo_url: '',
    brand_color: '#1976d2',
    website_url: '',
    instagram_handle: '',
    facebook_page: '',
    description: '',
    useswiggy: false,
    swiggy_api_key: '',
    swiggy_api_secret: '',
    swiggy_webhook_secret: '',
    usezomato: false,
    zomato_api_key: '',
    zomato_api_secret: '',
    zomato_webhook_secret: '',
  });

  const [originalTables, setOriginalTables] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    if (!restaurant?.id) return;
    async function loadSettings() {
      setLoading(true);
      setError('');

      try {
        // Load profile
        const { data, error } = await supabase
          .from('restaurant_profiles')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .maybeSingle();
        if (error) throw error;

        if (data) {
          setForm(prev => ({
            ...prev,
            ...data,
            default_tax_rate: data.default_tax_rate ?? 5,
            prices_include_tax: data.prices_include_tax ?? true,
            profile_category: data.profile_category || 'food_and_beverages',
            profile_subcategory: data.profile_subcategory || 'restaurant',
            business_type: data.business_type || 'individual',
            online_payment_enabled: data.online_payment_enabled ?? false,
            use_own_gateway: data.use_own_gateway ?? false,
            useswiggy: !!(data.swiggy_api_key && data.swiggy_api_secret && data.swiggy_webhook_secret),
            usezomato: !!(data.zomato_api_key && data.zomato_api_secret && data.zomato_webhook_secret),
          }));
          setOriginalTables(data.tables_count || 0);
          setIsFirstTime(false);
        } else {
          setIsFirstTime(true);
        }

        // Load route_account_id
        const { data: restData, error: restErr } = await supabase
          .from('restaurants')
          .select('route_account_id')
          .eq('id', restaurant.id)
          .single();
        if (!restErr && restData?.route_account_id) {
          setRouteAccountId(restData.route_account_id);
        }
      } catch (e) {
        setError(e.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [restaurant?.id]);

  const onChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(prev => {
      const updated = { ...prev, [field]: val };
      if (field === 'legal_name') {
        updated.beneficiary_name = val;
        updated.bank_account_holder_name = val;
      }
      if (field === 'online_payment_enabled' && !val) {
        updated.use_own_gateway = false;
        updated.razorpay_key_id = '';
        updated.razorpay_key_secret = '';
      }
      if (field === 'use_own_gateway' && !val) {
        updated.razorpay_key_id = '';
        updated.razorpay_key_secret = '';
      }
      if (field === 'useswiggy' && !val) {
        updated.swiggy_api_key = '';
        updated.swiggy_api_secret = '';
        updated.swiggy_webhook_secret = '';
      }
      if (field === 'usezomato' && !val) {
        updated.zomato_api_key = '';
        updated.zomato_api_secret = '';
        updated.zomato_webhook_secret = '';
      }
      if (field === 'gst_enabled' && !val) {
        updated.gstin = '';
        updated.legal_gst = '';
      }
      return updated;
    });
  };

  const validatebusiness_type = (val) => {
    const allowed = ['individual','private_limited','proprietorship','partnership','llp','trust','society','ngo','public_limited'];
    return allowed.includes(val);
  };
  const validateUPI = (upi) => /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi.trim());
  const validateIFSC = (ifsc) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase());

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const required = ['legal_name','restaurant_name','phone','support_email'];
      if (form.online_payment_enabled) {
        if (form.use_own_gateway) {
          required.push('razorpay_key_id','razorpay_key_secret');
        } else {
          required.push('bank_account_holder_name','bank_account_number','bank_ifsc','beneficiary_name','business_type','legal_pan');
        }
      }
      const missing = required.filter(f => !form[f] || !form[f].toString().trim());
      if (missing.length) throw new Error(`Missing required fields: ${missing.join(', ')}`);

      if (form.online_payment_enabled && !form.use_own_gateway) {
        if (form.beneficiary_name.trim() !== form.legal_name.trim()) {
          throw new Error('Beneficiary Name must match Legal Name');
        }
        if (!validatebusiness_type(form.business_type)) {
          throw new Error('Invalid business type selected');
        }
        if (!validateIFSC(form.bank_ifsc)) {
          throw new Error('Invalid IFSC code format');
        }
      }
      if (form.upi_id && !validateUPI(form.upi_id)) {
        throw new Error('Invalid UPI format. Example: name@bankhandle');
      }
      const newTableCount = Number(form.tables_count);
      if (!isFirstTime && newTableCount < originalTables) {
        throw new Error('Cannot decrease number of tables');
      }

      const {
        // omit any routeaccountid
        ...profileForm
      } = form;

      const payload = {
        restaurant_id: restaurant.id,
        ...profileForm,
        bank_ifsc: form.bank_ifsc.trim().toUpperCase(),
        default_tax_rate: Number(form.default_tax_rate) || 5,
        prices_include_tax: !!form.prices_include_tax,
        online_payment_enabled: !!form.online_payment_enabled,
        use_own_gateway: !!form.use_own_gateway,
        legal_pan: form.legal_pan.trim().toUpperCase(),
        beneficiary_name: form.beneficiary_name.trim(),
        business_type: form.business_type,
        tables_count: newTableCount,
        upi_id: form.upi_id.trim(),
      };

      const { error: upsertError } = await supabase
        .from('restaurant_profiles')
        .upsert(payload, { onConflict: 'restaurant_id' });
      if (upsertError) throw upsertError;

      await supabase
        .from('restaurants')
        .update({ name: form.restaurant_name })
        .eq('id', restaurant.id);

      // Create route account if needed
      if (form.online_payment_enabled && !form.use_own_gateway && !routeAccountId) {
        const profile = {
          category: payload.profile_category,
          subcategory: payload.profile_subcategory,
          addresses: {
            registered: {
              street1: form.shipping_address_line1.trim(),
              street2: form.shipping_address_line2.trim(),
              city: form.shipping_city.trim(),
              state: form.shipping_state.trim(),
              postal_code: form.shipping_pincode.trim(),
              country: 'IN',
            },
          },
        };
        const legalInfo = { pan: payload.legal_pan };
        if (form.gst_enabled && form.legal_gst.trim()) {
          legalInfo.gst = form.legal_gst.trim().toUpperCase();
        }
        const resp = await fetch('/api/route/create-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            legal_name: form.legal_name,
            beneficiary_name: form.beneficiary_name,
            display_name: form.restaurant_name,
            business_type: form.business_type,
            account_number: form.bank_account_number,
            ifsc: payload.bank_ifsc,
            email: form.bank_email?.trim() || form.support_email.trim(),
            phone: form.bank_phone?.trim() || form.phone.trim(),
            owner_id: restaurant.id,
            profile,
            legal_info: legalInfo,
          }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || 'Failed to create linked Route account');
        }
        const accountId = await resp.json();
        setRouteAccountId(accountId);
        await supabase
          .from('restaurants')
          .update({ route_account_id: accountId })
          .eq('id', restaurant.id);
      }

      setOriginalTables(newTableCount);
      setIsFirstTime(false);
      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (checking || loadingRestaurant) return <div>Loading...</div>;
  if (loading) return <div>Loading settings...</div>;

  return (
    <div className="container" style={{ padding: '20px' }}>
      <h1 className="h1">Restaurant Settings</h1>
      {error && (
        <Card padding12 style={{ background: '#fee2e2', borderColor: '#fca5a5', marginBottom: '16px' }}>
          <div style={{ color: '#b91c1c' }}>{error}</div>
        </Card>
      )}
      {success && (
        <Card padding12 style={{ background: '#ecfdf5', borderColor: '#34d399', marginBottom: '16px' }}>
          <div style={{ color: '#065f46' }}>{success}</div>
        </Card>
      )}

      <form onSubmit={save} style={{ display: 'grid', gap: 24 }}>
        
        {/* Business Information */}
        <Section title="Business Info" icon="🏢">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Legal Name" required>
              <input 
                className="input" 
                value={form.legal_name} 
                onChange={onChange('legal_name')} 
              />
            </Field>
            
            <Field label="Display Name" required hint="Shown to customers">
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

        {/* Payment Gateway Setup */}
        <Section title="Payment Gateway Setup" icon="💳">
          <Field label="Enable Online Payments?" required>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <label>
                <input 
                  type="radio" 
                  name="online_payment_enabled" 
                  checked={form.online_payment_enabled === true} 
                  onChange={() => setForm(prev => ({ ...prev, online_payment_enabled: true }))} 
                />
                Yes
              </label>
              <label>
                <input 
                  type="radio" 
                  name="online_payment_enabled" 
                  checked={form.online_payment_enabled === false} 
                  onChange={() => setForm(prev => ({ 
                    ...prev, 
                    online_payment_enabled: false, 
                    use_own_gateway: false,
                    razorpay_key_id: '',
                    razorpay_key_secret: ''
                  }))} 
                />
                No
              </label>
            </div>
          </Field>

          {form.online_payment_enabled && (
            <>
              <Field label="Use Your Own Payment Gateway?" required>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <label>
                    <input 
                      type="radio" 
                      name="use_own_gateway" 
                      checked={form.use_own_gateway === true} 
                      onChange={() => setForm(prev => ({ ...prev, use_own_gateway: true }))} 
                    />
                    Yes (BYO Gateway)
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="use_own_gateway" 
                      checked={form.use_own_gateway === false} 
                      onChange={() => setForm(prev => ({ 
                        ...prev, 
                        use_own_gateway: false,
                        razorpay_key_id: '',
                        razorpay_key_secret: ''
                      }))} 
                    />
                    No (Use platform gateway)
                  </label>
                </div>
              </Field>

              {form.use_own_gateway && (
                <Section title="Razorpay Account" icon="🔑">
                  <Field label="Razorpay Key ID" required>
                    <input 
                      className="input" 
                      value={form.razorpay_key_id} 
                      onChange={onChange('razorpay_key_id')} 
                      placeholder="rzp_test_..."
                    />
                  </Field>
                  
                  <Field label="Razorpay Key Secret" required>
                    <input 
                      className="input" 
                      type="password" 
                      value={form.razorpay_key_secret} 
                      onChange={onChange('razorpay_key_secret')} 
                    />
                  </Field>
                  
                  <div style={{ fontSize: 14, marginTop: 12 }}>
                    Creating your own Razorpay account requires KYC, which may have additional charges.
                  </div>
                </Section>
              )}

              {!form.use_own_gateway && (
                <>
                  {/* Bank Account Details */}
                  <Section title="Bank Details & KYC" icon="🏦">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
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
                      
                      <Field label="Email" hint="Optional">
                        <input 
                          className="input" 
                          type="email" 
                          value={form.bank_email} 
                          onChange={onChange('bank_email')} 
                        />
                      </Field>
                      
                      <Field label="Phone" hint="Optional">
                        <input 
                          className="input" 
                          type="tel" 
                          value={form.bank_phone} 
                          onChange={onChange('bank_phone')} 
                        />
                      </Field>
                    </div>
                  </Section>

                  {/* KYC Information */}
                  <Section title="KYC Information" icon="📋">
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

                    <Field label="PAN" required>
                      <input 
                        className="input" 
                        value={form.legal_pan} 
                        onChange={onChange('legal_pan')} 
                        placeholder="ABCDE1234F" 
                        style={{ textTransform: 'uppercase' }}
                      />
                    </Field>

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

                    <Field label="Beneficiary Name" required hint="Auto-synced from Legal Name">
                      <input 
                        className="input" 
                        value={form.beneficiary_name} 
                        readOnly 
                        style={{ backgroundColor: '#f9fafb', cursor: 'not-allowed' }}
                      />
                    </Field>
                  </Section>
                </>
              )}
            </>
          )}
        </Section>

        {/* Tax Settings */}
        <Section title="Tax Settings" icon="📊">
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <input 
              type="checkbox" 
              id="gst_enabled" 
              checked={form.gst_enabled} 
              onChange={onChange('gst_enabled')} 
            />
            <label htmlFor="gst_enabled" style={{ marginLeft: 6 }}>
              Enable GST
            </label>
          </div>

          {form.gst_enabled && (
            <>
              <Field label="GSTIN">
                <input 
                  className="input" 
                  value={form.gstin} 
                  onChange={onChange('gstin')} 
                  placeholder="22AAAAA0000A1Z5" 
                  style={{ textTransform: 'uppercase' }}
                />
              </Field>

              <Field label="GST Number (if different)">
                <input 
                  className="input" 
                  value={form.legal_gst} 
                  onChange={onChange('legal_gst')} 
                  style={{ textTransform: 'uppercase' }}
                />
              </Field>
            </>
          )}

          <div style={{ display: 'flex', gap: 24 }}>
            <Field label="Default Tax Rate" required>
              <input 
                className="input" 
                type="number" 
                min="0" 
                max="100" 
                step="0.1" 
                value={form.default_tax_rate} 
                onChange={onChange('default_tax_rate')} 
              />
            </Field>
            
            <Field label="Prices Include Tax" required>
              <select value={form.prices_include_tax} onChange={onChange('prices_include_tax')}>
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </select>
            </Field>
          </div>
        </Section>

        {/* Delivery Address */}
        <Section title="Delivery Address" icon="📍">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Recipient" required>
              <input 
                className="input" 
                value={form.shipping_name} 
                onChange={onChange('shipping_name')} 
              />
            </Field>
            
            <Field label="Contact" required>
              <input 
                className="input" 
                type="tel" 
                value={form.shipping_phone} 
                onChange={onChange('shipping_phone')} 
                style={{ fontSize: 16 }}
              />
            </Field>
          </div>

          <Field label="Address Line 1" required>
            <input 
              className="input" 
              value={form.shipping_address_line1} 
              onChange={onChange('shipping_address_line1')} 
            />
          </Field>
          
          <Field label="Address Line 2">
            <input 
              className="input" 
              value={form.shipping_address_line2} 
              onChange={onChange('shipping_address_line2')} 
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <Field label="City" required>
              <input 
                className="input" 
                value={form.shipping_city} 
                onChange={onChange('shipping_city')} 
              />
            </Field>
            
            <Field label="State" required>
              <input 
                className="input" 
                value={form.shipping_state} 
                onChange={onChange('shipping_state')} 
              />
            </Field>
            
            <Field label="Pincode" required>
              <input 
                className="input" 
                value={form.shipping_pincode} 
                onChange={onChange('shipping_pincode')} 
                style={{ fontSize: 16 }}
              />
            </Field>
          </div>
        </Section>

        {/* Operations */}
        <Section title="Operations" icon="⚙️">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Tables Count" required>
              <input 
                className="input" 
                type="number" 
                min={originalTables || 0} 
                max="100" 
                value={form.tables_count} 
                onChange={onChange('tables_count')} 
              />
              {originalTables > 0 && (
                <div className="muted" style={{ fontSize: 12 }}>
                  Current: {originalTables}
                </div>
              )}
            </Field>
            
            <Field label="Table Prefix" hint="e.g. T for T1, T2">
              <input 
                className="input" 
                maxLength="3" 
                value={form.table_prefix} 
                onChange={onChange('table_prefix')} 
                placeholder="T" 
              />
            </Field>
            
            <Field label="UPI ID" required>
              <input 
                className="input" 
                value={form.upi_id} 
                onChange={onChange('upi_id')} 
                placeholder="name@upi" 
              />
            </Field>
          </div>

          <div style={{ background: '#eff6ff', padding: 12, border: '1px solid #bfdbfe', borderRadius: 8 }}>
            <span>Business hours in Availability tab</span>
          </div>
        </Section>

        {/* Brand & Web */}
        <Section title="Brand & Web" icon="🎨">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            <Field label="Logo URL">
              <input 
                className="input" 
                type="url" 
                value={form.brand_logo_url} 
                onChange={onChange('brand_logo_url')} 
              />
            </Field>
            
            <Field label="Brand Color">
              <input 
                className="input" 
                type="color" 
                value={form.brand_color} 
                onChange={onChange('brand_color')} 
              />
            </Field>
            
            <Field label="Website URL">
              <input 
                className="input" 
                type="url" 
                value={form.website_url} 
                onChange={onChange('website_url')} 
              />
            </Field>
            
            <Field label="Instagram">
              <input 
                className="input" 
                value={form.instagram_handle} 
                onChange={onChange('instagram_handle')} 
              />
            </Field>
            
            <Field label="Facebook">
              <input 
                className="input" 
                type="url" 
                value={form.facebook_page} 
                onChange={onChange('facebook_page')} 
              />
            </Field>
          </div>

          <Field label="Description">
            <textarea 
              className="input" 
              rows="3" 
              value={form.description} 
              onChange={onChange('description')} 
            />
          </Field>
        </Section>

        {/* Third-party Integrations */}
<Section title="Third-party Integrations" icon="🔗">
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
    <input
      type="checkbox"
      id="useswiggy"
      checked={form.useswiggy}
      onChange={onChange('useswiggy')}
    />
    <label htmlFor="useswiggy" style={{ marginLeft: 6 }}>
      Enable Swiggy Integration
    </label>
  </div>
  {form.useswiggy && (
    <>
      <Field label="Swiggy API Key" required>
        <input
          className="input"
          value={form.swiggy_api_key}
          onChange={onChange('swiggy_api_key')}
        />
      </Field>

      <Field label="Swiggy API Secret" required>
        <input
          type="password"
          className="input"
          value={form.swiggy_api_secret}
          onChange={onChange('swiggy_api_secret')}
        />
      </Field>

      <Field label="Swiggy Webhook Secret" required>
        <input
          type="password"
          className="input"
          value={form.swiggy_webhook_secret}
          onChange={onChange('swiggy_webhook_secret')}
        />
      </Field>
    </>
  )}

  <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 12px' }}>
    <input
      type="checkbox"
      id="usezomato"
      checked={form.usezomato}
      onChange={onChange('usezomato')}
    />
    <label htmlFor="usezomato" style={{ marginLeft: 6 }}>
      Enable Zomato Integration
    </label>
  </div>
  {form.usezomato && (
    <>
      <Field label="Zomato API Key" required>
        <input
          className="input"
          value={form.zomato_api_key}
          onChange={onChange('zomato_api_key')}
        />
      </Field>

      <Field label="Zomato API Secret" required>
        <input
          type="password"
          className="input"
          value={form.zomato_api_secret}
          onChange={onChange('zomato_api_secret')}
        />
      </Field>

      <Field label="Zomato Webhook Secret" required>
        <input
          type="password"
          className="input"
          value={form.zomato_webhook_secret}
          onChange={onChange('zomato_webhook_secret')}
        />
      </Field>
    </>
  )}
</Section>

{/* Save Button */}
<div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
  <Button disabled={saving} type="submit">
    {saving ? 'Saving...' : (isFirstTime ? 'Complete Setup' : 'Save Changes')}
  </Button>
</div>


      </form>

      {/* Kitchen Dashboard Link */}
      <Section title="Kitchen Dashboard Link" icon="👨‍🍳">
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
                  navigator.clipboard.writeText(`${window.location.origin}/kitchen?rid=${restaurant.id}`);
                  alert('Kitchen URL copied to clipboard!');
                }}
              >
                Copy URL
              </Button>
            </div>
          ) : (
            <div>Loading link...</div>
          )}
        </Field>
      </Section>
    </div>
  );
}
