// components/Layout.js
import Head from 'next/head'
import Link from 'next/link'

export default function Layout({ children, title = 'Cafe QR' }) {
  return (
    <>
      <Head>
        <title>{title} | Cafe QR</title>
        <meta name="description" content="Contactless QR ordering and payments for cafes & restaurants" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header style={headerStyle}>
        <Link href="/" style={logoLinkStyle}>
          <img src="/cafeqr-logo.svg" alt="Cafe QR Logo" height={32} />
          <span style={brandTextStyle}>Cafe QR</span>
        </Link>
        <nav>
          <Link href="/" style={navLinkStyle}>Home</Link>
          <Link href="/faq" style={navLinkStyle}>FAQ</Link>
          <Link href="/login" style={navLinkStyle}>Login</Link>
        </nav>
      </header>

      <main style={mainStyle}>{children}</main>

      <footer style={footerStyle}>
        🔒 Powered by The Online Wala • Secure payments by Cashfree<br />
        <Link href="/privacy-policy" style={footerLinkStyle}>Privacy Policy</Link>
      </footer>
    </>
  )
}

const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '12px 24px', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
}
const logoLinkStyle = { display: 'flex', alignItems: 'center', textDecoration: 'none' }
const brandTextStyle = { fontSize: 20, fontWeight: 700, color: '#2c3e50', marginLeft: 8 }
const navLinkStyle = { marginLeft: 20, color: '#34495e', textDecoration: 'none', fontWeight: 500 }
const mainStyle = { flex: 1, padding: '20px 24px' }
const footerStyle = {
  textAlign: 'center', padding: '20px', fontSize: 14, color: '#95a5a6', background: '#fafafa',
}
const footerLinkStyle = { color: '#3498db', textDecoration: 'none' }
