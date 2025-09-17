import React, { useEffect, useState } from 'react';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import supabase from '../../services/supabase';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

// Helper components that follow existing patterns
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
  
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    // Business Information
    legalname: '',
    restaurantname: '',
    phone: '',
    supportemail: '',
    
    // Tax Settings
    gstenabled: false,
    gstin: '',
    defaulttaxrate: 5,
    pricesincludetax: true,
    
    // Delivery Address
    shippingname: '',
    shippingphone: '',
    shippingaddressline1: '',
    shippingaddressline2: '',
    shippingcity: '',
    shippingstate: '',
    shippingpincode: '',
    
    // Operations
    tablescount: 0,
    tableprefix: 'T',
    upiid: '',
    
    // Payment Gateway Settings
    onlinepaymentenabled: false,
    useowngateway: false,
    razorpaykeyid: '',
    razorpaykeysecret: '',
    
    // Bank Account Details
    bankaccountholdername: '',
    bankaccountnumber: '',
    bankifsc: '',
    bankemail: '',
    bankphone: '',
    
    // KYC Information
    profilecategory: 'food_and_beverages',
    profilesubcategory: 'restaurant',
    businesstype: 'individual',
    legalpan: '',
    legalgst: '',
    beneficiaryname: '',
    
    // Brand & Web
    brandlogourl: '',
    brandcolor: '#1976d2',
    websiteurl: '',
    instagramhandle: '',
    facebookpage: '',
    description: '',
    
    // Third-party Integrations
    useswiggy: false,
    swiggyapikey: '',
    swiggyapisecret: '',
    swiggywebhooksecret: '',
    
    usezomato: false,
    zomatoapikey: '',
    zomatoapisecret: '',
    zomatowebhooksecret: '',
  });

  // Track original table count for validation
  const [originalTables, setOriginalTables] = useState(0);
  const [isFirstTime, setIsFirstTime] = useState(false);

  // Load existing settings
  useEffect(() => {
    if (!restaurant?.id) return;

    async function loadSettings() {
      setLoading(true);
      setError('');
      
      try {
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
            defaulttaxrate: data.defaulttaxrate ?? 5,
            pricesincludetax: data.pricesincludetax ?? true,
            profilecategory: data.profilecategory || 'food_and_beverages',
            profilesubcategory: data.profilesubcategory || 'restaurant',
            businesstype: data.businesstype || 'individual',
            onlinepaymentenabled: data.onlinepaymentenabled ?? false,
            useowngateway: data.useowngateway ?? false,
            useswiggy: !!(data.swiggyapikey && data.swiggyapisecret && data.swiggywebhooksecret),
            usezomato: !!(data.zomatoapikey && data.zomatoapisecret && data.zomatowebhooksecret),
          }));
          setOriginalTables(data.tablescount || 0);
          setIsFirstTime(false);
        } else {
          setIsFirstTime(true);
        }

        // Load route account ID from restaurants table
        const { data: restData, error: restErr } = await supabase
          .from('restaurants')
          .select('route_account_id')
          .eq('id', restaurant.id)
          .single();

        if (!restErr && restData) {
          setForm(prev => ({ ...prev, routeaccountid: restData.route_account_id }));
        }
      } catch (e) {
        setError(e.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [restaurant?.id]);

  // Handle form changes
  const onChange = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    
    setForm(prev => {
      const updated = { ...prev, [field]: val };
      
      // Auto-sync certain fields
      if (field === 'legalname') {
        updated.beneficiaryname = val;
        updated.bankaccountholdername = val;
      }
      
      if (field === 'onlinepaymentenabled' && !val) {
        // Reset payment details when disabling
        updated.useowngateway = false;
        updated.razorpaykeyid = '';
        updated.razorpaykeysecret = '';
      }
      
      if (field === 'useowngateway' && !val) {
        // Clear razorpay keys if switched off
        updated.razorpaykeyid = '';
        updated.razorpaykeysecret = '';
      }
      
      // Toggle integrations
      if (field === 'useswiggy' && !val) {
        updated.swiggyapikey = '';
        updated.swiggyapisecret = '';
        updated.swiggywebhooksecret = '';
      }
      
      if (field === 'usezomato' && !val) {
        updated.zomatoapikey = '';
        updated.zomatoapisecret = '';
        updated.zomatowebhooksecret = '';
      }
      
      // GST enabled toggle
      if (field === 'gstenabled' && !val) {
        updated.gstin = '';
        updated.legalgst = '';
      }
      
      return updated;
    });
  };

  // Validation helpers
  const validateBusinessType = (val) => {
    const allowed = ['individual', 'private_limited', 'proprietorship', 'partnership', 'llp', 'trust', 'society', 'ngo', 'public_limited'];
    return allowed.includes(val);
  };

  const validateUPI = (upi) => {
    const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    return UPI_REGEX.test(upi.trim());
  };

  const validateIFSC = (ifsc) => {
    const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return IFSC_REGEX.test(ifsc.trim().toUpperCase());
  };

  // Save form data
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Required field validation
      const required = ['legalname', 'restaurantname', 'phone', 'supportemail'];
      
      if (form.onlinepaymentenabled) {
        if (form.useowngateway) {
          required.push('razorpaykeyid', 'razorpaykeysecret');
        } else {
          required.push('bankaccountholdername', 'bankaccountnumber', 'bankifsc', 'beneficiaryname', 'businesstype', 'legalpan');
        }
      }

      const missing = required.filter(f => !form[f] || !form[f].toString().trim());
      if (missing.length) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      // Field-specific validation
      if (form.onlinepaymentenabled && !form.useowngateway) {
        if (form.beneficiaryname.trim() !== form.legalname.trim()) {
          throw new Error('Beneficiary Name must match Legal Name');
        }
        
        if (!validateBusinessType(form.businesstype)) {
          throw new Error('Invalid business type selected');
        }
        
        if (!validateIFSC(form.bankifsc)) {
          throw new Error('Invalid IFSC code format');
        }
      }

      if (form.upiid && !validateUPI(form.upiid)) {
        throw new Error('Invalid UPI format. Example: name@bankhandle');
      }

      // Table count validation
      const newTableCount = Number(form.tablescount);
      if (!isFirstTime && newTableCount < originalTables) {
        throw new Error('Cannot decrease number of tables');
      }

      // Prepare payload
      const payload = {
        restaurant_id: restaurant.id,
        ...form,
        bankifsc: form.bankifsc.trim().toUpperCase(),
        defaulttaxrate: Number(form.defaulttaxrate) || 5,
        pricesincludetax: !!form.pricesincludetax,
        onlinepaymentenabled: !!form.onlinepaymentenabled,
        useowngateway: !!form.useowngateway,
        legalpan: form.legalpan.trim().toUpperCase(),
        beneficiaryname: form.beneficiaryname.trim(),
        businesstype: form.businesstype,
        tablescount: newTableCount,
        upiid: form.upiid.trim(),
      };

      // Upsert profile data
      const { error: upsertError } = await supabase
        .from('restaurant_profiles')
        .upsert(payload, { onConflict: 'restaurant_id' });

      if (upsertError) throw upsertError;

      // Update restaurant name
      await supabase
        .from('restaurants')
        .update({ name: form.restaurantname })
        .eq('id', restaurant.id);

      // Handle route account creation if needed
      if (form.onlinepaymentenabled && !form.useowngateway && !form.routeaccountid) {
        const profile = {
          category: payload.profilecategory,
          subcategory: payload.profilesubcategory,
          addresses: {
            registered: {
              street1: form.shippingaddressline1.trim(),
              street2: form.shippingaddressline2.trim(),
              city: form.shippingcity.trim(),
              state: form.shippingstate.trim(),
              postal_code: form.shippingpincode.trim(),
              country: 'IN',
            },
          },
        };

        const legalInfo = {
          pan: payload.legalpan,
        };

        if (form.gstenabled && form.legalgst.trim()) {
          legalInfo.gst = form.legalgst.trim().toUpperCase();
        }

        const response = await fetch('/api/route/create-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            legal_name: form.legalname,
            beneficiary_name: form.beneficiaryname,
            display_name: form.restaurantname,
            business_type: form.businesstype,
            account_number: form.bankaccountnumber,
            ifsc: payload.bankifsc,
            email: form.bankemail?.trim() || form.supportemail.trim(),
            phone: form.bankphone?.trim() || form.phone.trim(),
            owner_id: restaurant.id,
            profile,
            legal_info: legalInfo,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create linked Route account');
        }

        const accountId = await response.json();
        setForm(prev => ({ ...prev, routeaccountid: accountId }));

        const { error: updErr } = await supabase
          .from('restaurants')
          .update({ route_account_id: accountId })
          .eq('id', restaurant.id);

        if (updErr) {
          console.warn('Failed to save route_account_id:', updErr.message);
        }
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

      {/* Error/Success Messages */}
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
                value={form.legalname} 
                onChange={onChange('legalname')} 
              />
            </Field>
            
            <Field label="Display Name" required hint="Shown to customers">
              <input 
                className="input" 
                value={form.restaurantname} 
                onChange={onChange('restaurantname')} 
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
                value={form.supportemail} 
                onChange={onChange('supportemail')} 
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
                  name="onlinepaymentenabled" 
                  checked={form.onlinepaymentenabled === true} 
                  onChange={() => setForm(prev => ({ ...prev, onlinepaymentenabled: true }))} 
                />
                Yes
              </label>
              <label>
                <input 
                  type="radio" 
                  name="onlinepaymentenabled" 
                  checked={form.onlinepaymentenabled === false} 
                  onChange={() => setForm(prev => ({ 
                    ...prev, 
                    onlinepaymentenabled: false, 
                    useowngateway: false,
                    razorpaykeyid: '',
                    razorpaykeysecret: ''
                  }))} 
                />
                No
              </label>
            </div>
          </Field>

          {form.onlinepaymentenabled && (
            <>
              <Field label="Use Your Own Payment Gateway?" required>
                <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                  <label>
                    <input 
                      type="radio" 
                      name="useowngateway" 
                      checked={form.useowngateway === true} 
                      onChange={() => setForm(prev => ({ ...prev, useowngateway: true }))} 
                    />
                    Yes (BYO Gateway)
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="useowngateway" 
                      checked={form.useowngateway === false} 
                      onChange={() => setForm(prev => ({ 
                        ...prev, 
                        useowngateway: false,
                        razorpaykeyid: '',
                        razorpaykeysecret: ''
                      }))} 
                    />
                    No (Use platform gateway)
                  </label>
                </div>
              </Field>

              {form.useowngateway && (
                <Section title="Razorpay Account" icon="🔑">
                  <Field label="Razorpay Key ID" required>
                    <input 
                      className="input" 
                      value={form.razorpaykeyid} 
                      onChange={onChange('razorpaykeyid')} 
                      placeholder="rzp_test_..."
                    />
                  </Field>
                  
                  <Field label="Razorpay Key Secret" required>
                    <input 
                      className="input" 
                      type="password" 
                      value={form.razorpaykeysecret} 
                      onChange={onChange('razorpaykeysecret')} 
                    />
                  </Field>
                  
                  <div style={{ fontSize: 14, marginTop: 12 }}>
                    Creating your own Razorpay account requires KYC, which may have additional charges.
                  </div>
                </Section>
              )}

              {!form.useowngateway && (
                <>
                  {/* Bank Account Details */}
                  <Section title="Bank Details & KYC" icon="🏦">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
                      <Field label="Account Holder Name" required>
                        <input 
                          className="input" 
                          value={form.bankaccountholdername} 
                          onChange={onChange('bankaccountholdername')} 
                        />
                      </Field>
                      
                      <Field label="Account Number" required>
                        <input 
                          className="input" 
                          value={form.bankaccountnumber} 
                          onChange={onChange('bankaccountnumber')} 
                        />
                      </Field>
                      
                      <Field label="IFSC Code" required hint="Example: HDFC0001234">
                        <input 
                          className="input" 
                          value={form.bankifsc} 
                          onChange={onChange('bankifsc')} 
                          style={{ textTransform: 'uppercase' }}
                        />
                      </Field>
                      
                      <Field label="Email" hint="Optional">
                        <input 
                          className="input" 
                          type="email" 
                          value={form.bankemail} 
                          onChange={onChange('bankemail')} 
                        />
                      </Field>
                      
                      <Field label="Phone" hint="Optional">
                        <input 
                          className="input" 
                          type="tel" 
                          value={form.bankphone} 
                          onChange={onChange('bankphone')} 
                        />
                      </Field>
                    </div>
                  </Section>

                  {/* KYC Information */}
                  <Section title="KYC Information" icon="📋">
                    <Field label="Business Category" required>
                      <select value={form.profilecategory} onChange={onChange('profilecategory')}>
                        <option value="food_and_beverages">Food & Beverages</option>
                        {/* Add more as needed */}
                      </select>
                    </Field>
                    
                    <Field label="Business Subcategory" required>
                      <select value={form.profilesubcategory} onChange={onChange('profilesubcategory')}>
                        <option value="restaurant">Restaurant</option>
                        {/* Add more as needed */}
                      </select>
                    </Field>

                    <Field label="PAN" required>
                      <input 
                        className="input" 
                        value={form.legalpan} 
                        onChange={onChange('legalpan')} 
                        placeholder="ABCDE1234F" 
                        style={{ textTransform: 'uppercase' }}
                      />
                    </Field>

                    <Field label="Business Type" required hint="Select your business type">
                      <select value={form.businesstype} onChange={onChange('businesstype')}>
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
                        value={form.beneficiaryname} 
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
              id="gstenabled" 
              checked={form.gstenabled} 
              onChange={onChange('gstenabled')} 
            />
            <label htmlFor="gstenabled" style={{ marginLeft: 6 }}>
              Enable GST
            </label>
          </div>

          {form.gstenabled && (
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
                  value={form.legalgst} 
                  onChange={onChange('legalgst')} 
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
                value={form.defaulttaxrate} 
                onChange={onChange('defaulttaxrate')} 
              />
            </Field>
            
            <Field label="Prices Include Tax" required>
              <select value={form.pricesincludetax} onChange={onChange('pricesincludetax')}>
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
                value={form.shippingname} 
                onChange={onChange('shippingname')} 
              />
            </Field>
            
            <Field label="Contact" required>
              <input 
                className="input" 
                type="tel" 
                value={form.shippingphone} 
                onChange={onChange('shippingphone')} 
                style={{ fontSize: 16 }}
              />
            </Field>
          </div>

          <Field label="Address Line 1" required>
            <input 
              className="input" 
              value={form.shippingaddressline1} 
              onChange={onChange('shippingaddressline1')} 
            />
          </Field>
          
          <Field label="Address Line 2">
            <input 
              className="input" 
              value={form.shippingaddressline2} 
              onChange={onChange('shippingaddressline2')} 
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 16 }}>
            <Field label="City" required>
              <input 
                className="input" 
                value={form.shippingcity} 
                onChange={onChange('shippingcity')} 
              />
            </Field>
            
            <Field label="State" required>
              <input 
                className="input" 
                value={form.shippingstate} 
                onChange={onChange('shippingstate')} 
              />
            </Field>
            
            <Field label="Pincode" required>
              <input 
                className="input" 
                value={form.shippingpincode} 
                onChange={onChange('shippingpincode')} 
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
                value={form.tablescount} 
                onChange={onChange('tablescount')} 
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
                value={form.tableprefix} 
                onChange={onChange('tableprefix')} 
                placeholder="T" 
              />
            </Field>
            
            <Field label="UPI ID" required>
              <input 
                className="input" 
                value={form.upiid} 
                onChange={onChange('upiid')} 
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
                value={form.brandlogourl} 
                onChange={onChange('brandlogourl')} 
              />
            </Field>
            
            <Field label="Brand Color">
              <input 
                className="input" 
                type="color" 
                value={form.brandcolor} 
                onChange={onChange('brandcolor')} 
              />
            </Field>
            
            <Field label="Website URL">
              <input 
                className="input" 
                type="url" 
                value={form.websiteurl} 
                onChange={onChange('websiteurl')} 
              />
            </Field>
            
            <Field label="Instagram">
              <input 
                className="input" 
                value={form.instagramhandle} 
                onChange={onChange('instagramhandle')} 
              />
            </Field>
            
            <Field label="Facebook">
              <input 
                className="input" 
                type="url" 
                value={form.facebookpage} 
                onChange={onChange('facebookpage')} 
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
              <Field label="Swiggy API Key">
                <input 
                  className="input" 
                  value={form.swiggyapikey} 
                  onChange={onChange('swiggyapikey')} 
                />
              </Field>
              
              <Field label="Swiggy API Secret">
                <input 
                  type="password" 
                  className="input" 
                  value={form.swiggyapisecret} 
                  onChange={onChange('swiggyapisecret')} 
                />
              </Field>
              
              <Field label="Swiggy Webhook Secret">
                <input 
                  type="password" 
                  className="input" 
                  value={form.swiggywebhooksecret} 
                  onChange={onChange('swiggywebhooksecret')} 
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
              <Field label="Zomato API Key">
                <input 
                  className="input" 
                  value={form.zomatoapikey} 
                  onChange={onChange('zomatoapikey')} 
                />
              </Field>
              
              <Field label="Zomato API Secret">
                <input 
                  type="password" 
                  className="input" 
                  value={form.zomatoapisecret} 
                  onChange={onChange('zomatoapisecret')} 
                />
              </Field>
              
              <Field label="Zomato Webhook Secret">
                <input 
                  type="password" 
                  className="input" 
                  value={form.zomatowebhooksecret} 
                  onChange={onChange('zomatowebhooksecret')} 
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
