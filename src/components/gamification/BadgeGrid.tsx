const BADGE_TIERS = [
  { name: 'Rookie', threshold: 1000, icon: '\u{1F949}' },
  { name: 'Silver', threshold: 2000, icon: '\u{1F948}' },
  { name: 'Gold', threshold: 3000, icon: '\u{1F947}' },
  { name: 'Premium', threshold: 5000, icon: '\u{1F48E}' },
] as const;

interface BadgeGridProps {
  earnedBadgeNames: string[];
  totalPoints?: number;
  variant?: 'compact' | 'full';
  className?: string;
}

export { BADGE_TIERS };

export default function BadgeGrid({
  earnedBadgeNames,
  totalPoints = 0,
  variant = 'compact',
  className = '',
}: BadgeGridProps) {
  const isBadgeEarned = (name: string) =>
    earnedBadgeNames.some((b) => b.toLowerCase() === name.toLowerCase());

  if (variant === 'compact') {
    return (
      <div className={`grid grid-cols-4 gap-sm ${className}`}>
        {BADGE_TIERS.map((tier) => {
          const earned = isBadgeEarned(tier.name);
          return (
            <div
              key={tier.name}
              className={`flex flex-col items-center gap-[2px] rounded-md p-sm text-center transition-all ${
                earned
                  ? 'bg-amber-50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'opacity-50 grayscale'
              }`}
            >
              <span className="text-xl">{tier.icon}</span>
              <span className="text-caption font-medium text-text-primary">{tier.name}</span>
              <span className="text-[10px] text-text-secondary">{tier.threshold} pts</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Full variant with progress bars
  return (
    <div className={`space-y-md ${className}`}>
      {BADGE_TIERS.map((tier) => {
        const earned = isBadgeEarned(tier.name);
        const tierIndex = BADGE_TIERS.findIndex((t) => t.name === tier.name);
        const prevThreshold = tierIndex > 0 ? BADGE_TIERS[tierIndex - 1]!.threshold : 0;
        const range = tier.threshold - prevThreshold;
        const progress = Math.min(100, Math.max(0, ((totalPoints - prevThreshold) / range) * 100));

        return (
          <div
            key={tier.name}
            className={`flex items-center gap-md rounded-md p-md transition-all ${
              earned
                ? 'bg-amber-50/50 shadow-[0_0_16px_rgba(245,158,11,0.15)]'
                : 'opacity-70'
            }`}
          >
            <span className={`text-3xl ${!earned ? 'grayscale opacity-30' : ''}`}>
              {tier.icon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-body-md font-semibold text-text-primary">
                  {tier.name}
                </span>
                <span className="text-caption text-text-secondary">
                  {tier.threshold} pts
                </span>
              </div>
              <div className="mt-sm h-2 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    earned
                      ? 'bg-gradient-to-r from-amber-400 to-primary-main'
                      : 'bg-gray-300'
                  }`}
                  style={{ width: `${earned ? 100 : progress}%` }}
                />
              </div>
              <p className="mt-xs text-caption text-text-secondary">
                {earned ? 'Earned!' : `${Math.max(0, tier.threshold - totalPoints)} more points needed`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
