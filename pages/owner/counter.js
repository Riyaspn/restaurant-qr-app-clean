import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import { getSupabase } from '../../services/supabase'; // 1. IMPORT

export default function CounterSale() {
  // --- FIXES APPLIED HERE ---
  // 2. Remove `{ supabase }` from props and get the client directly
  const supabase = getSupabase();
  const { checking } = useRequireAuth(supabase);
  // --- END OF FIXES ---

  const { restaurant, loading: loadingRestaurant } = useRestaurant();
  const router = useRouter();

  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const menuMapRef = useRef(new Map());
  const restaurantId = restaurant?.id;
  const brandColor = '#f59e0b';

  const cacheMenuIntoMap = (list) => {
    const m = new Map();
    (list || []).forEach((row) => m.set(row.id, row));
    menuMapRef.current = m;
  };

  useEffect(() => {
    if (checking || loadingRestaurant || !restaurantId || !supabase) return;
    const loadMenu = async () => {
      try {
        setLoading(true);
        setError('');
        const { data: menu, error: menuErr } = await supabase
          .from('menu_items')
          // --- FIX: Added 'code_number' and 'compensation_cess_rate' to select ---
          .select('id, name, price, description, category, veg, status, hsn, tax_rate, is_packaged_good, code_number, compensation_cess_rate')
          .eq('restaurant_id', restaurantId)
          .order('category', { ascending: true })
          .order('name', { ascending: true });
        if (menuErr) throw menuErr;
        const cleaned = (menu || []).map((item, i) => ({
          ...item,
          rating: Number((3.8 + Math.random() * 1.0).toFixed(1)),
          popular: i % 4 === 0,
        }));
        setMenuItems(cleaned);
        cacheMenuIntoMap(cleaned);
      } catch (e) {
        setError(e.message || 'Failed to load menu');
      } finally {
        setLoading(false);
      }
    };
    loadMenu();
  }, [checking, loadingRestaurant, restaurantId, supabase]);

  useEffect(() => {
    if (!restaurantId || !supabase) return;
    const channel = supabase
      .channel(`counter-menu-${restaurantId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'menu_items',
        filter: `restaurant_id=eq.${restaurantId}`,
      }, (payload) => {
        const newRow = payload.new;
        if (!newRow?.id) return;
        const map = menuMapRef.current;
        const prev = map.get(newRow.id);
        if (!prev) return;
        const merged = { ...prev, ...newRow };
        map.set(newRow.id, merged);
        setMenuItems(prevList => prevList.map(it => (it.id === newRow.id ? merged : it)));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [restaurantId, supabase]);

  const addToCart = (item) => {
    if (item.status && item.status !== 'available') {
      alert('This item is currently out of stock.');
      return;
    }
    setCart(prev => {
      const existing = prev.find(c => c.id === item.id);
      if (existing) return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateCartItem = (itemId, quantity) => {
    if (quantity === 0) setCart(prev => prev.filter(c => c.id !== itemId));
    else setCart(prev => prev.map(c => c.id === itemId ? { ...c, quantity } : c));
  };
  
  const getItemQuantity = (itemId) => cart.find(c => c.id === itemId)?.quantity || 0;

  const filteredItems = useMemo(() => {
    const q = (searchQuery || '').toLowerCase();
    return (menuItems || []).filter(item => {
      if (filterMode === 'veg' && !item.veg) return false;
      if (filterMode === 'popular' && !item.popular) return false;
      if (!q) return true;
      // --- FIX: Added 'code_number' to search logic ---
      return (item.name || '').toLowerCase().includes(q) 
        || (item.description || '').toLowerCase().includes(q)
        || (item.code_number || '').toLowerCase().includes(q);
    });
  }, [menuItems, filterMode, searchQuery]);

  const groupedItems = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const cat = item.category || 'Others';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});
  }, [filteredItems]);

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);
  const cartItemsCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const completeSale = async () => {
    if (cart.length === 0) { alert('Please add items to cart'); return; }
    setProcessing(true);
    try {
      const orderData = {
        restaurant_id: restaurantId,
        table_number: null,
        order_type: 'counter',
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
        payment_method: paymentMethod,
        payment_status: 'completed',
        items: cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          hsn: item.hsn,
          tax_rate: item.tax_rate,
          is_packaged_good: item.is_packaged_good,
          // --- FIX: Added 'code_number' to the order payload ---
          code_number: item.code_number,
        })),
      };
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error('Failed to create order');
      const result = await response.json();

      const invoiceResponse = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: result.order_id }),
      });
      if (invoiceResponse.ok) {
        const invoiceResult = await invoiceResponse.json();
        const action = confirm(`Sale completed! Order #${result.order_number}\nTotal: ₹${cartTotal.toFixed(2)}\n\nClick OK to view receipt, Cancel to start new sale`);
        if (action && invoiceResult.pdfUrl) window.open(invoiceResult.pdfUrl, '_blank');
      }
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setPaymentMethod('cash');
      setDrawerOpen(false);
    } catch (error) {
      alert('Error completing sale: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (checking || loadingRestaurant) return <div style={{ padding: 24 }}>Loading...</div>;
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading menu...</div>;
  if (error) return <div style={{ padding: 40, textAlign: 'center', color: 'red' }}>{error}</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', display: 'flex', flexDirection: 'column' }}>
      {/* Header remains the same */}
      <header style={{
        padding: '1rem', background: '#fff', borderBottom: '1px solid #e5e7eb',
        position: 'sticky', top: 0, zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <button onClick={() => router.push('/owner/orders')} style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}>
            ← Back
          </button>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, flex: 1 }}>Counter Sale</h1>

          <div className="desk-only">
            {cartItemsCount > 0 && (
              <div style={{ background: brandColor, color: '#fff', padding: '4px 8px', borderRadius: 12, fontSize: 14, fontWeight: 600 }}>
                {cartItemsCount} items • ₹{cartTotal.toFixed(2)}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
          <input type="text" placeholder="Customer name (optional)" value={customerName}
                 onChange={(e) => setCustomerName(e.target.value)}
                 style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
          <input type="tel" placeholder="Phone (optional)" value={customerPhone}
                 onChange={(e) => setCustomerPhone(e.target.value)}
                 style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }} />
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
          </select>
        </div>
      </header>
      
      {/* Main layout remains the same */}
      <div className="main-wrap" style={{ display: 'grid', flex: 1, background: 'transparent' }}>
        <div style={{ overflow: 'auto' }}>
          <div style={{ padding: '1rem', background: '#fff' }}>
            <input
              type="text" placeholder="Search by name, code, or description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 16, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
              {[
                { id: 'all', label: 'All Items' },
                { id: 'veg', label: '🟢 Veg' },
                { id: 'popular', label: '🔥 Popular' }
              ].map(mode => (
                <button key={mode.id} onClick={() => setFilterMode(mode.id)}
                        style={{
                          padding: '6px 12px', border: '1px solid #e5e7eb', borderRadius: 16,
                          background: filterMode === mode.id ? brandColor : '#fff',
                          color: filterMode === mode.id ? '#fff' : '#000', cursor: 'pointer', fontSize: 14, whiteSpace: 'nowrap'
                        }}>
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: '0 1rem 6rem' }}>
            {Object.entries(groupedItems).map(([category, items]) => (
              <section key={category} style={{ marginBottom: 16 }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600, color: '#374151' }}>
                  {category} ({items.length})
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
                  {items.map(item => {
                    const quantity = getItemQuantity(item.id);
                    const isAvailable = !item.status || item.status === 'available';
                    return (
                      <div key={item.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, opacity: isAvailable ? 1 : 0.6 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                          <span>{item.veg ? '🟢' : '🔺'}</span>
                          <div style={{ flex: 1 }}>
                            {/* --- FIX: Display code_number --- */}
                            <h3 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 600 }}>
                              {item.name}
                              {item.code_number && (
                                <small style={{ color: '#999', marginLeft: 6, fontWeight: 400 }}>
                                  [{item.code_number}]
                                </small>
                              )}
                            </h3>
                            <div style={{ fontSize: 16, fontWeight: 700, color: brandColor }}>₹{item.price.toFixed(2)}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          {!isAvailable && <span style={{ fontSize: 12, color: '#dc2626' }}>Out of stock</span>}
                          {quantity > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', background: brandColor, borderRadius: 4, overflow: 'hidden', marginLeft: 'auto' }}>
                              <button onClick={() => updateCartItem(item.id, quantity - 1)}
                                      style={{ background: 'none', border: 'none', color: '#fff', width: 28, height: 28, cursor: 'pointer', fontWeight: 600 }}>-</button>
                              <span style={{ background: '#fff', color: brandColor, minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14 }}>{quantity}</span>
                              <button onClick={() => updateCartItem(item.id, quantity + 1)}
                                      disabled={!isAvailable}
                                      style={{ background: 'none', border: 'none', color: '#fff', width: 28, height: 28, cursor: isAvailable ? 'pointer' : 'not-allowed', fontWeight: 600 }}>+</button>
                            </div>
                          ) : (
                            <button onClick={() => addToCart(item)} disabled={!isAvailable}
                                    style={{ background: isAvailable ? brandColor : '#9ca3af', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, fontWeight: 500, cursor: isAvailable ? 'pointer' : 'not-allowed', fontSize: 14, marginLeft: 'auto' }}>
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>

        {/* Cart and drawer JSX remains the same */}
        <div className="desk-cart">
          {cartItemsCount > 0 && (
            <aside style={{ width: 300, background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: 16, fontWeight: 600 }}>Cart ({cartItemsCount} items)</h3>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {cart.map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button onClick={() => updateCartItem(item.id, item.quantity - 1)}
                              style={{ width: 24, height: 24, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>-</button>
                      <span style={{ minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                      <button onClick={() => updateCartItem(item.id, item.quantity + 1)}
                              style={{ width: 24, height: 24, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ padding: 16, borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 18, marginBottom: 12 }}>
                  <span>Total</span><span>₹{cartTotal.toFixed(2)}</span>
                </div>
                <button onClick={completeSale} disabled={processing}
                        style={{ width: '100%', background: brandColor, color: '#fff', border: 'none', padding: 12, borderRadius: 6, fontSize: 16, fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer', opacity: processing ? 0.7 : 1 }}>
                  {processing ? 'Processing...' : `Complete Sale (₹${cartTotal.toFixed(2)})`}
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>

      <div className="mob-cartbar">
        {cartItemsCount > 0 && (
          <button onClick={() => setDrawerOpen(true)}
                  style={{ width: '100%', background: brandColor, color: '#fff', border: 'none', padding: '14px 16px', fontSize: 16, fontWeight: 700 }}>
            View Cart • {cartItemsCount} · ₹{cartTotal.toFixed(2)}
          </button>
        )}
      </div>

      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Cart ({cartItemsCount})</h3>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 10px' }}>Close</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 12, background: '#fff' }}>
              {cart.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>₹{item.price} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button onClick={() => updateCartItem(item.id, item.quantity - 1)} style={{ width: 28, height: 28, border: '1px solid #e5e7eb' }}>-</button>
                    <span style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                    <button onClick={() => updateCartItem(item.id, item.quantity + 1)} style={{ width: 28, height: 28, border: '1px solid #e5e7eb' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #e5e7eb', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
                <span>Total</span><span>₹{cartTotal.toFixed(2)}</span>
              </div>
              <button onClick={completeSale} disabled={processing}
                      style={{ width: '100%', background: brandColor, color: '#fff', border: 'none', padding: 12, borderRadius: 8, fontSize: 16, fontWeight: 700 }}>
                {processing ? 'Processing...' : `Complete Sale (₹${cartTotal.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .main-wrap {
          grid-template-columns: 1fr 300px;
        }
        .desk-cart { display: block; }
        .desk-only { display: block; }

        @media (max-width: 768px) {
          .main-wrap { grid-template-columns: 1fr; }
          .desk-cart { display: none; }
          .desk-only { display: none; }
          .mob-cartbar {
            position: sticky; bottom: 0; z-index: 30;
            padding-bottom: env(safe-area-inset-bottom);
            box-shadow: 0 -8px 20px rgba(0,0,0,.06);
          }
        }
        @media (min-width: 769px) {
          .mob-cartbar { display: none; }
        }

        .drawer-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 40;
          display: flex; align-items: flex-end; justify-content: center;
        }
        .drawer {
          width: 100%; max-width: 720px; height: 80vh; background: #f8f9fa;
          border-top-left-radius: 14px; border-top-right-radius: 14px;
          display: flex; flex-direction: column; box-shadow: 0 -20px 60px rgba(0,0,0,.25);
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
}
