// components/Shell.js
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Shell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      if (typeof window === 'undefined') return
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setSidebarOpen(!mobile)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return (
    <>
      <div className="shell-container">
        {/* Header */}
        <header className="shell-header">
          <div className="header-content">
            {isMobile && (
              <button
                className="menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Menu"
              >
                ☰
              </button>
            )}

            <Link href="/" className="logo-link">
              <div className="logo">
                <Image src="/cafeqr-logo.svg" alt="Cafe QR" width={32} height={32} priority />
                <span>Cafe QR</span>
              </div>
            </Link>

            <nav className="header-nav">
              <Link href="/">Home</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/login">Login</Link>
            </nav>
          </div>
        </header>

        {/* Body */}
        <div className="main-layout">
          {isMobile && sidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          )}

          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-content">
              <div className="sidebar-header">
                <h2>Owner Panel</h2>
                {isMobile && (
                  <button className="close-btn" onClick={() => setSidebarOpen(false)}>×</button>
                )}
              </div>

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

          <main className="main-content">
            <div className="content-wrapper">{children}</div>
          </main>
        </div>

        {/* Footer */}
        <footer className="shell-footer">
          <div className="footer-content">
            <div>🔒 Powered by The Online Wala • Secure payments by Cashfree</div>
            <div>
              <Link href="/privacy-policy">Privacy Policy</Link>
            </div>
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
        .logo-link { text-decoration: none; color: inherit; display: flex; align-items: center; gap: 0.5rem; }
        .logo { font-size: 1.25rem; font-weight: 600; }
        .header-nav { display: flex; gap: 1.5rem; }
        .header-nav :global(a) { color: #6b7280; text-decoration: none; font-weight: 500; }
        .header-nav :global(a:hover) { color: #374151; }
        @media (max-width: 767px) {
          .header-nav :global(a[href="/"]), 
          .header-nav :global(a[href="/faq"]), 
          .header-nav :global(a[href="/login"]) { display: none; }
        }

        /* Body */
        .main-layout { display: flex; flex: 1; min-height: 0; }
        .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 40; }
        .sidebar {
          background: #fff;
          border-right: 1px solid #e5e7eb;
          transition: transform 0.3s ease;
          width: 280px;
        }
        @media (max-width: 767px) {
          .sidebar {
            position: fixed; top: 0; left: 0; height: 100vh;
            transform: translateX(${sidebarOpen ? '0' : '-100%'});
            z-index: 45; box-shadow: 2px 0 8px rgba(0,0,0,0.1);
          }
        }
        .sidebar-content { display: flex; flex-direction: column; height: 100%; }
        .sidebar-header {
          padding: 1rem; border-bottom: 1px solid #f3f4f6;
          display: flex; align-items: center; justify-content: space-between;
        }
        .close-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; }
        .sidebar-nav { flex: 1; padding: 0.5rem 0; }
        .nav-item {
          display: flex; align-items: center; gap: 0.75rem;
          padding: 0.75rem 1rem; color: #6b7280; text-decoration: none;
          transition: background 0.2s, color 0.2s; border-left: 3px solid transparent;
          width: 100%;
        }
        .nav-item:hover { background: #f9fafb; color: #374151; }
        .nav-icon { font-size: 1.25rem; }
        .nav-text { font-size: 1rem; }
        .nav-divider { height: 1px; background: #f3f4f6; margin: 0.5rem 1rem; }
        .logout { color: #dc2626; }

        .main-content { flex: 1; overflow-x: auto; padding: 1rem; width: 100%; }
        .content-wrapper { max-width: 1200px; margin: 0 auto; }

        /* Footer */
        .shell-footer {
          background: #fff;
          border-top: 1px solid #e5e7eb;
        }
        .footer-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0.75rem 1rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #6b7280;
          font-size: 0.95rem;
        }
        .footer-content :global(a) {
          color: #3498db;
          text-decoration: none;
        }
      `}</style>
    </>
  )
}
