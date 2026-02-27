export default function LearnerLoading() {
  return (
    <div className="animate-pulse space-y-md p-md">
      {/* Gamification header skeleton */}
      <div className="rounded-md bg-surface-white p-lg shadow-sm">
        <div className="flex items-center gap-md">
          <div className="h-12 w-12 rounded-full bg-border-light" />
          <div className="flex-1 space-y-sm">
            <div className="h-5 w-32 rounded-sm bg-border-light" />
            <div className="h-3 w-48 rounded-sm bg-border-light" />
          </div>
        </div>
        <div className="mt-md flex gap-md">
          <div className="h-8 w-20 rounded-full bg-border-light" />
          <div className="h-8 w-20 rounded-full bg-border-light" />
          <div className="h-8 w-20 rounded-full bg-border-light" />
        </div>
      </div>

      {/* Section title */}
      <div className="h-6 w-40 rounded-sm bg-border-light" />

      {/* Card skeletons */}
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-md bg-surface-white p-lg shadow-sm space-y-md">
          <div className="h-5 w-3/4 rounded-sm bg-border-light" />
          <div className="h-4 w-full rounded-sm bg-border-light" />
          <div className="h-3 w-1/2 rounded-sm bg-border-light" />
        </div>
      ))}
    </div>
  );
}
