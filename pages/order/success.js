import { useRouter } from 'next/router'
import { useEffect,useState } from 'react'
import { supabase } from '../../services/supabase'
import Link from 'next/link'

export default function OrderSuccess(){
  const { query,replace }=useRouter()
  const {id:orderId,method}=query
  const [order,setOrder]=useState(null)
  const [loading,setLoading]=useState(true)
  useEffect(()=>{
    if(orderId)load()
    async function load(){
      const { data } = await supabase
        .from('orders')
        .select(`id,created_at,subtotal,tax,total_amount,table_number,
          payment_status,payment_method,
          restaurant_name,restaurant_phone,restaurant_address,
          order_items(item_name,quantity,price)`)
        .eq('id',orderId).single()
      setOrder(data);setLoading(false)
    }
  },[orderId])

  if(loading) return <div>Processing…</div>
  if(!order) return <div>Not found</div>

  const paid=order.payment_status==='completed'
  const num=order.id.slice(0,8).toUpperCase()
  return (
    <div style={{padding:20}}>
      <h1>Order #{num} Placed</h1>
      <p>{order.restaurant_name}</p>
      <p>Table {order.table_number}</p>
      {!paid&&<p>Payment pending—pay at counter</p>}
      {paid&&<Link href={`/order/bill/${orderId}`}>View / Download Bill</Link>}
      <Link href={`/order/track/${orderId}`}>Track Order</Link>
    </div>
  )
}
