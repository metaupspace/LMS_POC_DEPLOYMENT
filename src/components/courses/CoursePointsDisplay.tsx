import { Star } from 'lucide-react';

interface CoursePointsDisplayProps {
  current: number;
  max?: number;
  showBar?: boolean;
  className?: string;
}

export default function CoursePointsDisplay({
  current,
  max,
  showBar = false,
  className = '',
}: CoursePointsDisplayProps) {
  const percent = max && max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;

  if (showBar && max) {
    return (
      <div className={`flex items-center gap-md ${className}`}>
        <span className="text-body-md font-semibold text-text-primary whitespace-nowrap">
          {current}
        </span>
        <div className="flex-1 h-[6px] rounded-full bg-surface-background overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-body-md font-semibold text-text-secondary whitespace-nowrap flex items-center gap-[2px]">
          {max}
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
        </span>
      </div>
    );
  }

  return (
    <span className={`flex items-center gap-xs text-amber-500 font-semibold ${className}`}>
      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      {current}{max ? `/${max}` : ''} pts
    </span>
  );
}
