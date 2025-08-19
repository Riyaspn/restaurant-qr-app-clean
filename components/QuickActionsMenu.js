// components/QuickActionsMenu.js
export default function QuickActionsMenu({ onAdd }) {
  return (
    <div className="actions-bar">
      <button onClick={onAdd}>Add New Item</button>
      <style jsx>{`
        .actions-bar {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        @media (max-width: 600px) {
          .actions-bar {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}
