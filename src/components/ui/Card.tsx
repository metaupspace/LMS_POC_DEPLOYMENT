'use client';

import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  hoverable?: boolean;
  noPadding?: boolean;
}

export default function Card({
  header,
  footer,
  hoverable = false,
  noPadding = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-md bg-surface-white shadow-sm
        ${hoverable ? 'transition-shadow duration-200 hover:shadow-md' : ''}
        ${className}
      `}
      {...props}
    >
      {header && (
        <div className="border-b border-border-light px-lg py-md">
          {header}
        </div>
      )}
      <div className={noPadding ? '' : 'p-lg'}>{children}</div>
      {footer && (
        <div className="border-t border-border-light px-lg py-md">
          {footer}
        </div>
      )}
    </div>
  );
}
