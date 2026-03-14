import { Flame } from 'lucide-react';

interface StreakDisplayProps {
  current: number;
  longest?: number;
  variant?: 'compact' | 'full';
  className?: string;
}

export default function StreakDisplay({
  current,
  longest,
  variant = 'compact',
  className = '',
}: StreakDisplayProps) {
  if (variant === 'full') {
    return (
      <div className={`flex items-center gap-sm ${className}`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <Flame className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <p className="text-h2 font-bold text-text-primary leading-none">
            {current}
          </p>
          <p className="text-caption text-text-secondary">Daily Streak</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-xs ${className}`}>
      <Flame className="h-4 w-4 text-amber-500" />
      <span className="text-body-md font-semibold text-text-primary">
        {current} day streak
      </span>
      {longest != null && (
        <span className="text-caption text-text-secondary">
          Best: {longest}
        </span>
      )}
    </div>
  );
}
