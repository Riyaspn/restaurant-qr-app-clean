// components/Shell.js
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Shell({ children, showSidebar = false }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)         // mobile drawer open
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // desktop rail collapse
  const [isMobile, setIsMobile] = useState(false)

  // Determine mobile/desktop and initialize states
  useEffect(() => {
    const initFromSession = () => {
      try {
        const stored = sessionStorage.getItem('sidebarCollapsed')
        if (stored != null) setSidebarCollapsed(stored === '1')
      } catch {}
    }

    const check = () => {
      if (typeof window === 'undefined') return
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      } else {
        // open state is controlled by collapse (desktop), drawer (mobile)
        if (showSidebar) initFromSession()
      }
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [showSidebar])

  const toggleDesktopCollapse = () => {
    const next = !sidebarCollapsed
    setSidebarCollapsed(next)
    try { sessionStorage.setItem('sidebarCollapsed', next ? '1' : '0') } catch {}
  }

  return (
    <>
      <div className="shell-container">
        {/* Header */}
        <header className="shell-header">
          <div className="header-content">
            {isMobile && showSidebar && (
              <button
                className="menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Menu"
              >
                ☰
              </button>
            )}

            {/* Non-clickable branding */}
            <div className="logo">
              <Image src="/cafeqr-logo.svg" alt="Cafe QR" width={32} height={32} priority />
              <span>Cafe QR</span>
            </div>

            <nav className="header-nav">
              <a href="/">Home</a>
              <a href="/faq">FAQ</a>
            </nav>
          </div>
        </header>

        {/* Body */}
        <div className="main-layout">
          {isMobile && showSidebar && sidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          )}

          {showSidebar && (
            <aside
              className={[
                'sidebar',
                isMobile ? (sidebarOpen ? 'open' : '') : '',
                sidebarCollapsed ? 'collapsed' : '',
              ].join(' ')}
            >
              <div className="sidebar-content">
                <div className="sidebar-header">
                  <h2 className="sidebar-title">Owner Panel</h2>

                  {/* Desktop collapse toggle */}
                  {!isMobile && (
                    <button
                      className="collapse-btn"
                      onClick={toggleDesktopCollapse}
                      title={sidebarCollapsed ? 'Expand' : 'Collapse'}
                      aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                      {sidebarCollapsed ? '»' : '«'}
                    </button>
                  )}

                  {/* Mobile close */}
                  {isMobile && (
                    <button className="close-btn" onClick={() => setSidebarOpen(false)} aria-label="Close">×</button>
                  )}
                </div>

                {/* Vertical stacked nav */}
                <nav className="sidebar-nav">
                  <Link href="/dashboard" className="nav-item">
                    <span className="nav-icon">📊</span><span className="nav-text">Overview</span>
                  </Link>
                  <Link href="/menu" className="nav-item">
                    <span className="nav-icon">🍽️</span><span className="nav-text">Menu</span>
                  </Link>
                  <Link href="/orders" className="nav-item">
                    <span className="nav-icon">📋</span><span className="nav-text">Orders</span>
                  </Link>
                  <Link href="/availability" className="nav-item">
                    <span className="nav-icon">⚠️</span><span className="nav-text">Availability</span>
                  </Link>
                  <Link href="/promotions" className="nav-item">
                    <span className="nav-icon">🎯</span><span className="nav-text">Promotions</span>
                  </Link>
                  <Link href="/analytics" className="nav-item">
                    <span className="nav-icon">📈</span><span className="nav-text">Analytics</span>
                  </Link>
                  <Link href="/settings" className="nav-item">
                    <span className="nav-icon">⚙️</span><span className="nav-text">Settings</span>
                  </Link>
                  <Link href="/billing" className="nav-item">
                    <span className="nav-icon">🧾</span><span className="nav-text">Billing</span>
                  </Link>

                  <div className="nav-divider" />

                  <Link href="/logout" className="nav-item logout">
                    <span className="nav-icon">🚪</span><span className="nav-text">Sign Out</span>
                  </Link>
                </nav>
              </div>
            </aside>
          )}

          <main className="main-content">
            <div className="content-wrapper">{children}</div>
          </main>
        </div>

        {/* Footer (centered) */}
        <footer className="shell-footer">
          <div className="footer-content">
            <span>
              🔒 Powered by The Online Wala • Secure payments by Cashfree •{' '}
              <a href="/privacy-policy" className="footer-link">Privacy Policy</a>
            </span>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .shell-container {
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          width: 100%;
          background: #f8f9fa;
        }

        /* Header */
        .shell-header {
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
        }
        .menu-toggle {
          display: none;
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          z-index: 60;
        }
        @media (max-width: 767px) { .menu-toggle { display: block; } }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: inherit;
        }

        .header-nav {
          display: flex;
          gap: 1.5rem;
        }
        .header-nav a {
          color: #6b7280;
          text-decoration: none;
          font-weight: 500;
        }
        .header-nav a:hover { color: #374151; }

        /* Layout */
        .main-layout { display: flex; flex: 1; min-height: 0; }

        /* Sidebar */
        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }

        .sidebar {
          background: #fff;
          border-right: 1px solid #e5e7eb;
          transition: width 0.2s ease, transform 0.3s ease;
          width: 280px;
          will-change: width, transform;
        }

        /* Collapsed rail (desktop only, no hover-to-peek) */
        @media (min-width: 768px) {
          .sidebar.collapsed { width: 64px; }
          .sidebar.collapsed .sidebar-title { opacity: 0; pointer-events: none; }
          .sidebar.collapsed .nav-text { opacity: 0; width: 0; overflow: hidden; }
          .sidebar.collapsed .nav-item { justify-content: center; }
          .sidebar.collapsed .collapse-btn { transform: rotate(180deg); }
        }

        /* Mobile drawer */
        @media (max-width: 767px) {
          .sidebar {
            position: fixed;
            top: 0;
            left: 0;
            height: 100vh;
            transform: translateX(-100%);
            z-index: 45;
            box-shadow: 2px 0 8px rgba(0,0,0,0.1);
          }
          .sidebar.open { transform: translateX(0); }
        }

        .sidebar-content { display: flex; flex-direction: column; height: 100%; }

        .sidebar-header {
          padding: 0.75rem;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .sidebar-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
          transition: opacity 0.2s ease;
        }
        .collapse-btn, .close-btn {
          background: none;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 0.9rem;
          cursor: pointer;
        }

        /* Vertical stacked nav items */
        .sidebar-nav {
          flex: 1;
          padding: 0.5rem 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: #374151;
          text-decoration: none;
          transition: background 0.2s, color 0.2s;
          border-left: 3px solid transparent;
          border-radius: 0 6px 6px 0;
        }
        .nav-item:hover { background: #f9fafb; color: #111827; }
        .nav-icon { font-size: 1.25rem; min-width: 20px; text-align: center; }
        .nav-text { font-size: 1rem; white-space: nowrap; transition: opacity 0.2s ease; }
        .nav-divider { height: 1px; background: #f3f4f6; margin: 8px 1rem; }
        .logout { color: #dc2626; }

        /* Content */
        .main-content { flex: 1; overflow-x: auto; padding: 1rem; width: 100%; }
        .content-wrapper { max-width: 1200px; margin: 0 auto; }

        /* Footer (centered) */
        .shell-footer { background: #fff; border-top: 1px solid #e5e7eb; }
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          font-size: 0.95rem;
          text-align: center;
        }
        .footer-link { color: #3498db; text-decoration: underline; }
      `}</style>
    </>
  )
}
