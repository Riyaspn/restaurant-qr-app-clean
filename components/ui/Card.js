// components/ui/Card.js
import React from 'react';
import clsx from 'clsx';
export default function Card({ children, padding12, padding24, ...rest }) {
  const style = {
     padding: padding24
       ? '24px'
       : padding12
       ? '12px'
       : undefined,
     ...rest.style
   };
   return (
     <div style={style} {...rest}>
       {children}
     </div>
   );
 }
