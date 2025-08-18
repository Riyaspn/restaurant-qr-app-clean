// pages/dashboard.js
import { useRequireAuth } from '../lib/useRequireAuth'
import Shell from '../components/Shell'

export default function Dashboard() {
  const { checking } = useRequireAuth()
  
  if (checking) {
    return (
      <Shell>
        <h1>Loading…</h1>
        <p>Please wait while we verify your session.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      <h1>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard label="Live Orders" value="—" />
        <KpiCard label="Revenue Today" value="—" />
        <KpiCard label="Avg Order" value="—" />
        <KpiCard label="Out of Stock" value="—" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Recent Orders</h3>
          <p style={{ color: '#666' }}>No orders yet. Share your QR code to start receiving orders.</p>
        </div>
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Quick Actions</h3>
          <button style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}>
            Mark Item Out of Stock
          </button>
          <button style={{ display: 'block', width: '100%', marginBottom: 8, padding: 8 }}>
            Create Promotion
          </button>
        </div>
      </div>
    </Shell>
  )
}

function KpiCard({ label, value }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, textAlign: 'center' }}>
      <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{value}</div>
    </div>
  )
}
