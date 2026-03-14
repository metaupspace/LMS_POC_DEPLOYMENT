import Image from 'next/image';
import { BookOpen, Clock, Play, CheckCircle2, RotateCcw } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import CoursePointsDisplay from './CoursePointsDisplay';

type CourseVariant = 'ongoing' | 'assigned' | 'completed';

interface CourseCardProps {
  title: string;
  description?: string;
  domain?: string;
  thumbnail?: string | null;
  moduleCount: number;
  totalDuration?: number;
  completedModuleCount?: number;
  totalPoints?: number;
  completedAt?: string | null;
  variant: CourseVariant;
  onClick: () => void;
  children?: React.ReactNode;
}

export default function CourseCard({
  title,
  description,
  domain,
  thumbnail,
  moduleCount,
  totalDuration,
  completedModuleCount = 0,
  totalPoints = 0,
  completedAt,
  variant,
  onClick,
  children,
}: CourseCardProps) {
  const progressPercent = moduleCount > 0
    ? Math.round((completedModuleCount / moduleCount) * 100)
    : 0;

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail */}
      <button
        type="button"
        className="relative h-[160px] w-full bg-surface-background block"
        onClick={onClick}
        aria-label={`${variant === 'ongoing' ? 'Continue' : variant === 'assigned' ? 'Start' : 'Review'} ${title}`}
      >
        {thumbnail ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            unoptimized
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-light">
            <BookOpen className="h-12 w-12 text-primary-main opacity-50" />
          </div>
        )}
        {variant === 'ongoing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md">
              <Play className="h-6 w-6 text-primary-main ml-[2px]" fill="currentColor" />
            </div>
          </div>
        )}
        {variant === 'completed' && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success shadow-md">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
          </div>
        )}
      </button>

      <div className="p-lg">
        {/* Domain tag */}
        {domain && (
          <p className="text-caption text-text-secondary font-medium uppercase tracking-wide">
            {domain}
          </p>
        )}

        {/* Duration + Module count */}
        <div className="mt-xs flex items-center gap-md text-body-md text-text-secondary">
          {(totalDuration ?? 0) > 0 && (
            <span className="flex items-center gap-xs">
              <Clock className="h-3.5 w-3.5" />
              {totalDuration} min
            </span>
          )}
          <span className="flex items-center gap-xs">
            <BookOpen className="h-3.5 w-3.5" />
            {moduleCount} module{moduleCount !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-sm text-h3 font-semibold text-text-primary line-clamp-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="mt-xs text-body-md text-text-secondary line-clamp-2">
            {description}
          </p>
        )}

        {/* Progress bar (for ongoing and completed) */}
        {variant !== 'assigned' && (
          <div className="mt-md">
            <div className="flex items-center justify-between text-caption text-text-secondary">
              <span>{completedModuleCount} of {moduleCount} modules</span>
              {variant === 'ongoing' && (
                <span className="font-semibold text-primary-main">{progressPercent}%</span>
              )}
            </div>
            <div className="mt-xs h-2 w-full overflow-hidden rounded-full bg-surface-background">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Points + Completion date (for completed) */}
        {variant === 'completed' && (
          <div className="mt-sm flex items-center justify-between text-body-md">
            <CoursePointsDisplay current={totalPoints} />
            {completedAt && (
              <span className="text-text-secondary text-caption">
                {new Date(completedAt).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                })}
              </span>
            )}
          </div>
        )}

        {/* Slot for expandable module list or other content */}
        {children}

        {/* Action button */}
        <Button
          variant={variant === 'completed' ? 'secondary' : 'primary'}
          size="lg"
          isBlock
          leftIcon={
            variant === 'completed' ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" fill="currentColor" />
            )
          }
          onClick={onClick}
          className="mt-md min-h-[44px]"
        >
          {variant === 'ongoing' ? 'Continue' : variant === 'assigned' ? 'Start' : 'Review'}
        </Button>
      </div>
    </Card>
  );
}
