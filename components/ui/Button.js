// components/ui/Button.js
import React from 'react';
import clsx from 'clsx';

export default function Button({ 
  children, 
  variant = 'primary', // primary, outline, danger, success
  size = 'md', // sm, md, lg
  className, 
  ...props 
}) {
  const v = {
    primary: 'btn',
    outline: 'btn btn--outline',
    danger: 'btn btn--danger',
    success: 'btn btn--success',
  }[variant] || 'btn';

  const s = {
    sm: 'btn--sm',
    md: '',
    lg: 'btn--lg',
  }[size] || '';

  return (
    <button {...props} className={clsx(v, s, className)}>{children}</button>
  );
}
