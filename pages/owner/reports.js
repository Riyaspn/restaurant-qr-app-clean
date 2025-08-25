// pages/owner/reports.js
import React from 'react'
import ReportTiles from '../../components/ReportTiles'
import { useRouter } from 'next/router'
import { useRequireAuth } from '../../lib/useRequireAuth';
export default function OwnerHome() {
  const { checking } = useRequireAuth();
  if (checking) return <div style={{ padding: 24 }}>Loading…</div>;
  return <div style={{ padding: 24 }}>Dashboard content</div>;
}


export default function OwnerReports() {
  const router = useRouter()
  const restaurantId = router.query.r || process.env.NEXT_PUBLIC_RESTAURANT_ID

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <header style={{ background: '#fff', padding: 16, borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
      </header>
      <ReportTiles restaurantId={restaurantId} />
      {/* Future: Add charts for hourly volume and top items */}
    </div>
  )
}
