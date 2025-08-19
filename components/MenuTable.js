// components/MenuTable.js
import { useState } from 'react'

export default function MenuTable({ items, loading, onEdit, onDelete, onBulkUpdate }) {
  const [selected, setSelected] = useState([])

  function toggleSelect(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  return (
    <div className="table-wrap">
      {loading ? (
        <p>Loading menu…</p>
      ) : (
        <>
          <div className="bulk-actions">
            <button onClick={() => onBulkUpdate(selected, 'available')}>Mark Available</button>
            <button onClick={() => onBulkUpdate(selected, 'out_of_stock')}>Mark Out of Stock</button>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th><input type="checkbox" onChange={(e) => 
                  setSelected(e.target.checked ? items.map(i=>i.id) : [])
                } /></th>
                <th>Name</th><th>Category</th><th>Price</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>₹{item.price.toFixed(2)}</td>
                  <td>{item.status}</td>
                  <td>
                    <button onClick={() => onEdit(item)}>Edit</button>
                    <button onClick={() => onDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <style jsx>{`
        .bulk-actions {
          margin-bottom: 0.5rem;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
        }
        th:first-child, td:first-child {
          width: 40px;
          text-align: center;
        }
        td:last-child {
          display: flex;
          gap: 0.5rem;
        }
        @media (max-width: 600px) {
          table, thead, tbody, tr, th, td {
            display: block;
          }
          tr { margin-bottom: 1rem; }
          th { position: absolute; top: -9999px; left: -9999px; }
          td {
            position: relative;
            padding-left: 50%;
          }
          td:before {
            content: attr(data-label);
            position: absolute;
            left: 0;
            width: 45%;
            padding-left: 0.75rem;
            font-weight: 600;
          }
        }
      `}</style>
    </div>
  )
}
