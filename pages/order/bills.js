// pages/order/bills.js

import React, { useEffect, useState } from 'react'
import { supabase } from '../../services/supabase'

/**
 * Prevent static generation for this page.
 * Next.js will render this page on each request (SSR),
 * so we can safely call client-side auth methods in useEffect.
 */
export async function getServerSideProps() {
  return { props: {} }
}

export default function CustomerBills() {
  const [user, setUser] = useState(null)
  const [bills, setBills] = useState([])

  // Fetch authenticated user once on the client
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return
      setUser(data?.user || null)
    })
    return () => { mounted = false }
  }, [])

  // Once user is known, fetch their bills
  useEffect(() => {
    if (!user) return
    supabase
      .from('bills')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setBills(data || [])
      })
  }, [user])

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h2>Your Bills</h2>
      {bills.length === 0 ? (
        <p>No bills found yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {bills.map(bill => (
            <li
              key={bill.id}
              style={{
                marginBottom: 16,
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 8
              }}
            >
              <strong>#{bill.order_id.slice(0, 8).toUpperCase()}</strong> &nbsp;
              <span>{new Date(bill.created_at).toLocaleString()}</span> &nbsp; • &nbsp;
              {bill.pdf_url ? (
                <a
                  href={bill.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#f59e0b',
                    textDecoration: 'underline'
                  }}
                >
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
