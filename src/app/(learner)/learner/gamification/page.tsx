'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Star,
  Flame,
  BookOpen,
  HelpCircle,
  FileCheck,
  Trophy,
  Activity,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useGetUserGamificationQuery } from '@/store/slices/api/gamificationApi';
import { Card } from '@/components/ui';

// ─── Badge Tiers ────────────────────────────────────────

const BADGE_TIERS = [
  { name: 'Rookie', threshold: 1000, icon: '\u{1F949}' },
  { name: 'Silver', threshold: 2000, icon: '\u{1F948}' },
  { name: 'Gold', threshold: 3000, icon: '\u{1F947}' },
  { name: 'Premium', threshold: 5000, icon: '\u{1F48E}' },
] as const;

// ─── Points Breakdown Info ──────────────────────────────

const POINTS_INFO = [
  {
    label: 'Video Completion',
    points: 30,
    icon: BookOpen,
    color: 'bg-blue-50 text-blue-600',
    description: 'per module',
  },
  {
    label: 'Quiz Pass',
    points: 30,
    icon: HelpCircle,
    color: 'bg-emerald-50 text-emerald-600',
    description: 'per module',
  },
  {
    label: 'Proof of Work',
    points: 30,
    icon: FileCheck,
    color: 'bg-purple-50 text-purple-600',
    description: 'per module (bonus)',
  },
  {
    label: 'Module Max',
    points: 90,
    icon: Trophy,
    color: 'bg-amber-50 text-amber-600',
    description: 'per module',
  },
] as const;

// ─── Skeleton Loader ────────────────────────────────────

function GamificationSkeleton() {
  return (
    <div className="space-y-lg animate-pulse">
      {/* Back button skeleton */}
      <div className="h-5 w-20 rounded-sm bg-border-light" />

      {/* Points overview skeleton */}
      <Card>
        <div className="flex flex-col items-center py-xl">
          <div className="h-20 w-20 rounded-full bg-border-light" />
          <div className="mt-md h-10 w-32 rounded-sm bg-border-light" />
          <div className="mt-sm h-4 w-40 rounded-sm bg-border-light" />
        </div>
      </Card>

      {/* Badge tiers skeleton */}
      <Card>
        <div className="h-5 w-28 rounded-sm bg-border-light mb-lg" />
        <div className="space-y-md">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-md">
              <div className="h-12 w-12 rounded-full bg-border-light flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 w-24 rounded-sm bg-border-light" />
                <div className="mt-sm h-3 w-full rounded-full bg-border-light" />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Streak skeleton */}
      <Card>
        <div className="h-5 w-20 rounded-sm bg-border-light mb-md" />
        <div className="space-y-sm">
          <div className="h-4 w-48 rounded-sm bg-border-light" />
          <div className="h-4 w-40 rounded-sm bg-border-light" />
        </div>
      </Card>
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────

export default function LearnerGamification() {
  const user = useAppSelector((s) => s.auth.user);

  const { data: gamificationResponse, isLoading } = useGetUserGamificationQuery(
    user?.id ?? '',
    { skip: !user?.id }
  );

  const gamification = useMemo(
    () => gamificationResponse?.data ?? null,
    [gamificationResponse?.data]
  );

  const totalPoints = gamification?.totalPoints ?? 0;

  const earnedBadgeNames = useMemo(
    () => new Set(gamification?.badges?.map((b) => b.name.toLowerCase()) ?? []),
    [gamification?.badges]
  );

  const earnedBadgeMap = useMemo(() => {
    const map = new Map<string, string>();
    if (gamification?.badges) {
      for (const badge of gamification.badges) {
        map.set(badge.name.toLowerCase(), badge.earnedAt);
      }
    }
    return map;
  }, [gamification?.badges]);

  // Find next badge for the ring progress
  const nextTier = useMemo(() => {
    for (const tier of BADGE_TIERS) {
      if (totalPoints < tier.threshold) return tier;
    }
    return null;
  }, [totalPoints]);

  const overallProgressPercent = nextTier
    ? Math.min(100, Math.round((totalPoints / nextTier.threshold) * 100))
    : 100;

  // ── Loading state ──
  if (!user || isLoading) {
    return <GamificationSkeleton />;
  }

  // ── Empty / no gamification data state ──
  if (!gamification) {
    return (
      <div className="space-y-lg">
        <Link
          href="/learner/profile"
          className="inline-flex items-center gap-xs text-body-md font-medium text-text-secondary transition-colors hover:text-text-primary min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back
        </Link>

        <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
          <Trophy className="h-12 w-12 text-text-disabled" />
          <p className="mt-md text-body-lg font-medium text-text-secondary">
            No gamification data yet
          </p>
          <p className="mt-xs text-body-md text-text-disabled">
            Start completing courses to earn points and badges!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg">
      {/* ── Back Button ── */}
      <Link
        href="/learner/profile"
        className="inline-flex items-center gap-xs text-body-md font-medium text-text-secondary transition-colors hover:text-text-primary min-h-[44px]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Back
      </Link>

      {/* ── Section 1: Points Overview ── */}
      <Card className="overflow-hidden">
        <div className="flex flex-col items-center py-lg bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-md">
          {/* Animated progress ring */}
          <div className="relative h-[120px] w-[120px]">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              {/* Background ring */}
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-amber-100"
              />
              {/* Progress ring */}
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - overallProgressPercent / 100)}`}
                className="text-amber-500 transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Star className="h-5 w-5 text-amber-500 fill-amber-400" strokeWidth={1.5} />
              <span className="text-[28px] font-bold text-amber-600 leading-tight">
                {totalPoints}
              </span>
            </div>
          </div>
          <p className="mt-md text-body-lg font-semibold text-amber-700">Total Points Earned</p>
          {nextTier && (
            <p className="mt-xs text-caption text-amber-600/70">
              {overallProgressPercent}% to {nextTier.icon} {nextTier.name}
            </p>
          )}
        </div>
      </Card>

      {/* ── Section 2: Badge Tiers ── */}
      <Card>
        <h3 className="text-h3 text-text-primary mb-lg">Badge Tiers</h3>
        <div className="space-y-lg">
          {BADGE_TIERS.map((tier) => {
            const isEarned = earnedBadgeNames.has(tier.name.toLowerCase());
            const earnedAt = earnedBadgeMap.get(tier.name.toLowerCase());
            const progressPercent = Math.min(100, Math.round((totalPoints / tier.threshold) * 100));
            const pointsRemaining = Math.max(0, tier.threshold - totalPoints);

            return (
              <div
                key={tier.name}
                className={`
                  rounded-lg border p-md transition-all
                  ${
                    isEarned
                      ? 'border-amber-200 bg-amber-50/50 shadow-[0_0_16px_rgba(245,158,11,0.15)]'
                      : 'border-border-light bg-surface-background/50 opacity-70 grayscale-[30%]'
                  }
                `}
              >
                <div className="flex items-center gap-md">
                  {/* Badge Icon */}
                  <div
                    className={`
                      flex h-12 w-12 items-center justify-center rounded-full text-[28px] flex-shrink-0
                      ${isEarned ? 'bg-amber-100' : 'bg-border-light'}
                    `}
                  >
                    {tier.icon}
                  </div>

                  {/* Badge Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-body-md font-semibold text-text-primary">
                        {tier.name}
                      </span>
                      <span className="text-caption text-text-secondary">
                        {tier.threshold} pts
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-sm h-[6px] w-full overflow-hidden rounded-full bg-border-light">
                      <div
                        className={`
                          h-full rounded-full transition-all duration-700 ease-out
                          ${isEarned ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-gray-300 to-gray-400'}
                        `}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    {/* Status text */}
                    <div className="mt-xs">
                      {isEarned ? (
                        <span className="text-caption font-medium text-amber-600">
                          Earned!{' '}
                          {earnedAt && (
                            <span className="text-text-disabled font-normal">
                              {new Intl.DateTimeFormat('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              }).format(new Date(earnedAt))}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-caption text-text-disabled">
                          {pointsRemaining} more points needed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Section 3: Streak Section ── */}
      <Card>
        <h3 className="text-h3 text-text-primary mb-md">Streak</h3>

        <div className="space-y-md">
          {/* Current Streak */}
          <div className="flex items-center gap-md rounded-lg bg-gradient-to-r from-orange-50 to-red-50 px-md py-md">
            <Flame className="h-8 w-8 text-orange-500 flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-[24px] font-bold text-orange-600 leading-tight">
                {gamification.streak?.current ?? 0}{' '}
                <span className="text-body-md font-medium">days</span>
              </p>
              <p className="text-caption text-orange-700/70">Current Streak</p>
            </div>
          </div>

          {/* Longest Streak */}
          <div className="flex items-center gap-md rounded-lg bg-surface-background px-md py-md">
            <Trophy className="h-6 w-6 text-amber-500 flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-body-lg font-semibold text-text-primary">
                {gamification.streak?.longest ?? 0} days
              </p>
              <p className="text-caption text-text-secondary">Longest Streak</p>
            </div>
          </div>

          {/* Last Activity */}
          {gamification.streak?.lastActivityDate && (
            <div className="flex items-center gap-md rounded-lg bg-surface-background px-md py-sm">
              <Activity className="h-5 w-5 text-text-disabled flex-shrink-0" strokeWidth={1.5} />
              <p className="text-caption text-text-secondary">
                Last activity:{' '}
                {new Intl.DateTimeFormat('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }).format(new Date(gamification.streak.lastActivityDate))}
              </p>
            </div>
          )}

          {/* Motivational message */}
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-md py-sm text-center">
            <p className="text-body-md text-amber-700">
              Keep learning daily to build your streak!
            </p>
          </div>
        </div>
      </Card>

      {/* ── Section 4: Points Breakdown ── */}
      <Card>
        <h3 className="text-h3 text-text-primary mb-md">How Points Work</h3>

        <div className="grid grid-cols-2 gap-sm">
          {POINTS_INFO.map((info) => {
            const Icon = info.icon;
            return (
              <div
                key={info.label}
                className="flex flex-col items-center rounded-lg border border-border-light p-md text-center"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${info.color}`}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <p className="mt-sm text-[20px] font-bold text-text-primary">{info.points}</p>
                <p className="text-caption font-medium text-text-primary leading-tight">
                  {info.label}
                </p>
                <p className="text-[10px] text-text-disabled">{info.description}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-md rounded-lg bg-blue-50/50 border border-blue-100 px-md py-sm">
          <p className="text-caption text-blue-700 text-center">
            A module completes at 60 points (video + quiz). Proof of Work is an optional bonus.
          </p>
        </div>
      </Card>
    </div>
  );
}
