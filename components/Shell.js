// components/Shell.js
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../services/supabase'

export default function Shell({ children }) {
  const router = useRouter()

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 240, borderRight: '1px solid #eee', padding: 16, backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginTop: 0, marginBottom: 24 }}>Owner Panel</h3>
        <NavItem href="/dashboard" label="📊 Overview" />
        <NavItem href="/menu" label="🍽️ Menu" />
        <NavItem href="/orders" label="📋 Orders" />
        <NavItem href="/availability" label="⏰ Availability" />
        <NavItem href="/promotions" label="🎟️ Promotions" />
        <NavItem href="/analytics" label="📈 Analytics" />
        <NavItem href="/settings" label="⚙️ Settings" />
        
        <div style={{ marginTop: 'auto', paddingTop: 24, borderTop: '1px solid #eee' }}>
          <button
            onClick={signOut}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: '#666', 
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 24, backgroundColor: '#fff' }}>
        {children}
      </main>
    </div>
  )
}

function NavItem({ href, label }) {
  const router = useRouter()
  const isActive = router.pathname === href
  
  return (
    <div style={{ marginBottom: 8 }}>
      <Link 
        href={href} 
        style={{ 
          color: isActive ? '#0070f3' : '#333', 
          textDecoration: 'none',
          fontWeight: isActive ? 600 : 400,
          display: 'block',
          padding: '8px 12px',
          borderRadius: 4,
          backgroundColor: isActive ? '#f0f8ff' : 'transparent'
        }}
      >
        {label}
      </Link>
    </div>
  )
}
