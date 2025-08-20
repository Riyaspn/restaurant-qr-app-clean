import { useRouter } from 'next/router'
import { useEffect,useState } from 'react'
import { supabase } from '../../../services/supabase'

export default function BillPage(){
  const {query}=useRouter(),{id}=query
  const [o,setO]=useState(null)
  useEffect(()=>{
    if(id)load()
    async function load(){
      const { data }=await supabase
        .from('orders')
        .select(`id,created_at,table_number,subtotal,tax,total_amount,
          restaurant_name,restaurant_phone,restaurant_address,
          order_items(item_name,quantity,price)`)
        .eq('id',id).single()
      setO(data)
    }
  },[id])
  if(!o) return <div>Loading…</div>
  const num=o.id.slice(0,8).toUpperCase()
  return (
    <div style={{padding:20}}>
      <h2>{o.restaurant_name}</h2>
      <p>{o.restaurant_address}</p>
      <p>{o.restaurant_phone}</p>
      <hr/>
      <p>Bill No: {num}</p>
      <p>Date: {new Date(o.created_at).toLocaleString()}</p>
      <p>Table: {o.table_number}</p>
      <hr/>
      {o.order_items.map((it,i)=>(
        <div key={i} style={{display:'flex',justifyContent:'space-between'}}>
          <span>{it.item_name} × {it.quantity}</span>
          <span>₹{(it.price*it.quantity).toFixed(2)}</span>
        </div>
      ))}
      <hr/>
      <div style={{display:'flex',justifyContent:'space-between',fontWeight:600}}>
        <span>Total</span><span>₹{o.total_amount.toFixed(2)}</span>
      </div>
      <button onClick={()=>window.print()}>Print / Save PDF</button>
    </div>
  )
}
