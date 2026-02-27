'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (_page: number) => void;
  onLimitChange?: (_limit: number) => void;
  className?: string;
}

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
  className = '',
}: PaginationProps) {
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const getPageNumbers = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (page > 3) pages.push('...');
    const rangeStart = Math.max(2, page - 1);
    const rangeEnd = Math.min(totalPages - 1, page + 1);
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  if (totalPages <= 1 && total <= limit) return null;

  return (
    <div
      className={`flex flex-col items-center justify-between gap-md sm:flex-row ${className}`}
    >
      <p className="text-body-md text-text-secondary">
        Showing {start}-{end} of {total}
      </p>

      <div className="flex items-center gap-xs">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-border-light
            text-text-secondary transition-colors hover:bg-surface-background
            disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-xs text-body-md text-text-secondary">
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-sm text-body-md font-medium transition-colors
                ${
                  p === page
                    ? 'bg-primary-main text-white'
                    : 'border border-border-light text-text-primary hover:bg-surface-background'
                }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-border-light
            text-text-secondary transition-colors hover:bg-surface-background
            disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {onLimitChange && (
        <select
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="rounded-sm border border-border-light bg-surface-white px-sm py-xs text-body-md text-text-primary
            focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20"
        >
          {[10, 25, 50, 100].map((l) => (
            <option key={l} value={l}>
              {l} / page
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
