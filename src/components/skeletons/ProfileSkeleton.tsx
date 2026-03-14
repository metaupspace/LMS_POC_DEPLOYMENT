export default function ProfileSkeleton() {
  return (
    <div className="space-y-xl animate-pulse">
      {/* Avatar + Name */}
      <div className="flex flex-col items-center gap-md">
        <div className="h-20 w-20 rounded-full bg-border-light" />
        <div className="h-5 w-40 rounded-sm bg-border-light" />
        <div className="h-4 w-28 rounded-sm bg-border-light" />
      </div>

      {/* Info rows */}
      <div className="rounded-md bg-surface-white shadow-sm p-lg space-y-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-4 w-24 rounded-sm bg-border-light" />
            <div className="h-4 w-36 rounded-sm bg-border-light" />
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-md">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-md bg-surface-white shadow-sm p-lg flex flex-col items-center gap-sm">
            <div className="h-8 w-12 rounded-sm bg-border-light" />
            <div className="h-3 w-16 rounded-sm bg-border-light" />
          </div>
        ))}
      </div>
    </div>
  );
}
