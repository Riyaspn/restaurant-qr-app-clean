// components/Shell.js
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Shell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window === 'undefined') return
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true)
      else setSidebarOpen(false)
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return (
    <>
      <div className="shell-container">
        {/* Single Header */}
        <header className="shell-header">
          <div className="header-content">
            <div className="header-left">
              {isMobile && (
                <button
                  className="menu-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label="Toggle menu"
                >
                  <div className={`hamburger ${sidebarOpen ? 'active' : ''}`}>
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </button>
              )}
              <Link href="/" className="logo-link">
                <div className="logo">
                  <Image src="/cafeqr-logo.svg" alt="Cafe QR" width={24} height={24} priority />
                  <span>Cafe QR</span>
                </div>
              </Link>
            </div>
            <nav className="header-nav">
              <Link href="/">Home</Link>
              <Link href="/faq">FAQ</Link>
              <Link href="/login">Login</Link>
            </nav>
          </div>
        </header>

        {/* Main Layout */}
        <div className="main-layout">
          {/* Sidebar Overlay for Mobile */}
          {isMobile && sidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-content">
              <div className="sidebar-header">
                <h2>Owner Panel</h2>
                {isMobile && (
                  <button 
                    className="close-btn"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close"
                  >
                    ×
                  </button>
                )}
              </div>
              
              <nav className="sidebar-nav">
                <Link href="/dashboard" className="nav-item">
                  <span className="nav-icon">📊</span>
                  <span className="nav-text">Overview</span>
                </Link>
                <Link href="/menu" className="nav-item">
                  <span className="nav-icon">🍽️</span>
                  <span className="nav-text">Menu</span>
                </Link>
                <Link href="/orders" className="nav-item">
                  <span className="nav-icon">📋</span>
                  <span className="nav-text">Orders</span>
                </Link>
                <Link href="/availability" className="nav-item">
                  <span className="nav-icon">⚠️</span>
                  <span className="nav-text">Availability</span>
                </Link>
                <Link href="/promotions" className="nav-item">
                  <span className="nav-icon">🎯</span>
                  <span className="nav-text">Promotions</span>
                </Link>
                <Link href="/analytics" className="nav-item">
                  <span className="nav-icon">📈</span>
                  <span className="nav-text">Analytics</span>
                </Link>
                <Link href="/settings" className="nav-item">
                  <span className="nav-icon">⚙️</span>
                  <span className="nav-text">Settings</span>
                </Link>
                <Link href="/billing" className="nav-item">
                  <span className="nav-icon">🧾</span>
                  <span className="nav-text">Billing</span>
                </Link>
                
                <div className="nav-divider"></div>
                
                <Link href="/logout" className="nav-item logout">
                  <span className="nav-icon">🚪</span>
                  <span className="nav-text">Sign Out</span>
                </Link>
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="main-content">
            <div className="content-wrapper">
              {children}
            </div>
          </main>
        </div>
      </div>

      <style jsx>{`
        .shell-container {
          min-height: 100vh;
          background: #f8f9fa;
          display: flex;
          flex-direction: column;
        }

        /* Header Styles */
        .shell-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 50;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .logo-link {
          text-decoration: none;
          color: inherit;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 600;
          color: #1f2937;
          font-size: 1.125rem;
        }

        .menu-toggle {
          display: none;
          background: none;
          border: none;
          padding: 0.5rem;
          cursor: pointer;
          border-radius: 0.375rem;
        }

        .menu-toggle:hover {
          background: #f3f4f6;
        }

        .hamburger {
          width: 20px;
          height: 16px;
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .hamburger span {
          display: block;
          height: 2px;
          width: 100%;
          background: #374151;
          border-radius: 1px;
          transition: all 0.3s ease;
        }

        .hamburger.active span:nth-child(1) {
          transform: rotate(45deg) translate(5px, 5px);
        }

        .hamburger.active span:nth-child(2) {
          opacity: 0;
        }

        .hamburger.active span:nth-child(3) {
          transform: rotate(-45deg) translate(7px, -6px);
        }

        .header-nav {
          display: flex;
          gap: 2rem;
        }

        .header-nav :global(a) {
          color: #6b7280;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }

        .header-nav :global(a:hover) {
          color: #1f2937;
        }

        /* Main Layout */
        .main-layout {
          display: flex;
          flex: 1;
          position: relative;
        }

        .sidebar-overlay {
          position: fixed;
          inset: 0;
          top: 60px;
          background: rgba(0, 0, 0, 0.5);
          z-index: 40;
          display: none;
        }

        /* Sidebar */
        .sidebar {
          width: 260px;
          background: white;
          border-right: 1px solid #e5e7eb;
          position: sticky;
          top: 60px;
          height: calc(100vh - 60px);
          overflow-y: auto;
          flex-shrink: 0;
        }

        .sidebar-content {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          padding: 1.5rem 1rem 1rem;
          border-bottom: 1px solid #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .sidebar-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0.25rem;
          border-radius: 0.25rem;
          display: none;
        }

        .close-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .sidebar-nav {
          flex: 1;
          padding: 1rem 0;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          color: #6b7280;
          text-decoration: none;
          transition: all 0.2s;
          border-left: 3px solid transparent;
        }

        .nav-item:hover {
          background: #f9fafb;
          color: #374151;
          border-left-color: #e5e7eb;
        }

        .nav-item.active,
        .nav-item:global(.active) {
          background: #eff6ff;
          color: #2563eb;
          border-left-color: #2563eb;
        }

        .nav-icon {
          font-size: 1.25rem;
          width: 1.5rem;
          height: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-text {
          font-weight: 500;
        }

        .nav-divider {
          height: 1px;
          background: #f3f4f6;
          margin: 0.5rem 1rem;
        }

        .logout {
          color: #dc2626 !important;
          margin-top: 0.5rem;
        }

        .logout:hover {
          background: #fef2f2 !important;
          border-left-color: #fca5a5 !important;
        }

        /* Main Content */
        .main-content {
          flex: 1;
          min-height: calc(100vh - 60px);
          overflow-x: auto;
        }

        .content-wrapper {
          padding: 2rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Mobile Styles */
        @media (max-width: 767px) {
          .menu-toggle {
            display: block;
          }

          .header-nav {
            display: none;
          }

          .sidebar {
            position: fixed;
            top: 60px;
            left: 0;
            z-index: 45;
            transform: translateX(-100%);
            transition: transform 0.3s ease;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
          }

          .sidebar.open {
            transform: translateX(0);
          }

          .sidebar-overlay {
            display: block;
          }

          .close-btn {
            display: block;
          }

          .content-wrapper {
            padding: 1rem;
          }

          .main-content {
            width: 100%;
          }
        }

        /* Tablet */
        @media (min-width: 768px) and (max-width: 1024px) {
          .sidebar {
            width: 220px;
          }
          
          .content-wrapper {
            padding: 1.5rem;
          }
        }

        /* Print */
        @media print {
          .shell-header,
          .sidebar {
            display: none;
          }
          
          .main-content {
            margin: 0;
            padding: 0;
          }
          
          .content-wrapper {
            padding: 0;
            max-width: none;
          }
        }
      `}</style>
    </>
  )
}
