// pages/order/bill/[id].js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../../services/supabase'

export default function BillPage() {
  const router = useRouter()
  const { id } = router.query
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, customer_name, customer_phone, table_number, subtotal, tax, total_amount,
          restaurants(name, address, phone),
          order_items(quantity, price, item_name)
        `)
        .eq('id', id)
        .single()
      if (!error) setOrder(data)
    }
    load()
  }, [id])

  if (!order) return <div style={{ padding: 20 }}>Loading bill…</div>

  const short = order.id.slice(0, 8)

  return (
    <div className="bill">
      <div className="bill-card" id="print-area">
        <h2>{order.restaurants?.name}</h2>
        <div className="muted">{order.restaurants?.address}</div>
        <div className="muted">{order.restaurants?.phone}</div>
        <hr />
        <div className="row">
          <div>Bill No: {short}</div>
          <div>{new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="row">
          <div>Customer: {order.customer_name || '-'}</div>
          <div>Table: {order.table_number || '-'}</div>
        </div>
        <hr />
        <div className="items">
          {order.order_items?.map((it, idx) => (
            <div key={idx} className="item">
              <span>{it.item_name} × {it.quantity}</span>
              <span>₹{(it.quantity * it.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <hr />
        <div className="totals">
          <div><span>Subtotal</span><span>₹{order.subtotal?.toFixed(2)}</span></div>
          <div><span>Tax</span><span>₹{order.tax?.toFixed(2)}</span></div>
          <div className="grand"><span>Total</span><span>₹{order.total_amount?.toFixed(2)}</span></div>
        </div>
        <div className="footer">Thank you for dining with us!</div>
      </div>
      <div className="actions">
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>
      <style jsx>{`
        .bill { display: flex; flex-direction: column; align-items: center; padding: 16px; }
        .bill-card { width: 100%; max-width: 420px; background: #fff; border: 1px solid #eee; padding: 16px; border-radius: 8px; }
        .muted { color: #6b7280; font-size: 12px; }
        .row { display: flex; justify-content: space-between; margin: 6px 0; }
        .items .item { display: flex; justify-content: space-between; margin: 6px 0; }
        .totals > div { display: flex; justify-content: space-between; margin: 4px 0; }
        .grand { font-weight: 700; border-top: 1px dashed #ccc; padding-top: 6px; }
        .footer { margin-top: 12px; text-align: center; color: #6b7280; font-size: 12px; }
        .actions { margin-top: 12px; }
        @media print {
          .actions { display: none; }
          body { background: #fff; }
          .bill-card { border: none; }
        }
      `}</style>
    </div>
  )
}
// pages/order/bill/[id].js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { supabase } from '../../../services/supabase'

export default function BillPage() {
  const router = useRouter()
  const { id } = router.query
  const [order, setOrder] = useState(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, created_at, customer_name, customer_phone, table_number, subtotal, tax, total_amount,
          restaurants(name, address, phone),
          order_items(quantity, price, item_name)
        `)
        .eq('id', id)
        .single()
      if (!error) setOrder(data)
    }
    load()
  }, [id])

  if (!order) return <div style={{ padding: 20 }}>Loading bill…</div>

  const short = order.id.slice(0, 8)

  return (
    <div className="bill">
      <div className="bill-card" id="print-area">
        <h2>{order.restaurants?.name}</h2>
        <div className="muted">{order.restaurants?.address}</div>
        <div className="muted">{order.restaurants?.phone}</div>
        <hr />
        <div className="row">
          <div>Bill No: {short}</div>
          <div>{new Date(order.created_at).toLocaleString()}</div>
        </div>
        <div className="row">
          <div>Customer: {order.customer_name || '-'}</div>
          <div>Table: {order.table_number || '-'}</div>
        </div>
        <hr />
        <div className="items">
          {order.order_items?.map((it, idx) => (
            <div key={idx} className="item">
              <span>{it.item_name} × {it.quantity}</span>
              <span>₹{(it.quantity * it.price).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <hr />
        <div className="totals">
          <div><span>Subtotal</span><span>₹{order.subtotal?.toFixed(2)}</span></div>
          <div><span>Tax</span><span>₹{order.tax?.toFixed(2)}</span></div>
          <div className="grand"><span>Total</span><span>₹{order.total_amount?.toFixed(2)}</span></div>
        </div>
        <div className="footer">Thank you for dining with us!</div>
      </div>
      <div className="actions">
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>
      <style jsx>{`
        .bill { display: flex; flex-direction: column; align-items: center; padding: 16px; }
        .bill-card { width: 100%; max-width: 420px; background: #fff; border: 1px solid #eee; padding: 16px; border-radius: 8px; }
        .muted { color: #6b7280; font-size: 12px; }
        .row { display: flex; justify-content: space-between; margin: 6px 0; }
        .items .item { display: flex; justify-content: space-between; margin: 6px 0; }
        .totals > div { display: flex; justify-content: space-between; margin: 4px 0; }
        .grand { font-weight: 700; border-top: 1px dashed #ccc; padding-top: 6px; }
        .footer { margin-top: 12px; text-align: center; color: #6b7280; font-size: 12px; }
        .actions { margin-top: 12px; }
        @media print {
          .actions { display: none; }
          body { background: #fff; }
          .bill-card { border: none; }
        }
      `}</style>
    </div>
  )
}
