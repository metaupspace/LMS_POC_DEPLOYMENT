'use client';

import { useMemo } from 'react';
import { Award } from 'lucide-react';
import { Card } from '@/components/ui';
import StreakDisplay from './StreakDisplay';
import PointsDisplay from './PointsDisplay';
import { BADGE_TIERS } from './BadgeGrid';

interface GamificationHeaderProps {
  totalPoints: number;
  streakCurrent: number;
  earnedBadgeNames: string[];
  className?: string;
}

export default function GamificationHeader({
  totalPoints,
  streakCurrent,
  earnedBadgeNames,
  className = '',
}: GamificationHeaderProps) {
  const nextBadge = useMemo(() => {
    for (const tier of BADGE_TIERS) {
      const earned = earnedBadgeNames.some(
        (b) => b.toLowerCase() === tier.name.toLowerCase()
      );
      if (!earned) return tier;
    }
    return null;
  }, [earnedBadgeNames]);

  const progressToNext = useMemo(() => {
    if (!nextBadge) return 100;
    const tierIndex = BADGE_TIERS.findIndex((t) => t.name === nextBadge.name);
    const prevTier = tierIndex > 0 ? BADGE_TIERS[tierIndex - 1] : undefined;
    const prevThreshold = prevTier ? prevTier.threshold : 0;
    const range = nextBadge.threshold - prevThreshold;
    const progress = totalPoints - prevThreshold;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [totalPoints, nextBadge]);

  const pointsToNext = useMemo(() => {
    if (!nextBadge) return 0;
    return Math.max(0, nextBadge.threshold - totalPoints);
  }, [totalPoints, nextBadge]);

  const currentBadge = useMemo(() => {
    let current: (typeof BADGE_TIERS)[number] | null = null;
    for (const tier of BADGE_TIERS) {
      const earned = earnedBadgeNames.some(
        (b) => b.toLowerCase() === tier.name.toLowerCase()
      );
      if (earned) current = tier;
    }
    return current;
  }, [earnedBadgeNames]);

  return (
    <Card noPadding className={`overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-lg">
        {/* Top row: streak + points */}
        <div className="flex items-center justify-between">
          <StreakDisplay current={streakCurrent} variant="full" />

          <div className="flex items-center gap-md">
            <PointsDisplay points={totalPoints} />
            {currentBadge && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-white shadow-sm"
                title={currentBadge.name}
              >
                <Award className="h-4 w-4 text-primary-main" />
              </div>
            )}
          </div>
        </div>

        {/* Next badge progress */}
        {nextBadge ? (
          <div className="mt-md">
            <p className="text-caption text-text-secondary">
              <span className="font-semibold text-text-primary">
                {pointsToNext.toLocaleString()}
              </span>{' '}
              more points to{' '}
              <span className="font-semibold text-text-primary">
                {nextBadge.icon} {nextBadge.name}
              </span>
            </p>
            <div className="mt-sm h-2 w-full overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-500"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-md">
            <p className="text-caption font-semibold text-primary-main">
              All badges earned! You are a Premium learner.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
