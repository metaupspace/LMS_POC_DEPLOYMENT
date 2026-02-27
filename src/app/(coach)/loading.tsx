export default function CoachLoading() {
  return (
    <div className="animate-pulse space-y-md p-md">
      {/* Section title */}
      <div className="h-6 w-40 rounded-sm bg-border-light" />

      {/* Card skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-md bg-surface-white shadow-sm overflow-hidden">
          <div className="h-[180px] w-full bg-border-light" />
          <div className="p-lg space-y-md">
            <div className="h-5 w-3/4 rounded-sm bg-border-light" />
            <div className="h-4 w-full rounded-sm bg-border-light" />
            <div className="flex gap-sm">
              <div className="h-6 w-16 rounded-full bg-border-light" />
              <div className="h-6 w-24 rounded-full bg-border-light" />
            </div>
            <div className="h-12 w-full rounded-sm bg-border-light" />
          </div>
        </div>
      ))}
    </div>
  );
}
