// components/Shell.js
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export default function Shell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true)
    }
    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  return (
    <div className="shell-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            {isMobile && (
              <button
                className="menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
              >
                <span className={`hamburger ${sidebarOpen ? 'active' : ''}`}>
                  <span></span><span></span><span></span>
                </span>
              </button>
            )}
            <div className="logo">
              <Image src="/cafeqr-logo.svg" alt="Cafe QR" width={32} height={32} priority />
              <span>Cafe QR</span>
            </div>
          </div>
          <nav className="header-nav">
            <Link href="/">Home</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/login">Login</Link>
          </nav>
        </div>
      </header>

      <div className="main-layout">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${isMobile ? 'mobile' : 'desktop'}`}>
          {isMobile && sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
          <div className="sidebar-content">
            <div className="sidebar-header">
              <h2>Owner Panel</h2>
              {isMobile && (
                <button className="close-sidebar" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
              )}
            </div>
            <nav className="sidebar-nav">
              <Link className="nav-item" href="/dashboard">📊 Overview</Link>
              <Link className="nav-item" href="/menu">🍽️ Menu</Link>
              <Link className="nav-item" href="/orders">📋 Orders</Link>
              <Link className="nav-item" href="/availability">⚠️ Availability</Link>
              <Link className="nav-item" href="/promotions">🎯 Promotions</Link>
              <Link className="nav-item" href="/analytics">📈 Analytics</Link>
              <Link className="nav-item" href="/settings">⚙️ Settings</Link>
              <Link className="nav-item" href="/billing">🧾 Billing</Link>
              <div className="nav-divider"></div>
              <Link className="nav-item logout" href="/logout">🚪 Sign Out</Link>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="content-wrapper">{children}</div>
        </main>
      </div>

      <style jsx>{`
        .shell-container { min-height: 100vh; display: flex; flex-direction: column; background: #f8f9fa; }
        .header { background: #fff; border-bottom: 1px solid #e5e5e5; position: sticky; top: 0; z-index: 1000; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .header-content { display: flex; justify-content: space-between; align-items: center; padding: 0 1rem; height: 60px; max-width: 1200px; margin: 0 auto; }
        .header-left { display: flex; align-items: center; gap: 1rem; }
        .logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #333; }
        .menu-toggle { display: none; background: none; border: none; padding: 0.5rem; cursor: pointer; }
        .hamburger { display: flex; flex-direction: column; width: 20px; height: 15px; position: relative; }
        .hamburger span { height: 2px; background: #333; margin: 2px 0; transition: 0.3s; }
        .hamburger.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
        .hamburger.active span:nth-child(2) { opacity: 0; }
        .hamburger.active span:nth-child(3) { transform: rotate(-45deg) translate(7px, -6px); }
        .header-nav { display: flex; gap: 1.5rem; }
        .header-nav :global(a) { text-decoration: none; color: #666; font-weight: 500; transition: color 0.2s; }
        .header-nav :global(a:hover) { color: #333; }
        .main-layout { display: flex; flex: 1; position: relative; }
        .sidebar { background: #fff; border-right: 1px solid #e5e5e5; transition: all 0.3s ease; position: relative; }
        .sidebar.desktop { width: 250px; position: sticky; top: 60px; height: calc(100vh - 60px); overflow-y: auto; }
        .sidebar.mobile { position: fixed; top: 60px; left: 0; width: 280px; height: calc(100vh - 60px); z-index: 999; transform: translateX(-100%); box-shadow: 2px 0 10px rgba(0,0,0,0.1); }
        .sidebar.mobile.open { transform: translateX(0); }
        .sidebar-overlay { position: fixed; top: 60px; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: -1; }
        .sidebar-content { height: 100%; overflow-y: auto; }
        .sidebar-header { padding: 1.5rem 1rem 1rem; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; }
        .sidebar-header h2 { margin: 0; color: #333; font-size: 1.25rem; }
        .close-sidebar { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; padding: 0.25rem; }
        .sidebar-nav { padding: 1rem 0; }
        .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; text-decoration: none; color: #666; transition: all 0.2s; border-left: 3px solid transparent; }
        .nav-item:hover { background: #f8f9fa; color: #333; }
        .nav-item.active { background: #e3f2fd; color: #1976d2; border-left-color: #1976d2; }
        .nav-item.logout { color: #d32f2f; margin-top: 1rem; }
        .nav-item.logout:hover { background: #ffebee; }
        .nav-divider { height: 1px; background: #f0f0f0; margin: 1rem 0; }
        .main-content { flex: 1; min-height: calc(100vh - 60px); overflow-x: auto; }
        .content-wrapper { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        @media (max-width: 767px) {
          .menu-toggle { display: block; }
          .header-nav { display: none; }
          .content-wrapper { padding: 1rem; }
          .sidebar.desktop { display: none; }
        }
        @media (min-width: 768px) and (max-width: 1024px) {
          .sidebar.desktop { width: 200px; }
          .content-wrapper { padding: 1.5rem; }
        }
        @media (min-width: 1200px) { .sidebar.desktop { width: 280px; } }
        @media print { .header, .sidebar { display: none; } .main-content { margin: 0; padding: 0; } }
      `}</style>
    </div>
  )
}
