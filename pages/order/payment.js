// pages/order/payment.js
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
export default function PaymentPage() {
  const router = useRouter();
  const { r: restaurantId, t: tableNumber, total } = router.query;
  const [restaurant, setRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState('cash'); // 'cash' | 'byo'
  const [loading, setLoading] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  // Derive total from query or cart fallback
  const totalAmount = useMemo(() => {
    const q = Number(total);
    if (Number.isFinite(q) && q > 0) return q;
    return cart.reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 0),
      0
    );
  }, [total, cart]);
  // Load restaurant metadata from Supabase
  useEffect(() => {
    if (restaurantId) loadRestaurantData();
  }, [restaurantId]);
  // Load cart from localStorage
  useEffect(() => {
    if (restaurantId && tableNumber) {
      try {
        const stored = localStorage.getItem(`cart_${restaurantId}_${tableNumber}`);
        if (stored) setCart(JSON.parse(stored) || []);
      } catch (e) {
        console.error('Failed to parse cart JSON', e);
      }
    }
  }, [restaurantId, tableNumber]);
  // Load Razorpay script
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);
  // Query Supabase for restaurant metadata
  const loadRestaurantData = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, restaurant_profiles(brand_color)')
        .eq('id', restaurantId)
        .single();
      if (!error && data) setRestaurant(data);
    } catch (e) {
      console.error(e);
    }
  };
  // Helper to notify owner
  const notifyOwner = async (payload) => {
    try {
      await fetch('/api/notify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.warn('notify-owner failed', e);
    }
  };
  const handlePayment = async () => {
    if (loading) return;
    if (!restaurantId || !tableNumber) {
      alert('Missing restaurant or table information.');
      return;
    }
    if (!cart?.length) {
      alert('Cart is empty.');
      return;
    }
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      alert('Invalid total amount.');
      return;
    }
    setLoading(true);
    try {
      if (selectedPayment === 'cash') {
        // existing cash flow...
        const orderData = {
          restaurant_id: restaurantId,
          restaurant_name: restaurant?.name || null,
          table_number: tableNumber,
          items: cart.map(i => ({
            id: i.id,
            name: i.name,
            price: Number(i.price) || 0,
            quantity: Number(i.quantity) || 1,
            veg: !!i.veg,
          })),
          subtotal: totalAmount,
          tax: 0,
          total_amount: totalAmount,
          payment_method: 'cash',
          special_instructions: specialInstructions.trim(),
          payment_status: 'pending',
        };
        const res = await fetch('/api/orders/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result?.error || 'Failed to create order');
        await notifyOwner({
          restaurantId,
          orderId: result.order_id || result.id,
          orderItems: orderData.items,
        });
        localStorage.removeItem(`cart_${restaurantId}_${tableNumber}`);
        localStorage.setItem('restaurantId', restaurantId);
        localStorage.setItem('tableNumber', tableNumber);
        window.location.href = `/order/success?id=${result.order_id || result.id}&method=cash`;
        return;
      }
      if (selectedPayment === 'byo') {
        // 1) Create Razorpay order via BYO PG API
        const resp = await fetch('/byo-pg/api/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurant_id: restaurantId,
            amount: totalAmount,
            metadata: {
              table_number: tableNumber,
              special_instructions: specialInstructions.trim(),
            },
          }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Order creation failed');

        // 2) Store pending order for callback
        const pendingOrder = {
          restaurant_id: restaurantId,
          table_number: tableNumber,
          items: cart.map(i => ({
            id: i.id,
            name: i.name,
            price: Number(i.price) || 0,
            quantity: Number(i.quantity) || 1,
            veg: !!i.veg,
          })),
          subtotal: totalAmount,
          special_instructions: specialInstructions.trim(),
          payment_method: 'byo',
        };
        localStorage.setItem('pending_order', JSON.stringify(pendingOrder));

        // 3) Launch Razorpay Checkout
        const options = {
          key: '', // no client key here
          order_id: data.order_id,
          amount: data.amount,
          currency: data.currency,
          name: restaurant?.name || 'Restaurant',
          description: `Table ${tableNumber} Order`,
          handler: (response) => {
            window.location.href = `/order/payment-success?payment_id=${response.razorpay_payment_id}&order_id=${response.razorpay_order_id}`;
          },
          modal: { ondismiss: () => setLoading(false) },
          theme: { color: restaurant?.restaurant_profiles?.brand_color || '#10b981' },
        };
        // Note: BYO PG Checkout script uses server-side key injection via webhook confirmation
        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }
      // If other payment methods enabled, handle here...
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  const brandColor = restaurant?.restaurant_profiles?.brand_color || '#f59e0b';
  const paymentMethods = [
    { id: 'cash', name: 'Pay at Counter', icon: '💵' },
    //{ id: 'upi', name: 'UPI Payment', icon: '📱' },
    //{ id: 'card', name: 'Card Payment', icon: '💳' },
    { id: 'byo', name: 'Online Payment (BYO Gateway)', icon: '🌐' },
  ];
  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa', paddingBottom: 120 }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 16,
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', padding: 8, cursor: 'pointer' }}
        >
          ←
        </button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, flex: 1, textAlign: 'center' }}>
          Payment
        </h1>
        <div style={{ fontSize: 14, fontWeight: 600, color: brandColor }}>
          ₹{Number(totalAmount || 0).toFixed(2)}
        </div>
      </header>
      <div style={{ background: '#fff', padding: 20, marginBottom: 8 }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: 600 }}>📦 Order Summary</h3>
        <div style={{ marginBottom: 16 }}>
          {cart.slice(0, 3).map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 6,
                fontSize: 14,
                color: '#374151',
              }}
            >
              <span>
                {item.quantity}x {item.name}
              </span>
              <span>
                ₹{((Number(item.price) || 0) * (Number(item.quantity) || 0)).toFixed(2)}
              </span>
            </div>
          ))}
          {cart.length > 3 && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              +{cart.length - 3} more items
            </div>
          )}
        </div>
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: 16,
            }}
          >
            <span>Final Total</span>
            <span>₹{Number(totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
      <div className="payment-methods" style={{ background: '#fff', padding: 16, marginBottom: 84 }}>
        <h3>💳 Choose Payment Method</h3>
        {paymentMethods.map((method) => (
          <label key={method.id} className={`pay-card ${selectedPayment === method.id ? 'selected' : ''}`}>
            <input
              type="radio"
              value={method.id}
              checked={selectedPayment === method.id}
              onChange={(e) => setSelectedPayment(e.target.value)}
            />
            <div className="pay-main">
              <div className="pay-left">
                <span className="pay-emoji" aria-hidden="true">
                  {method.icon}
                </span>
                <div className="pay-text">
                  <div className="pay-name">{method.name}</div>
                  {method.id === 'cash' && <div className="pay-note">Pay at counter</div>}
                </div>
              </div>
              <div className="pay-right">₹{Number(totalAmount || 0).toFixed(2)}</div>
            </div>
          </label>
        ))}
      </div>
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          background: '#fff',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14, color: '#374151' }}>
          <span>💰 Total: ₹{Number(totalAmount || 0).toFixed(2)}</span>
          <span>⏱️ Ready in 20 mins</span>
        </div>
        <button
          onClick={handlePayment}
          disabled={loading}
          style={{
            width: '100%',
            background: brandColor,
            color: '#fff',
            border: 'none',
            padding: 16,
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Processing...' : selectedPayment === 'cash' ? 'Place Order' : `Pay ₹${Number(totalAmount || 0).toFixed(2)}`}
        </button>
      </div>
      <style jsx>{`
        .pay-card {
          display: block;
          width: 100%;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          margin-bottom: 10px;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
        }
        .pay-card.selected {
          border-color: ${brandColor};
          background: #fffbeb;
        }
        .pay-card input {
          display: none;
        }
        .pay-main {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          min-height: 56px;
        }
        .pay-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }
        .pay-emoji {
          font-size: 20px;
          line-height: 1;
          width: 24px;
          text-align: center;
        }
        .pay-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .pay-name {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pay-note {
          font-size: 12px;
          color: #6b7280;
        }
        .pay-right {
          font-weight: 700;
          color: #111827;
          flex: 0 0 auto;
          text-align: right;
        }
        @media (max-width: 380px) {
          .pay-right {
            min-width: 84px;
          }
        }
      `}</style>
    </div>
  );
}
