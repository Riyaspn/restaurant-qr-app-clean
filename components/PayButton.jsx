// components/PayButton.jsx

import { useState, useEffect } from 'react';

export default function PayButton({ amount, customer }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const pay = async () => {
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
          alert('Payment successful!');
        },
        theme: { color: '#3b82f6' },
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
    <button onClick={pay} disabled={loading}>
      {loading ? 'Starting payment…' : `Pay ₹${amount}`}
    </button>
  );
}
