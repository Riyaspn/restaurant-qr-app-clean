// components/QuickActions.js
import Link from 'next/link'

export default function QuickActions() {
  return (
    <div className="actions-bar">
      <Link href="/orders">
        <button>View Orders</button>
      </Link>
      <Link href="/menu">
        <button>Manage Menu</button>
      </Link>
      <Link href="/promotions">
        <button>Create Promotion</button>
      </Link>
      <style jsx>{`
        .actions-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          flex-wrap: wrap;
        }
        button {
          flex: 1;
        }
        @media (max-width: 600px) {
          button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
