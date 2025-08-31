//pages/order/bills.js
import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

export default function CustomerBills() {
  const user = supabase.auth.user()
  const [bills, setBills] = useState([])

  useEffect(() => {
    if (!user) return
    supabase
      .from('bills')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(res => setBills(res.data || []))
  }, [user])

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h2>Your Bills</h2>
      {bills.length === 0 ? (
        <p>No bills found yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {bills.map(bill => (
            <li key={bill.id} style={{ marginBottom: 16, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
              <strong>#{bill.order_id.slice(0, 8).toUpperCase()}</strong> &nbsp;
              <span>{new Date(bill.created_at).toLocaleString()}</span> &nbsp; • &nbsp;
              {bill.pdf_url ? (
                <a href={bill.pdf_url} target="_blank" rel="noopener noreferrer" style={{ color: '#f59e0b', textDecoration: 'underline' }}>
                  Download / Print
                </a>
              ) : (
                <span style={{ color: '#999' }}>Bill not available yet</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
