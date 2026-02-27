'use client';

import { useState, useEffect, useRef, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (_value: string) => void;
  debounceMs?: number;
}

export default function SearchBar({
  value: controlledValue,
  onChange,
  debounceMs = 300,
  placeholder = 'Search...',
  className = '',
  ...props
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  const handleChange = (val: string) => {
    setInternalValue(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange?.(val);
    }, debounceMs);
  };

  const handleClear = () => {
    setInternalValue('');
    onChange?.('');
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={internalValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full rounded-sm border border-border-light bg-surface-white
          py-[10px] pl-md pr-[72px] text-body-md text-text-primary
          placeholder:text-text-secondary
          transition-colors duration-200
          focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20
        "
        {...props}
      />
      {internalValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-[36px] top-1/2 -translate-y-1/2 text-text-disabled transition-colors hover:text-text-secondary"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <span className="pointer-events-none absolute right-md top-1/2 -translate-y-1/2 text-text-secondary">
        <Search className="h-4 w-4" />
      </span>
    </div>
  );
}
