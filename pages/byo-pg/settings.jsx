import React, { useEffect, useState } from 'react';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import { supabase } from '../../services/supabase';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function ByoPgSettings() {
  const { checking } = useRequireAuth();
  const { restaurant } = useRestaurant();
  const [form, setForm] = useState({ key_id: '', key_secret: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ error: '', success: '' });

  useEffect(() => {
    if (!restaurant?.id) return;
    supabase
      .from('restaurant_profiles')
      .select('razorpay_key_id,razorpay_key_secret')
      .eq('restaurant_id', restaurant.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setForm({ key_id: data.razorpay_key_id || '', key_secret: data.razorpay_key_secret || '' });
        }
        setLoading(false);
      });
  }, [restaurant]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ error: '', success: '' });
    try {
      if (!form.key_id || !form.key_secret) throw new Error('Both fields are required');
      await supabase.from('restaurant_profiles').upsert({
        restaurant_id: restaurant.id,
        razorpay_key_id: form.key_id.trim(),
        razorpay_key_secret: form.key_secret.trim(),
      }, { onConflict: 'restaurant_id' });
      setMsg({ success: 'API keys saved', error: '' });
    } catch (e) {
      setMsg({ error: e.message, success: '' });
    } finally {
      setSaving(false);
    }
  };

  if (checking || loading) return <div>Loading…</div>;

  return (
    <div style={{ maxWidth: 600, margin: 'auto', padding: 16 }}>
      <h2>Payment Gateway Settings</h2>
      <Card padding={24} style={{ marginBottom: 24 }}>
        {msg.error && <div style={{ color: 'red' }}>{msg.error}</div>}
        {msg.success && <div style={{ color: 'green' }}>{msg.success}</div>}
        <form onSubmit={save}>
          <div style={{ marginBottom: 16 }}>
            <label>Razorpay Key ID *</label>
            <input
              className="input"
              value={form.key_id}
              onChange={(e) => setForm((f) => ({ ...f, key_id: e.target.value }))}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Razorpay Key Secret *</label>
            <input
              type="password"
              className="input"
              value={form.key_secret}
              onChange={(e) => setForm((f) => ({ ...f, key_secret: e.target.value }))}
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save API Keys'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
