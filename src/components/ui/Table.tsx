'use client';

import { type ReactNode } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────

export interface TableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (_value: unknown, _row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  rowKey: keyof T | ((_row: T) => string);
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (_key: string, _order: 'asc' | 'desc') => void;
  onRowClick?: (_row: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

// ─── Helpers ────────────────────────────────────────────

const alignClass = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

function getRowId<T>(row: T, rowKey: keyof T | ((_r: T) => string)): string {
  return typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey]);
}

function getCellValue<T>(row: T, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

// ─── Component ──────────────────────────────────────────

export default function Table<T>({
  columns,
  data,
  rowKey,
  sortKey,
  sortOrder,
  onSort,
  onRowClick,
  emptyMessage = 'No data found',
  isLoading = false,
}: TableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(key, newOrder);
  };

  const SortIcon = ({ colKey }: { colKey: string }) => {
    if (sortKey !== colKey) return <ArrowUpDown className="ml-xs inline h-3 w-3 text-text-disabled" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-xs inline h-3 w-3 text-primary-main" />
    ) : (
      <ArrowDown className="ml-xs inline h-3 w-3 text-primary-main" />
    );
  };

  // ── Empty / Loading State ─────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2xl">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-main border-t-transparent" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-border-light bg-surface-white py-2xl">
        <p className="text-body-md text-text-secondary">{emptyMessage}</p>
      </div>
    );
  }

  // ── Desktop Table ─────────────────────────────────────

  return (
    <>
      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-md border border-border-light bg-surface-white md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-light">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`
                    px-md py-sm text-caption font-semibold uppercase tracking-wider text-text-secondary
                    ${alignClass[col.align ?? 'left']}
                    ${col.sortable ? 'cursor-pointer select-none hover:text-text-primary' : ''}
                  `}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  {col.label}
                  {col.sortable && <SortIcon colKey={col.key} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={getRowId(row, rowKey)}
                onClick={() => onRowClick?.(row)}
                className={`
                  border-b border-border-light last:border-b-0 transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-surface-background' : ''}
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-md py-sm text-body-md text-text-primary ${alignClass[col.align ?? 'left']}`}
                  >
                    {col.render
                      ? col.render(getCellValue(row, col.key), row)
                      : String(getCellValue(row, col.key) ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List */}
      <div className="flex flex-col gap-sm md:hidden">
        {data.map((row) => (
          <div
            key={getRowId(row, rowKey)}
            onClick={() => onRowClick?.(row)}
            className={`rounded-md border border-border-light bg-surface-white p-md shadow-sm ${
              onRowClick ? 'cursor-pointer active:bg-surface-background' : ''
            }`}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between py-[3px]">
                <span className="text-caption font-medium text-text-secondary">{col.label}</span>
                <span className="text-body-md text-text-primary">
                  {col.render
                    ? col.render(getCellValue(row, col.key), row)
                    : String(getCellValue(row, col.key) ?? '')}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
