export default function CourseSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[180px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-3 w-20 rounded-full bg-border-light" />
        <div className="h-4 w-1/3 rounded-sm bg-border-light" />
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-2 w-full rounded-full bg-border-light" />
        <div className="h-12 w-full rounded-sm bg-border-light" />
      </div>
    </div>
  );
}
