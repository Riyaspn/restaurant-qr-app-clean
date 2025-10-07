import React from 'react'

export default function Table({ columns, data }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map(col => (
            <th
              key={col.accessor}
              style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #ddd' }}
            >
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ textAlign: 'center', padding: 16, color: '#666' }}>
              No data
            </td>
          </tr>
        ) : (
          data.map((row, i) => (
            <tr key={i}>
              {columns.map(col => (
                <td key={col.accessor} style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {col.cell ? col.cell(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
