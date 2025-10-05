// pages/order/payment-callback.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function PaymentCallback() {
  const router = useRouter();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    processPaymentReturn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processPaymentReturn = async () => {
    try {
      const pendingOrder = JSON.parse(localStorage.getItem('pending_order') || '{}');
      const paymentSession = JSON.parse(localStorage.getItem('payment_session') || '{}');

      if (!pendingOrder?.restaurant_id || !paymentSession?.order_id) {
        throw new Error('Order data not found');
      }

      setMessage('Creating your order on the server...');

      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pendingOrder,
          payment_status: 'completed',
          payment_details: {
            session_id: paymentSession.session_id,
            external_order_id: paymentSession.order_id,
            amount: paymentSession.amount
          }
        })
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Failed to create order: ${txt}`);
      }
      const result = await response.json();

      // Fire owner notification (best-effort)
      await fetch('/api/notify-owner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: pendingOrder.restaurant_id,
          orderId: result.order_id ?? result.id,
          orderItems: pendingOrder.items || []
        })
      }).catch(() => { /* do not block UX on notify failure */ });

      // Cleanup cart/session
      localStorage.removeItem('pending_order');
      localStorage.removeItem('payment_session');
      if (pendingOrder?.restaurant_id && pendingOrder?.table_number) {
        localStorage.removeItem(`cart_${pendingOrder.restaurant_id}_${pendingOrder.table_number}`);
      }

      await router.replace(`/order/success?id=${result.order_id ?? result.id}&method=online`);
      window.open(`/api/bills/pdf/${result.order_id ?? result.id}`, '_blank');
    } catch (error) {
      console.error('Payment processing failed:', error);
      setStatus('error');
      setMessage('Payment processing failed. Please contact the restaurant.');
    }
  };

  return (
    <div className="callback-page">
      <div className="callback-content">
        <div className="spinner">{status === 'processing' ? '⏳' : '❌'}</div>
        <h2>{status === 'processing' ? 'Processing Payment' : 'Payment Failed'}</h2>
        <p>{message}</p>
        {status === 'error' && (
          <button onClick={() => router.push('/')}>Return to Menu</button>
        )}
      </div>
      <style jsx>{``}</style>
    </div>
  );
}
