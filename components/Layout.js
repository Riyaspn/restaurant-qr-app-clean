// components/Layout.js
import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useRestaurant } from '../context/RestaurantContext'
import {
  FaBars,
  FaHome,
  FaList,
  FaClock,
  FaTags,
  FaChartBar,
  FaCog,
  FaFileInvoice,
  FaUtensils,
  FaSignOutAlt,
} from 'react-icons/fa'
import { signOutAndRedirect } from '../lib/authActions'

export default function Layout({
  children,
  title,
  showSidebar = false,
  hideChrome = false,
  showCustomerHeader = false,
}) {
  if (hideChrome) return <main style={{ padding: 20 }}>{children}</main>

  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Collapse large sidebar on narrow desktops; drawer controls mobile
  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 1160)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: '100svh' }}>
      <Header
        isCustomer={showCustomerHeader}
        onToggleSidebar={() => setCollapsed((v) => !v)}
        onOpenDrawer={() => setDrawerOpen(true)}
        showSidebar={showSidebar}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showSidebar ? (collapsed ? '64px 1fr' : '240px 1fr') : '1fr',
          transition: 'grid-template-columns .18s ease',
          background: 'var(--bg, #f7f8fa)',
        }}
      >
        {showSidebar && <Sidebar collapsed={collapsed} />}
        <main className="container main-content" style={{ paddingTop: 24, paddingBottom: 40 }}>
          {title && <h1 className="h1" style={{ marginBottom: 16 }}>{title}</h1>}
          {children}
        </main>
      </div>

      {/* Off-canvas drawer for mobile */}
      {showSidebar && (
        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      )}

      <Footer />
    </div>
  )
}

function Header({ isCustomer, onToggleSidebar, onOpenDrawer, showSidebar }) {
  return (
    <header
      className="shell-header"
      style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Desktop toggle (kept), Mobile hamburger (visible via CSS) */}
        {showSidebar && (
          <>
            <button
              aria-label="Toggle sidebar"
              className="desktop-only"
              onClick={onToggleSidebar}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <FaBars color="#111827" />
            </button>
            <button
              aria-label="Open menu"
              className="mobile-only drawer-button"
              onClick={onOpenDrawer}
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40, height: 40,
                borderRadius: 8,
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              <FaBars color="#111827" />
            </button>
          </>
        )}
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
        >
          <img
            src="/cafeqr-logo.svg"
            alt="Cafe QR"
            width={28}
            height={28}
            style={{ objectFit: 'contain', borderRadius: 4 }}
          />
          <strong style={{ color: '#111827', fontSize: 20 }}>Cafe QR</strong>
        </Link>
      </div>

      {!isCustomer && (
        <nav style={{ display: 'flex', gap: 24 }}>
          <Link href="/faq" style={{ color: '#374151', textDecoration: 'none' }}>
            FAQ
          </Link>
        </nav>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only { display: inline-flex !important; }
        }
      `}</style>
    </header>
  )
}

function Sidebar({ collapsed }) {
  const router = useRouter()
  const { restaurant } = useRestaurant()
  const hasAggregatorIntegration =
    Boolean(restaurant?.swiggy_api_key) || Boolean(restaurant?.zomato_api_key)

  const items = getNavItems(hasAggregatorIntegration)

  const itemStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 10,
    padding: '10px 12px',
    borderRadius: 8,
    background: active ? '#fef3c7' : 'transparent',
    color: active ? '#92400e' : '#374151',
    textDecoration: 'none',
    justifyContent: collapsed ? 'center' : 'flex-start',
    transition: 'all .15s ease',
  })

  async function handleSignOut() {
    try {
      await signOutAndRedirect(router.replace)
    } catch (err) {
      alert(`Sign out failed: ${err?.message || 'Unknown error'}`)
    }
  }

  return (
    <aside
      className="sidebar"
      style={{
        background: '#f9fafb',
        borderRight: '1px solid #e5e7eb',
        padding: 12,
        position: 'sticky',
        top: 64,
        height: 'calc(100vh - 64px)',
        overflowY: 'auto',
      }}
    >
      {!collapsed && (
        <div style={{ fontWeight: 700, margin: '6px 6px 12px 6px', color: '#111827' }}>
          Owner Panel
        </div>
      )}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) => {
          const active = router.pathname === it.href || router.pathname.startsWith(it.href + '/')
          return (
            <Link key={it.href} href={it.href} style={itemStyle(active)} title={it.label}>
              <span style={{ display: 'grid', placeItems: 'center', width: 18 }}>{it.icon}</span>
              {!collapsed && <span>{it.label}</span>}
            </Link>
          )
        })}
      </nav>

      <button
        onClick={handleSignOut}
        title="Sign Out"
        style={{
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 8,
          padding: '10px 12px',
          width: '100%',
          background: 'transparent',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          color: '#6b7280',
          cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
      >
        <FaSignOutAlt />
        {!collapsed && <span>Sign Out</span>}
      </button>
    </aside>
  )
}

function MobileDrawer({ open, onClose }) {
  const router = useRouter()
  const { restaurant } = useRestaurant()
  const hasAggregatorIntegration =
    Boolean(restaurant?.swiggy_api_key) || Boolean(restaurant?.zomato_api_key)

  const items = getNavItems(hasAggregatorIntegration)

  const drawerRef = useRef(null)
  const startX = useRef(0)
  const deltaX = useRef(0)
  const tracking = useRef(false)

  // Close on route change
  useEffect(() => {
    const handle = () => onClose()
    router.events.on('routeChangeComplete', handle)
    return () => router.events.off('routeChangeComplete', handle)
  }, [router.events, onClose])

  const onTouchStart = (e) => {
    if (!open && e.touches.clientX > 20) return
    tracking.current = true
    startX.current = e.touches.clientX
    deltaX.current = 0
  }
  const onTouchMove = (e) => {
    if (!tracking.current) return
    deltaX.current = e.touches.clientX - startX.current
    if (!open && deltaX.current < 0) deltaX.current = 0
    if (open && deltaX.current > 0) deltaX.current = 0
    // translate while dragging
    const px = open ? Math.max(-300, deltaX.current) : Math.min(300, -300 + deltaX.current)
    if (drawerRef.current) drawerRef.current.style.transform = `translateX(${open ? px : -300 + deltaX.current}px)`
  }
  const onTouchEnd = () => {
    if (!tracking.current) return
    tracking.current = false
    const threshold = 50
    const shouldOpen = !open && deltaX.current > threshold
    const shouldClose = open && deltaX.current < -threshold
    if (shouldOpen) onClose(false), setTimeout(() => { /* noop open via button */ }, 0)
    if (shouldClose) onClose()
    // reset transform
    if (drawerRef.current) drawerRef.current.style.transform = ''
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        style={{ display: open ? 'block' : 'none' }}
        onClick={onClose}
      />
      <nav
        ref={drawerRef}
        className={`drawer ${open ? 'open' : ''}`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <ul className="drawer-nav">
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', color: '#111827' }}>
                <span style={{ width: 18, display: 'grid', placeItems: 'center' }}>{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <style jsx>{`
        @media (min-width: 769px) {
          .drawer, .drawer-backdrop { display: none !important; }
        }
        .drawer-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 999;
        }
        .drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(80vw, 300px);
          background: #fff;
          border-right: 1px solid #e5e7eb;
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
          transform: translateX(-100%);
          transition: transform .3s ease-out;
          z-index: 1000;
          padding: 12px;
          padding-top: calc(12px + env(safe-area-inset-top));
        }
        .drawer.open { transform: translateX(0); }
        .drawer-nav { list-style: none; margin: 0; padding: 0; }
        .drawer-nav li + li { margin-top: 6px; }
      `}</style>
    </>
  )
}

function getNavItems(hasAggregatorIntegration) {
  const items = [
    { href: '/owner', label: 'Overview', icon: <FaHome /> },
    { href: '/owner/menu', label: 'Menu', icon: <FaList /> },
    { href: '/owner/orders', label: 'Orders', icon: <FaUtensils /> },
    { href: '/owner/counter', label: 'Counter Sale', icon: <FaList /> },
    { href: '/owner/inventory', label: 'Inventory', icon: <FaList /> },
    { href: '/owner/availability', label: 'Availability', icon: <FaClock /> },
    { href: '/owner/promotions', label: 'Promotions', icon: <FaTags /> },
    { href: '/owner/analytics', label: 'Analytics', icon: <FaChartBar /> },
    { href: '/owner/settings', label: 'Settings', icon: <FaCog /> },
    { href: '/owner/billing', label: 'Billing', icon: <FaFileInvoice /> },
  ]
  if (hasAggregatorIntegration) {
    items.push({ href: '/owner/aggregator-poller', label: 'Aggregator Orders', icon: <FaUtensils /> })
  }
  return items
}

function Footer() {
  return (
    <footer
      style={{
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 24px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        fontSize: 14,
        color: '#6b7280',
      }}
    >
      <span>🔒 Powered by The Online Wala</span>
      <span>•</span>
      <span>Secure payments by Razorpay</span>
      <Link href="/privacy-policy" style={{ color: '#2563eb', textDecoration: 'underline' }}>
        Privacy Policy
      </Link>
    </footer>
  )
}
