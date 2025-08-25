// components/ui/Chip.js
import React from 'react';
import clsx from 'clsx';

export default function Chip({ tone = 'avail', children, className }) {
  return (
    <span className={clsx('chip', `chip--${tone}`, className)}>{children}</span>
  );
}
