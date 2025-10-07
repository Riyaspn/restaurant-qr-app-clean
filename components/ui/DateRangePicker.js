import React from 'react'

export default function DateRangePicker({ start, end, onChange }) {
  const handleStart = e => onChange({ start: new Date(e.target.value), end })
  const handleEnd   = e => onChange({ start, end: new Date(e.target.value) })

  const fmt = d => d.toISOString().slice(0, 10)
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <label>
        From{' '}
        <input
          type="date"
          value={fmt(start)}
          onChange={handleStart}
        />
      </label>
      <label>
        To{' '}
        <input
          type="date"
          value={fmt(end)}
          onChange={handleEnd}
        />
      </label>
    </div>
  )
}
