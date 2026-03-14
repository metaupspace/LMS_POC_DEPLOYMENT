export default function GamificationSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="p-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-md">
            <div className="h-10 w-10 rounded-full bg-border-light" />
            <div className="space-y-xs">
              <div className="h-6 w-16 rounded-sm bg-border-light" />
              <div className="h-3 w-20 rounded-sm bg-border-light" />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <div className="h-5 w-12 rounded-sm bg-border-light" />
            <div className="h-6 w-8 rounded-full bg-border-light" />
          </div>
        </div>
        <div className="mt-md">
          <div className="h-3 w-48 rounded-sm bg-border-light" />
          <div className="mt-sm h-2 w-full rounded-full bg-border-light" />
        </div>
      </div>
    </div>
  );
}
