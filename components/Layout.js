// components/Layout.js
import Head from 'next/head'
import Link from 'next/link'

export default function Layout({ children, title = 'Cafe QR', noChrome = false }) {
  return (
    <>
      <Head>
        <title>{title} | Cafe QR</title>
        <meta name="description" content="Contactless QR ordering and payments for cafes & restaurants" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {!noChrome && (
        <header className="app-header">
          <div className="header-inner">
            <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
              <img src="/cafeqr-logo.svg" alt="Cafe QR Logo" height={28} style={{ display: 'block' }} />
              <span style={{ fontSize: 18, fontWeight: 700, color: '#2c3e50', marginLeft: 8 }}>Cafe QR</span>
            </Link>
            <nav style={{ display: 'flex', alignItems: 'center' }}>
              <Link href="/" style={navLink}>Home</Link>
              <Link href="/faq" style={navLink}>FAQ</Link>
              <Link href="/login" style={navLink}>Login</Link>
            </nav>
          </div>
        </header>
      )}

      <main className={`app-main${noChrome ? ' app-main--plain' : ''}`}>{children}</main>

      {!noChrome && (
        <footer className="app-footer">
          <div className="footer-inner">
            <div>🔒 Powered by The Online Wala • Secure payments by Cashfree</div>
            <div><Link href="/privacy-policy" style={{ color: '#3498db', textDecoration: 'none' }}>Privacy Policy</Link></div>
          </div>
        </footer>
      )}
    </>
  )
}
const navLink = { marginLeft: 16, color: '#34495e', textDecoration: 'none', fontWeight: 500 }
