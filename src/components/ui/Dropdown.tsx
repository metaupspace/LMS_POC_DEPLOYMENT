'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownItem {
  label: string;
  value: string;
  icon?: ReactNode;
}

interface DropdownProps {
  trigger?: ReactNode;
  label?: string;
  items: DropdownItem[];
  value?: string;
  onChange?: (_value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function Dropdown({
  trigger,
  label,
  items,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = items.find((i) => i.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {label && (
        <span className="mb-xs block text-body-md font-medium text-text-primary">
          {label}
        </span>
      )}
      {trigger ? (
        <button type="button" onClick={() => setOpen(!open)}>
          {trigger}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`
            flex w-full items-center justify-between rounded-sm border border-border-light
            bg-surface-white px-md py-[10px] text-body-md transition-colors duration-200
            hover:border-text-disabled focus:border-border-focus focus:outline-none
            focus:ring-2 focus:ring-border-focus/20
            ${selected ? 'text-text-primary' : 'text-text-secondary'}
          `}
        >
          <span className="truncate">{selected?.label ?? placeholder}</span>
          <ChevronDown
            className={`ml-sm h-4 w-4 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {open && (
        <div
          className="
            absolute left-0 top-full z-30 mt-xs w-full min-w-[160px]
            animate-[scaleIn_150ms_ease-out] rounded-md border border-border-light
            bg-surface-white py-xs shadow-md
          "
        >
          {items.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                onChange?.(item.value);
                setOpen(false);
              }}
              className={`
                flex w-full items-center gap-sm px-md py-sm text-body-md transition-colors
                ${value === item.value ? 'bg-primary-light text-primary-main font-medium' : 'text-text-primary hover:bg-surface-background'}
              `}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          {items.length === 0 && (
            <p className="px-md py-sm text-body-md text-text-secondary">No options</p>
          )}
        </div>
      )}
    </div>
  );
}
