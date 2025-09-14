// components/RedirectPayButton.jsx

import { useState, useEffect } from 'react';

export default function RedirectPayButton({ amount, customer }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load Razorpay checkout script once
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const startPayment = async () => {
    setLoading(true);

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Order creation failed');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: 'Your Restaurant',
        description: 'Payment for order',
        prefill: {
          name: customer.name,
          email: customer.email,
          contact: customer.phone,
        },
        handler: function (response) {
          // response.razorpay_payment_id
          // response.razorpay_order_id
          // Optionally verify on client or rely on webhook
          alert('Payment successful!');
        },
        theme: { color: '#10b981' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={startPayment} disabled={loading}>
      {loading ? 'Processing…' : `Pay ₹${amount}`}
    </button>
  );
}
