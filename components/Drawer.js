// components/Drawer.js
import React, { useState, useRef } from 'react'
import Link from 'next/link'

export default function Drawer({ open, onClose }) {
  // Touch tracking for swipe-open (not strictly necessary for closing)
  const startX = useRef(0)
  const currentX = useRef(0)
  const touching = useRef(false)
  const drawerRef = useRef(null)

  const handleTouchStart = e => {
    if (!open && e.touches[0].clientX > 20) return
    touching.current = true
    startX.current = e.touches[0].clientX
  }

  const handleTouchMove = e => {
    if (!touching.current) return
    currentX.current = e.touches[0].clientX
    const delta = Math.min(0, currentX.current - startX.current)
    drawerRef.current.style.transform = `translateX(${delta}px)`
  }

  const handleTouchEnd = () => {
    if (!touching.current) return
    touching.current = false
    const delta = currentX.current - startX.current
    drawerRef.current.style.transform = ''
    if (!open && delta > 50) {
      // open drawer if swiped right from edge
      document.body.dispatchEvent(new Event('openDrawer'))
    } else if (open && delta < -50) {
      onClose()
    }
  }

  // Close on link click
  const handleNavClick = () => onClose()

  return (
    <>
      {/* Backdrop */}
      <div
        className="drawer-backdrop"
        style={{ display: open ? 'block' : 'none' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <nav
        ref={drawerRef}
        className="drawer"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <ul className="drawer-nav">
          <li><Link href="/owner"><a onClick={handleNavClick}>Overview</a></Link></li>
          <li><Link href="/owner/orders"><a onClick={handleNavClick}>Orders</a></Link></li>
          <li><Link href="/owner/menu"><a onClick={handleNavClick}>Menu</a></Link></li>
          <li><Link href="/owner/availability"><a onClick={handleNavClick}>Availability</a></Link></li>
          <li><Link href="/owner/billing"><a onClick={handleNavClick}>Billing</a></Link></li>
          <li><Link href="/owner/promotions"><a onClick={handleNavClick}>Promotions</a></Link></li>
          <li><Link href="/owner/inventory"><a onClick={handleNavClick}>Inventory</a></Link></li>
          <li><Link href="/owner/reports"><a onClick={handleNavClick}>Reports</a></Link></li>
          <li><Link href="/owner/settings"><a onClick={handleNavClick}>Settings</a></Link></li>
        </ul>
      </nav>

      <style jsx>{`
        .drawer-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.3);
          z-index: 999;
        }
        .drawer {
          position: fixed; top: 0; left: 0;
          width: 80%; max-width: 300px; height: 100%;
          background: var(--surface); padding: var(--pad-2);
          box-shadow: var(--shadow-2); transform: translateX(${open ? '0' : '-100%'});
          transition: transform 0.3s ease-out; z-index: 1000;
        }
        .drawer-nav {
          list-style: none; padding: 0; margin: 0;
        }
        .drawer-nav li + li { margin-top: 12px; }
        .drawer-nav a {
          text-decoration: none; color: var(--text);
          font-size: 16px; font-weight: 500;
        }
      `}</style>
    </>
  )
}
