// pages/owner/promotions.js
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';

export default function PromotionsPage() {
  const { checking } = useRequireAuth();
  const { restaurant, loading: restLoading } = useRestaurant();
  
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editPromo, setEditPromo] = useState(null);

  const restaurantId = restaurant?.id || '';

  useEffect(() => {
    if (checking || restLoading || !restaurantId) return;
    // For now, using mock data since promotions table might not exist
    // Replace with actual Supabase query when table is ready
    setPromotions([]);
  }, [checking, restLoading, restaurantId]);

  const savePromotion = (promoData) => {
    const newPromo = {
      id: editPromo?.id || Date.now().toString(),
      ...promoData,
      restaurant_id: restaurantId,
      created_at: editPromo?.created_at || new Date().toISOString(),
    };

    if (editPromo) {
      setPromotions(prev => prev.map(p => p.id === editPromo.id ? newPromo : p));
    } else {
      setPromotions(prev => [newPromo, ...prev]);
    }

    setShowForm(false);
    setEditPromo(null);
  };

  const deletePromotion = (id) => {
    if (!confirm('Delete this promotion?')) return;
    setPromotions(prev => prev.filter(p => p.id !== id));
  };

  const toggleStatus = (id) => {
    setPromotions(prev => prev.map(p => 
      p.id === id ? { ...p, is_active: !p.is_active } : p
    ));
  };

  if (checking || restLoading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!restaurantId) return <div style={{ padding: 24 }}>No restaurant found</div>;

  return (
    <>
      <div className="promotions-page">
        <div className="page-header">
          <div>
            <h1>Promotions</h1>
            <p className="subtitle">Create and manage discount offers</p>
          </div>
          <Button onClick={() => setShowForm(true)}>Create Promotion</Button>
        </div>

        {error && (
          <Card padding="12px" style={{ marginBottom: 16, borderColor: '#fecaca', background: '#fff1f2' }}>
            <div style={{ color: '#b91c1c' }}>{error}</div>
          </Card>
        )}

        {promotions.length === 0 ? (
          <Card padding="40px" style={{ textAlign: 'center' }}>
            <div style={{ color: '#6b7280', marginBottom: 16 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
              <h3 style={{ margin: '0 0 8px 0' }}>No promotions yet</h3>
              <p style={{ margin: 0 }}>Create your first promotion to attract more customers</p>
            </div>
            <Button onClick={() => setShowForm(true)}>Create First Promotion</Button>
          </Card>
        ) : (
          <div className="promotions-grid">
            {promotions.map(promo => (
              <Card key={promo.id} padding="16px" className="promo-card">
                <div className="promo-header">
                  <div>
                    <h3 className="promo-name">{promo.name}</h3>
                    <div className="promo-value">
                      {promo.type === 'percent' 
                        ? `${promo.value}% OFF` 
                        : `₹${promo.value} OFF`
                      }
                    </div>
                  </div>
                  <div className="promo-actions">
                    <button
                      onClick={() => toggleStatus(promo.id)}
                      className={`status-toggle ${promo.is_active ? 'active' : 'inactive'}`}
                    >
                      {promo.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                <div className="promo-details">
                  {promo.min_order && (
                    <div className="detail-item">Minimum order: ₹{promo.min_order}</div>
                  )}
                  <div className="detail-item">
                    Valid: {promo.start_date 
                      ? new Date(promo.start_date).toLocaleDateString() 
                      : 'Now'
                    } - {promo.end_date 
                      ? new Date(promo.end_date).toLocaleDateString() 
                      : 'No end date'
                    }
                  </div>
                </div>

                <div className="promo-footer">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setEditPromo(promo);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="danger" 
                    onClick={() => deletePromotion(promo.id)}
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <PromotionForm
          promotion={editPromo}
          onSave={savePromotion}
          onClose={() => {
            setShowForm(false);
            setEditPromo(null);
          }}
        />
      )}

      <style jsx>{`
        .promotions-page { max-width: 1200px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
        .page-header h1 { margin: 0; font-size: 2rem; }
        .subtitle { color: #6b7280; margin: 4px 0 0 0; }
        .promotions-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
        .promo-card { transition: transform 0.2s; }
        .promo-card:hover { transform: translateY(-2px); }
        .promo-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .promo-name { margin: 0 0 4px 0; font-size: 18px; font-weight: 600; }
        .promo-value { color: #f97316; font-size: 16px; font-weight: 700; }
        .status-toggle { padding: 4px 12px; border: none; border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; }
        .status-toggle.active { background: #dcfce7; color: #166534; }
        .status-toggle.inactive { background: #fef3c7; color: #92400e; }
        .promo-details { margin-bottom: 16px; }
        .detail-item { font-size: 14px; color: #6b7280; margin-bottom: 4px; }
        .promo-footer { display: flex; gap: 8px; justify-content: flex-end; }
        @media (max-width: 768px) {
          .page-header { flex-direction: column; gap: 16px; align-items: stretch; }
          .promotions-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

function PromotionForm({ promotion, onSave, onClose }) {
  const [form, setForm] = useState({
    name: promotion?.name || '',
    type: promotion?.type || 'percent',
    value: promotion?.value || '',
    min_order: promotion?.min_order || '',
    start_date: promotion?.start_date ? promotion.start_date.split('T')[0] : '',
    end_date: promotion?.end_date ? promotion.end_date.split('T')[0] : '',
    is_active: promotion?.is_active !== false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.value) return;
    
    onSave({
      ...form,
      value: Number(form.value),
      min_order: form.min_order ? Number(form.min_order) : null,
      start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card">
        <form onSubmit={handleSubmit}>
          <h3 style={{ marginTop: 0 }}>{promotion ? 'Edit Promotion' : 'Create Promotion'}</h3>
          
          <div className="form-group">
            <label>Promotion Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Weekend Special, First Time Customer"
              required
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Discount Type *</label>
              <select
                value={form.type}
                onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="percent">Percentage</option>
                <option value="amount">Fixed Amount</option>
              </select>
            </div>
            <div className="form-group">
              <label>Value *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.value}
                onChange={(e) => setForm(prev => ({ ...prev, value: e.target.value }))}
                placeholder={form.type === 'percent' ? '10' : '100'}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Minimum Order Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.min_order}
              onChange={(e) => setForm(prev => ({ ...prev, min_order: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              Active immediately
            </label>
          </div>

          <div className="form-actions">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{promotion ? 'Update' : 'Create'} Promotion</Button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-card { background: #fff; width: min(600px, 95vw); max-height: 90vh; overflow-y: auto; border-radius: 12px; padding: 24px; }
        .form-group { margin-bottom: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group label { display: block; margin-bottom: 4px; font-weight: 500; }
        .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #f97316; box-shadow: 0 0 0 3px rgba(249,115,22,0.1); }
        .form-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
        @media (max-width: 600px) {
          .form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
