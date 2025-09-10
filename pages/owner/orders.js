// pages/owner/orders.js
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../services/supabase';
import { useRequireAuth } from '../../lib/useRequireAuth';
import { useRestaurant } from '../../context/RestaurantContext';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import { getToken } from 'firebase/messaging';
import { getMessagingIfSupported } from '../../lib/firebaseClient';
import { Capacitor } from '@capacitor/core';
import { PushNotificationService } from '../../services/pushNotifications';

// Constants
const STATUSES = ['new', 'in_progress', 'ready', 'completed'];
const LABELS   = { new: 'New', in_progress: 'Cooking', ready: 'Ready', completed: 'Done' };
const COLORS   = { new: '#3b82f6', in_progress: '#f59e0b', ready: '#10b981', completed: '#6b7280' };
const VAPID_KEY = 'BOsAl1-5erAp7aw-yA2IqcYSXGxOyWmCTAfegUo_Lekrxll5ukCAz78NgkYeGxBmbjRN_ecq4yQNuySziWPMFnQ';
const PAGE     = 20;
const SHOW_DONE_COUNT = true;

// Helpers
const money = v => `₹${Number(v ?? 0).toFixed(2)}`;
function toDisplayItems(order) {
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.order_items)) {
    return order.order_items.map(oi => ({
      name: oi.menu_items?.name || oi.item_name || 'Item',
      quantity: oi.quantity,
      price: oi.price
    }));
  }
  return [];
}

export default function OrdersPage() {
  const { checking, user } = useRequireAuth();
  const { restaurant, loading: restLoading } = useRestaurant();
  const restaurantId = restaurant?.id;
  const userEmail = user?.email;

  // Debug: verify context timings
  useEffect(() => {
    console.log('Restaurant context debug:', {
      restaurant,
      restaurantId,
      loading: restLoading,
      user: user?.email
    });
  }, [restaurant, restaurantId, restLoading, user]);

  const [ordersByStatus, setOrdersByStatus] = useState({
    new: [], in_progress: [], ready: [], completed: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mobileFilter, setMobileFilter] = useState('new');
  const [completedPage, setCompletedPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState({ open: false, orderId: null });
  const [generatingInvoice, setGeneratingInvoice] = useState(null);

  const mobileList = useMemo(
    () => ordersByStatus[mobileFilter] || [],
    [ordersByStatus, mobileFilter]
  );

  // Load orders when restaurantId is ready
  useEffect(() => {
    if (restaurantId && restaurantId !== 'undefined') {
      setCompletedPage(1);
      loadOrders(1);
    }
  }, [restaurantId]);

  useEffect(() => {
    const handler = () => loadOrders();
    document.addEventListener('reload-orders', handler);
    return () => document.removeEventListener('reload-orders', handler);
  }, []);

  useEffect(() => {
    if (!restaurantId || !userEmail || checking || restLoading) return;
    const setupWebPush = async () => {
      if (!('serviceWorker' in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        await reg.update();
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') throw new Error('Notification denied');
        const msg = await getMessagingIfSupported();
        if (!msg) throw new Error('No web push');
        const token = await getToken(msg, { vapidKey: VAPID_KEY });
        if (!token) throw new Error('No token');
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type':'application/json' },
          body: JSON.stringify({ deviceToken: token, restaurantId, userEmail, platform:'web' })
        });
        console.log('✅ SW registered for push');
      } catch (e) {
        console.error('Web push setup failed', e);
      }
    };
    if (Capacitor.isNativePlatform()) {
      PushNotificationService.initialize(restaurantId, user.id);
    } else {
      setupWebPush();
    }
  }, [restaurantId, userEmail, checking, restLoading]);

  useEffect(() => {
    if (!restaurantId || restaurantId === 'undefined') return;
    const channel = supabase
      .channel(`orders-${restaurantId}`)
      .on('postgres_changes',{
        event:'INSERT', schema:'public', table:'orders',
        filter:`restaurant_id=eq.${restaurantId}`
      },({ new: o }) => {
        if (Notification.permission === 'granted') {
          new Notification('🔔 New Order!', {
            body: `Order #${String(o.id).slice(0,8)}`,
            icon:'/favicon.ico', badge:'/favicon.ico', tag:`order-${o.id}`
          });
        }
        new Audio('/notification-sound.mp3').play().catch(()=>{});
        setOrdersByStatus(prev => ({ ...prev, new: [o, ...(prev.new||[])] }));
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [restaurantId]);

  async function fetchBucket(status, page=1) {
    let q = supabase.from('orders')
      .select('*, order_items(*, menu_items(name))')
      .eq('restaurant_id', restaurantId)
      .eq('status', status);
    if (status === 'completed') {
      const to = page * PAGE - 1;
      const { data, error } = await q.order('created_at',{ascending:false}).range(0,to);
      if (error) throw error;
      return data || [];
    }
    const { data, error } = await q.order('created_at',{ascending:true});
    if (error) throw error;
    return data || [];
  }

  async function loadOrders(page=completedPage) {
    // CRITICAL: Don't load orders if restaurant isn't ready
    if (!restaurantId || restaurantId === 'undefined') {
      console.warn('Cannot load orders: restaurantId not ready', { restaurantId, restaurant });
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [n,i,r,c] = await Promise.all([
        fetchBucket('new'),
        fetchBucket('in_progress'), 
        fetchBucket('ready'),
        fetchBucket('completed', page)
      ]);
        const all = [...n,i,r,c];
        const ids = all.map(o => o.id).filter(Boolean);
        let invMap = {};
        if (ids.length) {
          const { data: invs } = await supabase
            .from('invoices')
            .select('order_id,pdf_url')
            .in('order_id', ids);
          (invs||[]).forEach(inv => invMap[inv.order_id] = inv.pdf_url);
        }
        const attach = rows => rows.map(o => ({
          ...o,
          invoice: invMap[o.id] ? { pdf_url: invMap[o.id] } : null
        }));
        setOrdersByStatus({
          new: attach(n),
          in_progress: attach(i),
          ready: attach(r),
          completed: attach(c)
        });
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
  }

  const loadMoreCompleted = () => {
    const nxt = completedPage + 1;
    setCompletedPage(nxt);
    loadOrders(nxt);
  };

  const liveCount = ['new','in_progress','ready']
    .reduce((sum,s) => sum + (ordersByStatus[s]?.length||0), 0);

  const updateStatus = async (id,status) => {
    try {
      await supabase.from('orders').update({ status })
        .eq('id',id).eq('restaurant_id',restaurantId);
      loadOrders();
    } catch (e) {
      setError(e.message);
    }
  };

  const initiateComplete = (id,method) => {
    if (method==='cash') setConfirm({ open:true, orderId:id });
    else finalizeComplete(id);
  };

  const finalizeComplete = async id => {
    setGeneratingInvoice(id);
    try {
      await supabase.from('orders').update({ status:'completed' })
        .eq('id',id).eq('restaurant_id',restaurantId);
      const resp = await fetch('/api/invoices/generate', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ order_id: id })
      });
      if (!resp.ok) throw new Error('Invoice gen failed');
      loadOrders();
    } catch (e) {
      setError(e.message);
    } finally {
      setGeneratingInvoice(null);
      setConfirm({ open:false, orderId:null });
    }
  };

  if (checking||restLoading) return <div style={{padding:16}}>Loading…</div>;
  if (!restaurantId) return <div style={{padding:16}}>No restaurant found.</div>;

  return (
    <div className="orders-wrap">
      <header className="orders-header">
        <h1>Orders Dashboard</h1>
        <div className="header-actions">
          <span className="muted">{liveCount} live orders</span>
          <Button
            variant="outline"
            onClick={()=>{
              if (!restaurantId || restaurantId === 'undefined') return;
              setCompletedPage(1);
              loadOrders(1);
            }}
          >
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <Card padding={12} style={{background:'#fee2e2',border:'1px solid #fecaca',margin:'0 12px 12px'}}>
          <span style={{color:'#b91c1c'}}>{error}</span>
        </Card>
      )}

      {loading ? (
        <div className="kanban">
          {STATUSES.map(s=>(
            <Card key={s} padding={20} style={{opacity:.5,minHeight:200}}/>
          ))}
        </div>
      ) : (
        <>
          <div className="mobile-filters">
            {STATUSES.map(s=>{
              const cnt = ordersByStatus[s]?.length||0;
              const show = s==='completed' ? (SHOW_DONE_COUNT ? cnt : 0) : cnt;
              return (
                <button key={s}
                  className={`chip ${mobileFilter===s?'chip--active':''}`}
                  onClick={()=>setMobileFilter(s)}>
                  <span className="chip-label">{LABELS[s]}</span>
                  <span className="chip-count">{show}</span>
                </button>
              );
            })}
          </div>

          <div className="mobile-list">
            {mobileList.length===0 ? (
              <Card padding={16} style={{textAlign:'center',color:'#6b7280'}}>
                No {LABELS[mobileFilter].toLowerCase()}
              </Card>
            ) : mobileList.map(o=>(
              <OrderCard key={o.id} order={o}
                statusColor={COLORS[o.status]}
                onSelect={()=>setDetail(o)}
                onStatusChange={updateStatus}
                onComplete={initiateComplete}
                generatingInvoice={generatingInvoice}
              />
            ))}
            {mobileFilter==='completed'&&(ordersByStatus.completed?.length||0)>=PAGE&&(
              <div style={{padding:8,textAlign:'center'}}>
                <Button variant="outline" onClick={loadMoreCompleted}>Load more</Button>
              </div>
            )}
          </div>

          <div className="kanban">
            {STATUSES.map(status=>(
              <Card key={status} padding={12}>
                <div className="kanban-col-header">
                  <strong style={{color:COLORS[status]}}>{LABELS[status]}</strong>
                  <span className="pill">{ordersByStatus[status]?.length||0}</span>
                </div>
                <div className="kanban-col-body">
                  {ordersByStatus[status]?.length===0
                    ? <div className="empty-col">No {LABELS[status].toLowerCase()}</div>
                    : ordersByStatus[status].map(o=>(
                        <OrderCard key={o.id} order={o}
                          statusColor={COLORS[status]}
                          onSelect={()=>setDetail(o)}
                          onStatusChange={updateStatus}
                          onComplete={initiateComplete}
                          generatingInvoice={generatingInvoice}
                        />
                      ))
                  }
                  {status==='completed'&&(ordersByStatus.completed?.length||0)>=PAGE&&(
                    <>
                      <div style={{fontSize:12,color:'#6b7280',marginTop:4}}>
                        Showing latest {ordersByStatus.completed.length} completed orders
                      </div>
                      <div style={{paddingTop:8}}>
                        <Button variant="outline" onClick={loadMoreCompleted}>Load more</Button>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {detail && (
        <OrderDetailModal order={detail}
          onClose={()=>setDetail(null)}
          onCompleteOrder={initiateComplete}
          generatingInvoice={generatingInvoice}
        />
      )}

      {confirm.open && (
        <ConfirmDialog title="Confirm Payment Received"
          message="Has the customer paid at the counter?"
          confirmText="Yes" cancelText="No"
          onConfirm={()=>finalizeComplete(confirm.orderId)}
          onCancel={()=>setConfirm({open:false,orderId:null})}
        />
      )}

      <style jsx>{`
        .orders-wrap {padding:12px 0 32px;}
        .orders-header{display:flex;justifyContent:space-between;alignItems:center;padding:0 12px 12px;}
        .orders-header h1{margin:0;font-size:clamp(20px,2.6vw,28px);}
        .header-actions{display:flex;alignItems:center;gap:10px;flexWrap:wrap;}
        .muted{color:#6b7280;font-size:14px;}
        .mobile-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:0 12px 12px;}
        .chip{border:1px solid #e5e7eb;border-radius:14px;padding:10px;display:flex;gap:8px;alignItems:center;justifyContent:center;background:#fff;box-shadow:0 1px 0 rgba(0,0,0,0.02);}
        .chip--active{background:#eef2ff;border-color:#c7d2fe;}
        .chip-label{font-weight:600;color:#111827;font-size:13px;}
        .chip-count{background:#111827;color:#fff;border-radius:999px;padding:0 8px;font-size:12px;font-weight:700;}
        .mobile-list{display:grid;gap:10px;padding:0 12px;}
        .kanban{display:none;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;padding:12px 16px;}
        .kanban-col-header{display:flex;justifyContent:space-between;alignItems:center;margin-bottom:8px;}
        .pill{background:#f3f4f6;padding:4px 10px;border-radius:999px;font-size:12px;}
        .kanban-col-body{display:flex;flex-direction:column;gap:10px;max-height:70vh;overflow:auto;}
        .empty-col{text-align:center;color:#9ca3af;padding:20px;border:1px dashed #e5e7eb;border-radius:8px;}
        @media(min-width:1024px){.mobile-filters,.mobile-list{display:none;}.kanban{display:grid;}}
      `}</style>
    </div>
  );
}

// OrderCard Component
function OrderCard({ order, statusColor, onSelect, onStatusChange, onComplete, generatingInvoice }) {
  const items = toDisplayItems(order);
  const hasInvoice = Boolean(order?.invoice?.pdf_url);
  const total = Number(order.total_inc_tax ?? order.total_amount ?? 0);
  const table = order.table_number;
  return (
    <Card padding={12} style={{
      cursor:'pointer',borderRadius:12,boxShadow:'0 1px 2px rgba(0,0,0,0.04)',border:'1px solid #eef2f7'
    }} onClick={onSelect}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:8,overflowWrap:'anywhere'}}>
          <strong>#{order.id.slice(0,8)}</strong>
          {table && <span style={{fontSize:12,fontWeight:700,color:'#334155',background:'#f1f5f9',border:'1px solid #e2e8f0',padding:'2px 8px',borderRadius:999}}>Table {table}</span>}
        </div>
        <span style={{color:'#6b7280',fontSize:12}}>{new Date(order.created_at).toLocaleTimeString()}</span>
      </div>
      <div style={{margin:'8px 0',fontSize:14,color:'#111827'}}>
        {items.slice(0,2).map((it,i)=><div key={i}>{it.quantity}× {it.name}</div>)}
        {items.length>2 && <div style={{color:'#9ca3af'}}>+{items.length-2} more</div>}
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
        <span style={{fontSize:16,fontWeight:700}}>{money(total)}</span>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}} onClick={e=>e.stopPropagation()}>
          {order.status==='new' && <Button size="sm" onClick={()=>onStatusChange(order.id,'in_progress')}>Start</Button>}
          {order.status==='in_progress' && <Button size="sm" variant="success" onClick={()=>onStatusChange(order.id,'ready')}>Ready</Button>}
          {order.status==='ready' && !hasInvoice && <Button size="sm" onClick={()=>onComplete(order.id,order.payment_method)} disabled={generatingInvoice===order.id}>{generatingInvoice===order.id?'Processing…':'Done'}</Button>}
          {hasInvoice && <Button size="sm" variant="outline" onClick={()=>window.open(order.invoice.pdf_url,'_blank')}>Bill</Button>}
          {!hasInvoice && order.status==='completed' && (
            <Button size="sm" onClick={async()=>{
              const win = window.open('about:blank');
              try {
                const resp = await fetch('/api/invoices/generate', {
                  method:'POST',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({ order_id: order.id })
                });
                if (resp.ok) {
                  const { pdf_url } = await resp.json();
                  if (pdf_url && win) {
                    win.location = pdf_url;
                    // After opening the PDF, refresh orders shortly after to avoid stale UI on return
                    setTimeout(() => document.dispatchEvent(new CustomEvent('reload-orders')), 1500);
                  } else {
                    if (win) win.close();
                  }
                } else {
                  if (win) win.close();
                  throw new Error('Invoice gen failed');
                }
              } catch (err) {
                if (win) win.close();
                console.error('Generate bill error', err);
              }
            }} disabled={generatingInvoice===order.id}>
              {generatingInvoice===order.id?'Processing…':'Generate Bill'}
            </Button>
          )}
        </div>
      </div>
      <div style={{height:2,marginTop:10,borderRadius:2,background:statusColor,opacity:0.2}}/>
    </Card>
  );
}

// OrderDetailModal Component
function OrderDetailModal({ order, onClose, onCompleteOrder, generatingInvoice }) {
  const items = toDisplayItems(order);
  const hasInvoice = Boolean(order?.invoice?.pdf_url);
  const subtotal = Number(order.subtotal_ex_tax ?? order.subtotal ?? 0);
  const tax      = Number(order.total_tax ?? order.tax_amount ?? 0);
  const total    = Number(order.total_inc_tax ?? order.total_amount ?? 0);
  const table    = order.table_number;
  return (
    <div className="modal" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal__card" style={{maxWidth:520}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8}}>
          <h2 style={{margin:0}}>Order #{order.id.slice(0,8)}</h2>
          <Button variant="outline" onClick={onClose}>×</Button>
        </div>
        <Card padding={16}>
          <div><strong>Time:</strong> {new Date(order.created_at).toLocaleString()}</div>
          <div><strong>Table:</strong> {table||'—'}</div>
          <div><strong>Payment:</strong> {order.payment_method}</div>
        </Card>
        <Card padding={16} style={{marginTop:12}}>
          <h3 style={{marginTop:0}}>Items</h3>
          {items.map((it,i)=><div key={i} style={{display:'flex',justifyContent:'space-between'}}><span>{it.quantity}× {it.name}</span><span>{money(it.quantity*it.price)}</span></div>)}
        </Card>
        <Card padding={16} style={{marginTop:12}}>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between'}}><span>Tax</span><span>{money(tax)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontWeight:700,marginTop:6}}><span>Total</span><span>{money(total)}</span></div>
        </Card>
        <div style={{textAlign:'right',marginTop:12}}>
          {!hasInvoice && order.status==='ready' && (
            <Button onClick={()=>onCompleteOrder(order.id,order.payment_method)} disabled={generatingInvoice===order.id}>
              {generatingInvoice===order.id?'Generating…':'Generate Invoice'}
            </Button>
          )}
          {hasInvoice && (
            <Button variant="outline" onClick={()=>window.open(order.invoice.pdf_url,'_blank')}>
              View Invoice
            </Button>
          )}
        </div>
      </div>
      <style jsx>{`
        .modal {position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;alignItems:center;justifyContent:center;z-index:50;padding:12px;}
        .modal__card {background:#fff;width:100%;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.15);max-height:92vh;overflow:auto;}
      `}</style>
    </div>
  );
}

// ConfirmDialog Component
function ConfirmDialog({ title,message,confirmText,cancelText,onConfirm,onCancel }) {
  return (
    <div className="modal" onClick={e=>e.target===e.currentTarget&&onCancel()}>
      <div className="modal__card" style={{maxWidth:420}}>
        <h3 style={{marginTop:12}}>{title}</h3>
        <p style={{margin:'8px 0 16px',color:'#374151'}}>{message}</p>
        <div style={{display:'flex',justifyContent:'flex-end',gap:8,paddingBottom:12,flexWrap:'wrap'}}>
          <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
          <Button onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
      <style jsx>{`
        .modal {position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;alignItems:center;justifyContent:center;z-index:50;padding:12px;}
        .modal__card {background:#fff;width:100%;padding:16px;border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.15);}
      `}</style>
    </div>
  );
}
