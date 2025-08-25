// components/ui/Card.js
import React from 'react';
import clsx from 'clsx';
export default function Card({ children, className, padding = 16, ...props }) {
  return (
    <div className={clsx('card', className)} style={{ padding }} {...props}>
      {children}
    </div>
  );
}
