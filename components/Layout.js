// components/Layout.js
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useRestaurant } from '../context/RestaurantContext';
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

  const [collapsed, setCollapsed] = useState(false);   // desktop collapse
  const [mobileOpen, setMobileOpen] = useState(false); // mobile drawer

  useEffect(() => {
    const onResize = () => setCollapsed(window.innerWidth < 1160);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleHamburger = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setMobileOpen(true);
    } else {
      setCollapsed((v) => !v);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', minHeight: '100svh' }}>
      <Header
        isCustomer={showCustomerHeader}
        showSidebar={showSidebar}
        onHamburger={handleHamburger}
      />

      <div className="main-wrapper">
        {/* Desktop/tablet sidebar only */}
        {showSidebar && (
          <div className="desktop-sidebar">
            <Sidebar collapsed={collapsed} />
          </div>
        )}

        <main className="container main-content" style={{ paddingTop: 24, paddingBottom: 40 }}>
          {title && <h1 className="h1" style={{ marginBottom: 16 }}>{title}</h1>}
          {children}
        </main>
      </div>

      {/* Mobile-only overlay drawer */}
      {showSidebar && (
        <>
          <div
            className="drawer-backdrop"
            style={{ display: mobileOpen ? 'block' : 'none' }}
            onClick={() => setMobileOpen(false)}
          />
          <aside className={`drawer ${mobileOpen ? 'drawer--open' : ''}`}>
            <MobileSidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </>
      )}

      <Footer />

      <style jsx>{`
        .main-wrapper {
          display: grid;
          grid-template-columns: ${showSidebar ? (collapsed ? '64px 1fr' : '240px 1fr') : '1fr'};
          transition: grid-template-columns .18s ease;
          background: var(--bg, #f7f8fa);
        }

        /* Hide desktop sidebar on phones; use overlay drawer there */
        .desktop-sidebar { display: block; }
        @media (max-width: 768px) {
          .main-wrapper { grid-template-columns: 1fr !important; }
          .desktop-sidebar { display: none; }
        }

        /* Drawer (mobile only) */
        .drawer-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.35);
          z-index: 999;
        }
        .drawer {
          position: fixed; top: 0; left: 0; bottom: 0;
          width: min(80vw, 300px);
          background: #f9fafb;
          border-right: 1px solid #e5e7eb;
          transform: translateX(-100%);
          transition: transform .28s ease-out;
          z-index: 1000;
          padding: 12px;
          padding-top: calc(12px + env(safe-area-inset-top));
          overflow-y: auto;
        }
        .drawer--open { transform: translateX(0); }
        @media (min-width: 769px) {
          .drawer, .drawer-backdrop { display: none; }
        }
      `}</style>
    </div>
  );
}

function Header({ isCustomer, onHamburger, showSidebar }) {
  return (
    <header
      className="shell-header"
      style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {showSidebar && (
          <button
            aria-label="Toggle sidebar"
            onClick={onHamburger}
            className="sidebar-toggle"
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
              marginRight: 12,
            }}
          >
            <FaBars color="#111827" />
          </button>
        )}
        {/* Non-clickable logo + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src="/cafeqr-logo.svg"
            alt="Cafe QR"
            width={28}
            height={28}
            style={{ objectFit: 'contain', borderRadius: 4 }}
          />
          <strong style={{ color: '#111827', fontSize: 20 }}>Cafe QR</strong>
        </div>
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
  const { restaurant } = useRestaurant();

  const hasAggregatorIntegration =
    Boolean(restaurant?.swiggy_api_key) || Boolean(restaurant?.zomato_api_key);

  const items = getNavItems(hasAggregatorIntegration);

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

function MobileSidebar({ onNavigate }) {
  const { restaurant } = useRestaurant();
  const hasAggregatorIntegration =
    Boolean(restaurant?.swiggy_api_key) || Boolean(restaurant?.zomato_api_key);

  const items = getNavItems(hasAggregatorIntegration);

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 700, margin: '6px 6px 12px 6px', color: '#111827' }}>Owner Panel</div>
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          onClick={onNavigate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 12px',
            borderRadius: 8,
            color: '#374151',
            textDecoration: 'none',
          }}
        >
          <span style={{ display: 'grid', placeItems: 'center', width: 18 }}>{it.icon}</span>
          <span>{it.label}</span>
        </Link>
      ))}
    </nav>
  );
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
  ];
  if (hasAggregatorIntegration) {
    items.push({ href: '/owner/aggregator-poller', label: 'Aggregator Orders', icon: <FaUtensils /> });
  }
  return items;
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
  );
}
