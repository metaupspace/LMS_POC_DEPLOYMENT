interface CardSkeletonProps {
  hasImage?: boolean;
  imageHeight?: string;
  lines?: number;
  className?: string;
}

export default function CardSkeleton({
  hasImage = true,
  imageHeight = 'h-40',
  lines = 3,
  className = '',
}: CardSkeletonProps) {
  return (
    <div className={`rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse ${className}`}>
      {hasImage && <div className={`${imageHeight} w-full bg-border-light`} />}
      <div className="p-lg space-y-md">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`h-4 rounded-sm bg-border-light ${i === 0 ? 'w-3/4' : i === lines - 1 ? 'w-1/2' : 'w-full'}`}
          />
        ))}
      </div>
    </div>
  );
}
