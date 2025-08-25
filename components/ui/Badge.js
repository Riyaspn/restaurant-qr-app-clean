// components/ui/Badge.js
import React from 'react';

const palette = {
  new: { bg: 'rgba(56,189,248,.15)', color: '#38bdf8' },
  in_progress: { bg: 'rgba(245,158,11,.18)', color: '#f59e0b' },
  ready: { bg: 'rgba(34,197,94,.18)', color: '#22c55e' },
  completed: { bg: 'rgba(59,130,246,.18)', color: '#60a5fa' },
  cancelled: { bg: 'rgba(239,68,68,.18)', color: '#ef4444' },
  default: { bg: 'rgba(148,163,184,.15)', color: '#94a3b8' },
};

export default function Badge({ status = 'default', children }) {
  const s = palette[status] || palette.default;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: s.bg,
        color: s.color,
        padding: '6px 10px',
        fontSize: 12,
        borderRadius: 999,
        border: '1px solid rgba(148,163,184,.2)',
        textTransform: 'capitalize',
      }}
    >
      {children}
    </span>
  );
}
