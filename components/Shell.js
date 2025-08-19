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
        <header className="shell-header">
          <div className="header-content">
            <Link href="/" className="logo-link">
              <div className="logo">
                <Image src="/cafeqr-logo.svg" alt="Cafe QR" width={28} height={28} priority />
                <span>Cafe QR</span>
              </div>
            </Link>
            <nav className="header-nav">
              <Link href="/">Home</Link>
              <Link href="/faq">FAQ</Link>
              {isMobile && (
                <button
                  className="menu-toggle"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  aria-label="Menu"
                >
                  ☰
                </button>
              )}
            </nav>
          </div>
        </header>

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
                  <span className="nav-icon">
