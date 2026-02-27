export default function DashboardLoading() {
  return (
    <div className="min-h-screen animate-pulse space-y-lg p-lg">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-sm bg-border-light" />
        <div className="h-10 w-32 rounded-sm bg-border-light" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-md bg-surface-white p-lg shadow-sm">
            <div className="h-4 w-20 rounded-sm bg-border-light" />
            <div className="mt-md h-8 w-16 rounded-sm bg-border-light" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-md bg-surface-white p-lg shadow-sm">
        <div className="h-6 w-40 rounded-sm bg-border-light" />
        <div className="mt-lg space-y-md">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-md">
              <div className="h-4 w-1/4 rounded-sm bg-border-light" />
              <div className="h-4 w-1/3 rounded-sm bg-border-light" />
              <div className="h-4 w-1/6 rounded-sm bg-border-light" />
              <div className="h-4 w-1/6 rounded-sm bg-border-light" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
