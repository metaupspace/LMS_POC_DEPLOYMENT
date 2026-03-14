interface TableSkeletonProps {
  columns?: number;
  rows?: number;
}

export default function TableSkeleton({ columns = 5, rows = 6 }: TableSkeletonProps) {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      {/* Header */}
      <div className="flex gap-md p-lg border-b border-border-light">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 rounded-sm bg-border-light flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-md p-lg border-b border-border-light last:border-b-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              className={`h-4 rounded-sm bg-border-light flex-1 ${colIdx === 0 ? 'max-w-[180px]' : ''}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
