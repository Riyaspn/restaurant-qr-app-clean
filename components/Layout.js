// components/Layout.js
import Head from 'next/head'
import Shell from './Shell'

export default function Layout({
  children,
  title = 'Cafe QR',
  noChrome = false,
  showSidebar = false,
  hideChrome = false,
  showCustomerHeader = false
}) {
  return (
    <>
      <Head>
        <title>{title} | Cafe QR</title>
        <meta name="description" content="Contactless QR ordering and payments for cafes & restaurants" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {noChrome ? (
        <main className="app-main app-main--plain">{children}</main>
      ) : hideChrome ? (
        <>
          {/* Minimal customer header: logo + app name only */}
          {showCustomerHeader && (
            <div style={{
              background: '#fff',
              borderBottom: '1px solid #e5e7eb',
              padding: '12px 16px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                maxWidth: 1200,
                margin: '0 auto'
              }}>
                <img 
                  src="/cafeqr-logo.svg" 
                  alt="Cafe QR" 
                  width={24} 
                  height={24} 
                />
                <span style={{ fontWeight: 700, fontSize: 16 }}>Cafe QR</span>
              </div>
            </div>
          )}
          
          {/* Customer content without global shell */}
          <main style={{ flex: 1, minHeight: 'calc(100vh - 60px)' }}>
            {children}
          </main>
          
          {/* Same footer for customer pages */}
          <footer style={{
            background: '#fff',
            borderTop: '1px solid #e5e7eb',
            padding: '12px 16px',
            textAlign: 'center',
            fontSize: 14,
            color: '#6b7280'
          }}>
            🔒 Powered by The Online Wala • Secure payments by Cashfree • <a href="/pages/privacy-policy.js" style={{color: '#3498db', textDecoration: 'underline'}}>Privacy Policy</a>
          </footer>
        </>
      ) : (
        <Shell showSidebar={showSidebar}>{children}</Shell>
      )}
    </>
  )
}
