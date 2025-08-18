// components/Layout.js
import Head from 'next/head'
import Link from 'next/link'

export default function Layout({ children, title = 'Cafe QR' }) {
  return (
    <>
      <Head>
        <title>{title} | Cafe QR</title>
        <meta
          name="description"
          content="Contactless QR ordering and payments for cafes & restaurants"
        />
        {/* Important for iOS safe areas and correct scaling */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Full-width, sticky header with safe-area padding */}
      <header style={headerOuter}>
        <div style={headerInner}>
          <Link href="/" style={logoLinkStyle}>
            <img
              src="/cafeqr-logo.svg"
              alt="Cafe QR Logo"
              height={32}
              style={{ display: 'block' }}
            />
            <span style={brandTextStyle}>Cafe QR</span>
          </Link>

          <nav style={{ display: 'flex', alignItems: 'center' }}>
            <Link href="/" style={navLinkStyle}>Home</Link>
            <Link href="/faq" style={navLinkStyle}>FAQ</Link>
            <Link href="/login" style={navLinkStyle}>Login</Link>
          </nav>
        </div>
      </header>

      {/* Main content area with bottom safe-area padding so it never clashes with iOS home bar */}
      <main style={mainStyle}>{children}</main>

      {/* Full-width footer with safe-area padding */}
      <footer style={footerOuter}>
        <div style={footerInner}>
          <div>🔒 Powered by The Online Wala • Secure payments by Cashfree</div>
          <div style={{ marginTop: 6 }}>
            <Link href="/privacy-policy" style={footerLinkStyle}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </>
  )
}

/* Styles */
const headerOuter = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  width: '100%',
  background: '#fff',
  borderBottom: '1px solid #eee',
  paddingTop: 'env(safe-area-inset-top)',
}

const headerInner = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  margin: '0 auto',
  maxWidth: '1200px',
  width: '100%',
  boxSizing: 'border-box',
}

const logoLinkStyle = { display: 'flex', alignItems: 'center', textDecoration: 'none' }
const brandTextStyle = { fontSize: 20, fontWeight: 700, color: '#2c3e50', marginLeft: 8 }
const navLinkStyle = { marginLeft: 20, color: '#34495e', textDecoration: 'none', fontWeight: 500 }

const mainStyle = {
  flex: 1,
  padding: '20px 16px',
  paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
  boxSizing: 'border-box',
  background: '#fff',
}

const footerOuter = {
  width: '100%',
  borderTop: '1px solid #eee',
  background: '#fafafa',
  paddingBottom: 'calc(12px + env(safe-area-inset-bottom))',
}

const footerInner = {
  textAlign: 'center',
  padding: '20px 16px 12px',
  fontSize: 14,
  color: '#95a5a6',
  margin: '0 auto',
  maxWidth: '1200px',
  width: '100%',
  boxSizing: 'border-box',
}

const footerLinkStyle = { color: '#3498db', textDecoration: 'none' }
