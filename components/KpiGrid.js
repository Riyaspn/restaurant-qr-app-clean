// components/KpiGrid.js
export default function KpiGrid({ stats }) {
  const items = [
    { label: 'Live Orders', value: stats.liveOrders },
    { label: 'Revenue Today', value: `₹${stats.revenueToday.toFixed(2)}` },
    { label: 'Avg Ticket', value: `₹${stats.avgTicket.toFixed(2)}` },
    { label: 'Out of Stock', value: stats.outOfStock }
  ]

  return (
    <div className="kpi-grid">
      {items.map((kpi) => (
        <div key={kpi.label} className="kpi-card">
          <div className="kpi-label">{kpi.label}</div>
          <div className="kpi-value">{kpi.value}</div>
        </div>
      ))}
      <style jsx>{`
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .kpi-card {
          background: #fff;
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 1px 4px rgba(0,0,0,0.1);
          text-align: center;
        }
        .kpi-label {
          font-weight: 500;
          color: #555;
          margin-bottom: 0.5rem;
        }
        .kpi-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #222;
        }
      `}</style>
    </div>
  )
}
