import { CalendarX } from 'lucide-react';

interface SessionListProps {
  children: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  isEmpty?: boolean;
  columns?: 1 | 2 | 3;
  className?: string;
}

export default function SessionList({
  children,
  emptyTitle = 'No sessions found',
  emptyDescription = 'Your scheduled sessions will appear here',
  isEmpty = false,
  columns = 2,
  className = '',
}: SessionListProps) {
  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
        <CalendarX className="h-12 w-12 text-text-disabled" />
        <p className="mt-md text-body-lg font-medium text-text-secondary">
          {emptyTitle}
        </p>
        <p className="mt-xs text-body-md text-text-disabled">
          {emptyDescription}
        </p>
      </div>
    );
  }

  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }[columns];

  return (
    <div className={`grid ${gridClass} gap-md ${className}`}>
      {children}
    </div>
  );
}
