// pages/owner/availability.js
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

const DAYS = [
  { label: 'Mon', dow: 1 },
  { label: 'Tue', dow: 2 },
  { label: 'Wed', dow: 3 },
  { label: 'Thu', dow: 4 },
  { label: 'Fri', dow: 5 },
  { label: 'Sat', dow: 6 },
  { label: 'Sun', dow: 7 },
];

function defaultHours() {
  // 10:00–22:00 enabled by default, ISO 1..7
  return DAYS.map(d => ({
    dow: d.dow,
    label: d.label,
    open: '10:00',
    close: '22:00',
    enabled: true,
  }));
}

export default function AvailabilityPage() {
  const { checking } = useRequireAuth();
  const { restaurant, loading: loadingRestaurant, refresh } = useRestaurant();

  const [hours, setHours] = useState(defaultHours());
  const [paused, setPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const restaurantId = restaurant?.id || '';

  useEffect(() => {
    if (restaurant) setPaused(!!restaurant.online_paused);
  }, [restaurant]);

  useEffect(() => {
    if (!restaurantId || checking || loadingRestaurant) return;

    const load = async () => {
      setLoading(true);
      setErr('');
      try {
        const { data, error } = await supabase
          .from('restaurant_hours')
          .select('dow, open_time, close_time, enabled')
          .eq('restaurant_id', restaurantId)
          .order('dow');
        if (error) throw error;

        if (!data || data.length === 0) {
          // Initialize with defaults if no rows
          setHours(defaultHours());
        } else {
          const mapped = DAYS.map(d => {
            const row = data.find(r => r.dow === d.dow);
            if (!row) return { dow: d.dow, label: d.label, open: '10:00', close: '22:00', enabled: true };
            return {
              dow: d.dow,
              label: d.label,
              open: toHHMM(row.open_time),
              close: toHHMM(row.close_time),
              enabled: !!row.enabled,
            };
          });
          setHours(mapped);
        }
      } catch (e) {
        setErr(e.message || 'Failed to load hours');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [restaurantId, checking, loadingRestaurant]);

  const enabledCount = useMemo(() => hours.filter(h => h.enabled).length, [hours]);

  if (checking || loadingRestaurant) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!restaurantId) return <div style={{ padding: 24 }}>No restaurant found.</div>;

  const togglePause = async () => {
    setSaving(true);
    setErr('');
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ online_paused: !paused })
        .eq('id', restaurantId);
      if (error) throw error;
      setPaused(prev => !prev);
      refresh?.(); // refresh context so header/overview reflects pause quickly
    } catch (e) {
      setErr(e.message || 'Failed to update pause state');
    } finally {
      setSaving(false);
    }
  };

  const setRow = (dow, patch) => {
    setHours(prev => prev.map(h => (h.dow === dow ? { ...h, ...patch } : h)));
  };

  const setAll = (patch) => {
    setHours(prev => prev.map(h => ({ ...h, ...patch })));
  };

  const copyRowDown = (dow) => {
    const row = hours.find(h => h.dow === dow);
    if (!row) return;
    setHours(prev => prev.map(h => (h.dow > dow ? { ...h, open: row.open, close: row.close, enabled: row.enabled } : h)));
  };

  const saveHours = async () => {
    setSaving(true);
    setErr('');
    try {
      // upsert each dow 1..7
      const rows = hours.map(h => ({
        restaurant_id: restaurantId,
        dow: h.dow,
        open_time: h.open,
        close_time: h.close,
        enabled: h.enabled,
      }));

      // upsert one-by-one to guarantee unique(restaurant_id,dow) semantics across dbs
      for (const r of rows) {
        const { error } = await supabase
          .from('restaurant_hours')
          .upsert(r, { onConflict: 'restaurant_id,dow' });
        if (error) throw error;
      }
    } catch (e) {
      setErr(e.message || 'Failed to save hours');
      setSaving(false);
      return;
    }
    setSaving(false);
  };

  return (
    <div className="container" style={{ padding: '20px 0 40px' }}>
      <h1 className="h1">Item Availability</h1>

      {err && (
        <Card padding={12} style={{ borderColor: '#fecaca', background: '#fff1f2', marginBottom: 12 }}>
          <div style={{ color: '#b91c1c' }}>{err}</div>
        </Card>
      )}

      <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="muted">
          {enabledCount} of 7 days enabled
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button variant="success" onClick={() => setAll({ enabled: true })}>Enable All</Button>
          <Button variant="outline" onClick={() => setAll({ enabled: false })}>Disable All</Button>
        </div>
      </div>

      <Card padding={16}>
        <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="row" style={{ gap: 10 }}>
            <label className="row">
              <input
                type="checkbox"
                checked={paused}
                onChange={togglePause}
                disabled={saving}
              />
              <span><strong>Pause online ordering</strong> {saving && '…'}</span>
            </label>
          </div>
          <div className="muted" style={{ maxWidth: 520 }}>
            When paused, customers can view the menu but cannot place new orders.
          </div>
        </div>

        {/* Hours editor header actions */}
        <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
          <Button
            variant="outline"
            onClick={() => setAll({ open: '10:00', close: '22:00', enabled: true })}
          >
            Set All to 10:00–22:00
          </Button>
          <Button
            variant="outline"
            onClick={() => setAll({ open: '09:00', close: '21:00', enabled: true })}
          >
            Set All to 09:00–21:00
          </Button>
        </div>

        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 60 }}>Day</th>
                <th style={{ width: 100 }}>Enabled</th>
                <th style={{ width: 160 }}>Opens</th>
                <th style={{ width: 40 }}></th>
                <th style={{ width: 160 }}>Closes</th>
                <th style={{ width: 140 }} className="hide-sm">Quick</th>
              </tr>
            </thead>
            <tbody>
              {hours.map(h => (
                <tr key={h.dow}>
                  <td><strong>{h.label}</strong></td>
                  <td>
                    <label className="row">
                      <input
                        type="checkbox"
                        checked={h.enabled}
                        onChange={e => setRow(h.dow, { enabled: e.target.checked })}
                      />
                      <span className="muted">Open</span>
                    </label>
                  </td>
                  <td>
                    <input
                      className="input"
                      type="time"
                      value={h.open}
                      onChange={e => setRow(h.dow, { open: e.target.value })}
                      disabled={!h.enabled}
                      style={{ width: 140 }}
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>to</td>
                  <td>
                    <input
                      className="input"
                      type="time"
                      value={h.close}
                      onChange={e => setRow(h.dow, { close: e.target.value })}
                      disabled={!h.enabled}
                      style={{ width: 140 }}
                    />
                  </td>
                  <td className="hide-sm">
                    <div className="row" style={{ gap: 6 }}>
                      <Button size="sm" variant="outline" onClick={() => copyRowDown(h.dow)}>
                        Copy ↓
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRow(h.dow, { open: '09:00', close: '21:00', enabled: true })}>
                        9–21
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setRow(h.dow, { open: '10:00', close: '22:00', enabled: true })}>
                        10–22
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {hours.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 12, color: '#6b7280' }}>
                    No rows. Use Set All to quickly initialize hours.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="row" style={{ justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <Button variant="outline" onClick={() => setHours(defaultHours())}>Reset</Button>
          <Button onClick={saveHours} disabled={saving}>{saving ? 'Saving…' : 'Save Hours'}</Button>
        </div>
      </Card>
    </div>
  );
}

// Helpers
function toHHMM(value) {
  // value can be '10:00:00' or '10:00'
  if (!value) return '00:00';
  const str = String(value);
  const [hh, mm] = str.split(':');
  return `${hh.padStart(2, '0')}:${(mm || '00').padStart(2, '0')}`;
}
