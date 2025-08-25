// components/Layout.js
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
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
} from 'react-icons/fa';
import { signOutAndRedirect } from '../lib/authActions';

export default function Layout({
  children,
  title,
  showSidebar = false,
  hideChrome = false,
  showCustomerHeader = false,
}) {
  if (hideChrome) return <main style={{ padding: 20 }}>{children}</main>;

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 1160);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: '100vh' }}>
      <Header
        isCustomer={showCustomerHeader}
        onToggleSidebar={() => setCollapsed((v) => !v)}
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
        <main className="container" style={{ paddingTop: 24, paddingBottom: 40 }}>
          {title && <h1 className="h1" style={{ marginBottom: 16 }}>{title}</h1>}
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
}

function Header({ isCustomer, onToggleSidebar }) {
  return (
    <header
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
        <button
          aria-label="Toggle sidebar"
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
    </header>
  );
}

function Sidebar({ collapsed }) {
  const router = useRouter();

  const items = [
    { href: '/owner', label: 'Overview', icon: <FaHome /> },
    { href: '/owner/menu', label: 'Menu', icon: <FaList /> },
    { href: '/owner/orders', label: 'Orders', icon: <FaUtensils /> },
    { href: '/owner/availability', label: 'Availability', icon: <FaClock /> },
    { href: '/owner/promotions', label: 'Promotions', icon: <FaTags /> },
    { href: '/owner/analytics', label: 'Analytics', icon: <FaChartBar /> },
    { href: '/owner/settings', label: 'Settings', icon: <FaCog /> },
    { href: '/owner/billing', label: 'Billing', icon: <FaFileInvoice /> },
  ];

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
  });

  async function handleSignOut() {
    try {
      await signOutAndRedirect(router.replace);
    } catch (err) {
      alert(`Sign out failed: ${err?.message || 'Unknown error'}`);
    }
  }

  return (
    <aside
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
          const active = router.pathname === it.href || router.pathname.startsWith(it.href + '/');
          return (
            <Link key={it.href} href={it.href} style={itemStyle(active)} title={it.label}>
              <span style={{ display: 'grid', placeItems: 'center', width: 18 }}>{it.icon}</span>
              {!collapsed && <span>{it.label}</span>}
            </Link>
          );
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
  );
}

function Footer() {
  return (
    <footer
      style={{
        background: '#fff',
        borderTop: '1px solid #e5e7eb',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'center',
        gap: 12,
        fontSize: 14,
        color: '#6b7280',
      }}
    >
      <span>🔒 Powered by The Online Wala</span>
      <span>•</span>
      <span>Secure payments by Cashfree</span>
      <Link href="/privacy-policy" style={{ color: '#2563eb', textDecoration: 'underline' }}>
        Privacy Policy
      </Link>
    </footer>
  );
}
