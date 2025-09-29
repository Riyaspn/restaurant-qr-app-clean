// In: pages/owner/billing.js

import React, { useEffect, useState } from 'react';
import { useRestaurant } from '../../context/RestaurantContext';
import { getSupabase } from '../../services/supabase'; // 1. IMPORT ADDED
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function BillingPage() {
  // 2. & 3. APPLY SINGLETON PATTERN
  const supabase = getSupabase();
  const { restaurant } = useRestaurant();
  const today = new Date().toISOString().slice(0, 10);

  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = async () => {
    if (!restaurant?.id || !supabase) return;

    setLoading(true);
    setError('');
    try {
      const start = `${from}T00:00:00Z`;
      const end = `${to}T23:59:59Z`;
      const { data, error } = await supabase
        .from('invoices')
        .select('id, invoice_no, invoice_date, total_inc_tax, pdf_url')
        .eq('restaurant_id', restaurant.id)
        .gte('invoice_date', start)
        .lte('invoice_date', end)
        .order('invoice_date', { ascending: false });
      if (error) throw error;
      setInvoices(data || []);
    } catch (e) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supabase && restaurant?.id) {
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id, from, to, supabase]);

  const exportCsv = () => {
    if (!restaurant?.id) return;
    const qs = new URLSearchParams({ from, to, restaurant_id: restaurant.id }).toString();
    window.location.href = `/api/reports/sales?${qs}`;
  };

  return (
    <div className="container" style={{ padding: '20px 8px 40px' }}>
      <h1 className="h1">Billing & GST Management</h1>

      <Card padding={16} style={{ marginBottom: 16 }}>
        <div className="filters">
          <label className="field">
            <span className="label">From:</span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ fontSize: 16 }} />
          </label>
          <label className="field">
            <span className="label">To:</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ fontSize: 16 }} />
          </label>
          <div className="cta">
            <Button onClick={reload} disabled={loading}>{loading ? 'Loading…' : 'Load Invoices'}</Button>
            <Button variant="outline" onClick={exportCsv}>Download GST CSV</Button>
          </div>
        </div>
      </Card>

      {error && (
        <Card padding={12} style={{ background: '#fee2e2', borderColor: '#fecaca', marginBottom: 16 }}>
          <div style={{ color: '#b91c1c' }}>{error}</div>
        </Card>
      )}

      <Card padding={16}>
        <h3 style={{ marginTop: 0 }}>Invoices ({invoices.length})</h3>
        {invoices.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No invoices for selected dates.</p>
        ) : (
          <div className="invoice-list">
            {invoices.map(inv => (
              <div key={inv.id} className="invoice-row">
                <strong className="inv-no">{inv.invoice_no || inv.id.slice(0, 8).toUpperCase()}</strong>
                <span className="sep">—</span>
                <span className="inv-date">{inv.invoice_date ? new Date(inv.invoice_date).toLocaleString() : '-'}</span>
                <span className="sep">—</span>
                <span className="inv-amt">₹{Number(inv.total_inc_tax ?? 0).toFixed(2)}</span>
                <div className="spacer" />
                {inv.pdf_url ? (
                  <Button size="sm" onClick={() => window.open(inv.pdf_url, '_blank')}>View PDF</Button>
                ) : (
                  <span style={{ color: '#f87171' }}>No PDF available</span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <style jsx>{`
        .container { max-width: 900px; margin: 0 auto; }
        .filters { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; }
        .field { display: flex; flex-direction: column; gap: 4px; }
        .label { font-size: 14px; color: #6b7280; }
        .cta { margin-left: auto; display: flex; gap: 8px; }
        .invoice-list { display: flex; flex-direction: column; gap: 8px; }
        .invoice-row { display: flex; align-items: center; gap: 8px; padding: 8px; border-radius: 4px; background: #f9fafb; }
        .inv-no { font-family: monospace; }
        .inv-date { color: #6b7280; font-size: 14px; }
        .inv-amt { font-weight: 600; }
        .spacer { flex: 1; }
        .sep { color: #d1d5db; }
        .muted { color: #6b7280; }
        @media (max-width: 600px) {
          .filters { flex-direction: column; align-items: stretch; }
          .cta { margin-left: 0; }
        }
      `}</style>
    </div>
  );
}
