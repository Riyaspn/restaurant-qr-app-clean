// components/Shell.js
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../services/supabase'

export default function Shell({ children }) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Close menu when route changes (basic UX)
  const onNavClick = () => setMenuOpen(false)

  return (
    <div className="shell" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile header */}
      <header
        className="shell-header"
        style={{
          display: 'none',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: '1px solid #eee',
          background: '#fff',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <strong>Owner Panel</strong>
        <button
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Toggle menu"
          style={{
            border: '1px solid #ddd',
            background: '#fff',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          ☰ Menu
        </button>
      </header>

      {/* Sidebar */}
      <aside
        className="shell-aside"
        style={{
          width: 240,
          borderRight: '1px solid #eee',
          padding: 16,
          backgroundColor: '#f9f9f9',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
        // Inline responsive behavior: hide on small screens unless menuOpen
      >
        <div className="shell-aside-inner" style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <h3 className="shell-title" style={{ marginTop: 0, marginBottom: 24 }}>Owner Panel</h3>

          <NavItem href="/dashboard" label="📊 Overview" onClick={onNavClick} />
          <NavItem href="/menu" label="🍽️ Menu" onClick={onNavClick} />
          <NavItem href="/orders" label="📋 Orders" onClick={onNavClick} />
          <NavItem href="/availability" label="⏰ Availability" onClick={onNavClick} />
          <NavItem href="/promotions" label="🎟️ Promotions" onClick={onNavClick} />
          <NavItem href="/analytics" label="📈 Analytics" onClick={onNavClick} />
          <NavItem href="/settings" label="⚙️ Settings" onClick={onNavClick} />

          <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #eee' }}>
            <button
              onClick={signOut}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile menu (shown only when menuOpen on small screens via CSS) */}
      {menuOpen && (
        <div
          className="shell-backdrop"
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 10,
            display: 'none',
          }}
        />
      )}

      <main className="shell-main" style={{ flex: 1, padding: 24, backgroundColor: '#fff' }}>
        {/* Mobile-only menu drawer (CSS controls visibility) */}
        <div
          className="shell-mobile-drawer"
          style={{
            display: 'none',
            borderBottom: '1px solid #eee',
            marginBottom: 12,
            paddingBottom: 8,
          }}
        >
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
            style={{
              border: '1px solid #ddd',
              background: '#fff',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            ☰ Menu
          </button>
        </div>

        {children}
      </main>

      {/* Inline style tag to hook into menuOpen on mobile without JS media queries */}
      <style jsx>{`
        /* Show the header on small screens */
        @media (max-width: 768px) {
          .shell-header { display: flex; }

          /* Sidebar becomes an overlay drawer */
          .shell-aside {
            position: fixed !important;
            left: ${menuOpen ? '0' : '-260px'};
            top: 0;
            height: 100vh !important;
            z-index: 30;
            transition: left 0.2s ease;
            width: 240px !important;
          }

          .shell-backdrop { display: ${menuOpen ? 'block' : 'none'}; }

          /* Push main below header and add padding */
          .shell-main {
            padding: 12px !important;
            margin-top: 0;
          }

          /* Hide the desktop title inside the sidebar header to avoid duplication */
          .shell-title { display: none; }
        }
      `}</style>
    </div>
  )
}

function NavItem({ href, label, onClick }) {
  const router = useRouter()
  const isActive = router.pathname === href

  return (
    <div style={{ marginBottom: 8 }}>
      <Link
        href={href}
        onClick={onClick}
        style={{
          color: isActive ? '#0070f3' : '#333',
          textDecoration: 'none',
          fontWeight: isActive ? 600 : 400,
          display: 'block',
          padding: '8px 12px',
          borderRadius: 4,
          backgroundColor: isActive ? '#f0f8ff' : 'transparent',
        }}
      >
        {label}
      </Link>
    </div>
  )
}
