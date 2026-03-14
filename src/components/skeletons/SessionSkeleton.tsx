export function SessionCardSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[140px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-4 w-1/2 rounded-sm bg-border-light" />
        <div className="h-12 w-full rounded-sm bg-border-light" />
      </div>
    </div>
  );
}

export function SessionCompactSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse p-lg">
      <div className="flex items-start justify-between gap-md">
        <div className="flex-1 space-y-sm">
          <div className="h-5 w-3/4 rounded-sm bg-border-light" />
          <div className="h-4 w-full rounded-sm bg-border-light" />
          <div className="h-3 w-1/2 rounded-sm bg-border-light" />
        </div>
        <div className="h-6 w-16 rounded-full bg-border-light" />
      </div>
    </div>
  );
}

export function SessionAttendanceSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[200px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-4 w-1/2 rounded-sm bg-border-light" />
        <div className="h-10 w-full rounded-sm bg-border-light" />
        <div className="h-12 w-full rounded-sm bg-border-light" />
      </div>
    </div>
  );
}
