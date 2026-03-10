'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Globe,
  Bell,
  HelpCircle,
  KeyRound,
  LogOut,
  ChevronRight,
  ChevronDown,
  MapPin,
  Briefcase,
  Star,
  Flame,
  Award,
  ArrowRight,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import { useGetUserByIdQuery } from '@/store/slices/api/userApi';
import {
  useGetUserGamificationQuery,
  type GamificationData,
} from '@/store/slices/api/gamificationApi';
import { useChangePasswordMutation, useLogoutMutation } from '@/store/slices/api/authApi';
import {
  useGetCertificationsQuery,
  useGetTestsQuery,
  type CertificationData,
  type TestData as TestDataType,
} from '@/store/slices/api/testApi';
import { Card, Badge, Button, Input, ConfirmDialog, LoadingSpinner } from '@/components/ui';
import { LanguageSwitcher, HelpCenter } from '@/components/shared';

// ─── Badge Tiers ────────────────────────────────────────

const BADGE_TIERS = [
  { name: 'Rookie', threshold: 1000, icon: '\u{1F949}' },
  { name: 'Silver', threshold: 2000, icon: '\u{1F948}' },
  { name: 'Gold', threshold: 3000, icon: '\u{1F947}' },
  { name: 'Premium', threshold: 5000, icon: '\u{1F48E}' },
] as const;

// ─── Change Password Schema ─────────────────────────────

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'New password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
        'Must include uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z
      .string({ required_error: 'Please confirm your new password' })
      .min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must differ from current password',
    path: ['newPassword'],
  });

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

// ─── Initials Helper ─────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  const second = parts[1];
  if (first && second) {
    return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// ─── Skeleton Profile ────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-lg animate-pulse">
      {/* Avatar skeleton */}
      <Card className="flex flex-col items-center py-xl">
        <div className="h-[96px] w-[96px] rounded-full bg-border-light" />
        <div className="mt-md h-6 w-40 rounded-sm bg-border-light" />
        <div className="mt-sm h-4 w-24 rounded-sm bg-border-light" />
        <div className="mt-sm h-6 w-16 rounded-full bg-border-light" />
        <div className="mt-md flex gap-sm">
          <div className="h-6 w-24 rounded-full bg-border-light" />
          <div className="h-6 w-24 rounded-full bg-border-light" />
        </div>
      </Card>
      {/* Gamification skeleton */}
      <Card>
        <div className="h-16 w-full rounded-sm bg-border-light" />
        <div className="mt-md flex gap-sm">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 flex-1 rounded-sm bg-border-light" />
          ))}
        </div>
        <div className="mt-md h-8 w-full rounded-sm bg-border-light" />
      </Card>
      {/* Settings skeleton */}
      <div className="rounded-md bg-surface-white shadow-sm">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between px-lg py-md border-b border-border-light last:border-b-0"
          >
            <div className="flex items-center gap-md">
              <div className="h-5 w-5 rounded bg-border-light" />
              <div className="h-4 w-28 rounded-sm bg-border-light" />
            </div>
            <div className="h-5 w-5 rounded bg-border-light" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Settings Row ────────────────────────────────────────

interface SettingsRowProps {
  icon: React.ReactNode;
  label: string;
  rightElement?: React.ReactNode;
  onClick?: () => void;
  isLast?: boolean;
  danger?: boolean;
}

function SettingsRow({ icon, label, rightElement, onClick, isLast, danger }: SettingsRowProps) {
  return (
    <div
      className={`
        flex w-full items-center justify-between px-lg min-h-[52px]
        ${!isLast ? 'border-b border-border-light' : ''}
        ${onClick ? 'cursor-pointer active:bg-surface-background transition-colors' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className={`flex items-center gap-md ${danger ? 'text-error' : 'text-text-primary'}`}>
        {icon}
        <span className="text-body-md font-medium">{label}</span>
      </div>
      {rightElement}
    </div>
  );
}

// ─── Gamification Summary Section ────────────────────────

interface GamificationSummaryProps {
  gamification: GamificationData;
}

function GamificationSummary({ gamification }: GamificationSummaryProps) {
  const totalPoints = gamification.totalPoints ?? 0;
  const earnedBadgeNames = useMemo(
    () => new Set(gamification.badges?.map((b) => b.name.toLowerCase()) ?? []),
    [gamification.badges]
  );

  // Find the next badge tier
  const nextTier = useMemo(() => {
    for (const tier of BADGE_TIERS) {
      if (totalPoints < tier.threshold) return tier;
    }
    return null;
  }, [totalPoints]);

  const pointsToNext = nextTier ? nextTier.threshold - totalPoints : 0;
  const progressPercent = nextTier
    ? Math.min(100, Math.round((totalPoints / nextTier.threshold) * 100))
    : 100;

  return (
    <Card className="overflow-hidden">
      {/* Points display */}
      <div className="flex items-center justify-center gap-sm rounded-md bg-gradient-to-r from-amber-50 to-orange-50 py-lg px-md">
        <Star className="h-8 w-8 text-amber-500 fill-amber-400" strokeWidth={1.5} />
        <div className="text-center">
          <p className="text-[32px] font-bold text-amber-600 leading-tight">{totalPoints}</p>
          <p className="text-caption text-amber-700/70">Total Points</p>
        </div>
      </div>

      {/* Badge Tiers Row */}
      <div className="mt-lg">
        <div className="grid grid-cols-4 gap-xs">
          {BADGE_TIERS.map((tier) => {
            const isEarned = earnedBadgeNames.has(tier.name.toLowerCase());
            return (
              <div
                key={tier.name}
                className={`
                  flex flex-col items-center rounded-md py-sm px-xs text-center transition-all
                  ${
                    isEarned
                      ? 'bg-amber-50 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-surface-background opacity-50 grayscale'
                  }
                `}
              >
                <span className="text-[24px] leading-none">{tier.icon}</span>
                <span className="mt-xs text-[10px] font-semibold text-text-primary leading-tight">
                  {tier.name}
                </span>
                <span className="text-[9px] text-text-disabled">{tier.threshold}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak */}
      {gamification.streak && (
        <div className="mt-md flex items-center gap-sm rounded-md bg-orange-50/60 px-md py-sm">
          <Flame className="h-5 w-5 text-orange-500 flex-shrink-0" strokeWidth={1.5} />
          <span className="text-body-md font-semibold text-orange-700">
            {gamification.streak.current} day streak
          </span>
          <span className="text-caption text-text-disabled ml-auto">
            Best: {gamification.streak.longest}
          </span>
        </div>
      )}

      {/* Progress to next badge */}
      {nextTier ? (
        <div className="mt-md">
          <div className="flex items-center justify-between mb-xs">
            <span className="text-caption text-text-secondary">
              Progress to {nextTier.icon} {nextTier.name}
            </span>
            <span className="text-caption font-medium text-amber-600">{progressPercent}%</span>
          </div>
          <div className="h-[6px] w-full overflow-hidden rounded-full bg-border-light">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-xs text-caption text-text-disabled">
            {pointsToNext} pts to {nextTier.name}
          </p>
        </div>
      ) : (
        <div className="mt-md text-center">
          <p className="text-body-md font-medium text-amber-600">All badges earned!</p>
        </div>
      )}

      {/* View Details link */}
      <Link
        href="/learner/gamification"
        className="mt-md flex items-center justify-center gap-xs text-body-md font-medium text-primary-main transition-colors hover:text-primary-dark min-h-[44px]"
      >
        View Details
        <ArrowRight className="h-4 w-4" strokeWidth={2} />
      </Link>
    </Card>
  );
}

// ─── Change Password Section ─────────────────────────────

function ChangePasswordSection() {
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = useCallback(
    async (data: ChangePasswordForm) => {
      try {
        await changePassword({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }).unwrap();

        dispatch(
          addToast({
            type: 'success',
            message: 'Password changed successfully',
            duration: 3000,
          })
        );
        reset();
        setExpanded(false);
      } catch {
        dispatch(
          addToast({
            type: 'error',
            message: 'Failed to change password. Check your current password.',
            duration: 4000,
          })
        );
      }
    },
    [changePassword, dispatch, reset]
  );

  const handleCancel = useCallback(() => {
    reset();
    setExpanded(false);
  }, [reset]);

  return (
    <div className="border-b border-border-light">
      <SettingsRow
        icon={<KeyRound className="h-5 w-5" strokeWidth={1.5} />}
        label="Change Password"
        rightElement={
          expanded ? (
            <ChevronDown className="h-5 w-5 text-text-disabled" />
          ) : (
            <ChevronRight className="h-5 w-5 text-text-disabled" />
          )
        }
        onClick={() => setExpanded((prev) => !prev)}
        isLast
      />

      {expanded && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-md px-lg pb-lg pt-sm"
        >
          <Input
            label="Current Password"
            isPassword
            placeholder="Enter current password"
            error={errors.currentPassword?.message}
            {...register('currentPassword')}
          />
          <Input
            label="New Password"
            isPassword
            placeholder="Min 8 characters"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            label="Confirm Password"
            isPassword
            placeholder="Re-enter new password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <div className="flex gap-sm pt-sm">
            <Button
              type="button"
              variant="secondary"
              size="md"
              isBlock
              onClick={handleCancel}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isBlock
              isLoading={isLoading}
              className="min-h-[44px]"
            >
              Update Password
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Certifications Section ─────────────────────────────

function CertificationsSection() {
  const router = useRouter();
  const { data: certsResponse } = useGetCertificationsQuery();
  const { data: testsResponse } = useGetTestsQuery();

  const certifications = certsResponse?.data || [];
  const tests = testsResponse?.data || [];

  // Filter assigned tests that haven't been certified yet
  const certifiedTestIds = new Set(
    certifications.map((c) => {
      const test = c.test;
      if (typeof test === 'object' && test !== null) return (test as { _id: string })._id;
      return test as string;
    })
  );
  const availableTests = tests.filter(
    (t) => !certifiedTestIds.has(t._id)
  );

  if (certifications.length === 0 && availableTests.length === 0) return null;

  return (
    <div className="space-y-md">
      {/* Earned Certifications */}
      {certifications.length > 0 && (
        <Card>
          <h2 className="text-h3 font-semibold mb-md flex items-center gap-sm">
            <Award className="h-5 w-5 text-primary-main" /> My Certifications
          </h2>
          <div className="space-y-sm">
            {certifications.map((cert) => (
              <div
                key={cert._id}
                className="flex items-center gap-md rounded-md border border-success/30 bg-success/5 p-md"
              >
                <span className="text-2xl">{'\u{1F3C6}'}</span>
                <div>
                  <p className="text-body-md font-semibold text-primary-main">
                    {cert.title}
                  </p>
                  <p className="text-caption text-text-secondary">
                    Score: {cert.score}% — Earned:{' '}
                    {new Date(cert.earnedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Available Tests */}
      {availableTests.length > 0 && (
        <Card>
          <h2 className="text-h3 font-semibold mb-md">Available Tests</h2>
          <div className="space-y-sm">
            {availableTests.map((test) => (
              <div
                key={test._id}
                className="rounded-md border border-border-light p-md"
              >
                <h3 className="text-body-md font-medium">
                  {test.title}
                </h3>
                <p className="text-caption text-text-secondary mt-xs">
                  Pass to earn: &quot;{test.certificationTitle}&quot;
                </p>
                <p className="text-caption text-text-secondary">
                  {test.questions?.length || 0} questions
                  {test.timeLimitMinutes > 0
                    ? ` — ${test.timeLimitMinutes} min`
                    : ''}{' '}
                  — {test.maxAttempts} attempt
                  {test.maxAttempts > 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => router.push(`/learner/test/${test._id}`)}
                  className="mt-sm px-md py-xs bg-primary-main text-white rounded-sm text-caption font-medium hover:bg-primary-hover transition-colors"
                >
                  Take Test
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page Component ─────────────────────────────────

export default function LearnerProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [helpExpanded, setHelpExpanded] = useState(false);

  const { data: userResponse, isLoading: isUserLoading } = useGetUserByIdQuery(user?.id ?? '', {
    skip: !user?.id,
  });

  const { data: gamificationResponse, isLoading: isGamLoading } = useGetUserGamificationQuery(
    user?.id ?? '',
    { skip: !user?.id }
  );

  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();

  const fullUser = userResponse?.data;
  const gamification = useMemo(
    () => gamificationResponse?.data ?? null,
    [gamificationResponse?.data]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Continue with local logout even if API call fails
    }
    dispatch(closeModal());
    dispatch(logout());
    router.push('/login');
  }, [logoutMutation, dispatch, router]);

  // ── Loading state ──
  if (!user || isUserLoading || isGamLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-lg">
      {/* ── Profile Card ── */}
      <Card className="flex flex-col items-center py-xl">
        {/* Avatar */}
        {fullUser?.profileImage ? (
          <div className="relative h-[96px] w-[96px] overflow-hidden rounded-full">
            <Image
              src={fullUser.profileImage}
              alt={user.name}
              fill
              unoptimized
              className="object-cover"
              sizes="96px"
            />
          </div>
        ) : (
          <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-primary-light">
            <span className="text-[32px] font-bold text-primary-main">
              {getInitials(user.name)}
            </span>
          </div>
        )}

        {/* Name */}
        <h2 className="mt-md text-h2 text-text-primary text-center">{user.name}</h2>

        {/* EMP-ID */}
        <p className="mt-xs text-body-md text-text-secondary">{user.empId}</p>

        {/* Role Badge */}
        <div className="mt-sm">
          <Badge variant="info">Learner</Badge>
        </div>

        {/* Stats: Domain + Location */}
        {(fullUser?.domain || fullUser?.location) && (
          <div className="mt-md flex flex-wrap items-center justify-center gap-sm">
            {fullUser.domain && (
              <span className="inline-flex items-center gap-[4px] rounded-full bg-surface-background px-sm py-[4px] text-caption text-text-secondary">
                <Briefcase className="h-3 w-3" strokeWidth={1.5} />
                {fullUser.domain}
              </span>
            )}
            {fullUser.location && (
              <span className="inline-flex items-center gap-[4px] rounded-full bg-surface-background px-sm py-[4px] text-caption text-text-secondary">
                <MapPin className="h-3 w-3" strokeWidth={1.5} />
                {fullUser.location}
              </span>
            )}
          </div>
        )}
      </Card>

      {/* ── Gamification Section ── */}
      {gamification && <GamificationSummary gamification={gamification} />}

      {/* ── Certifications Section ── */}
      <CertificationsSection />

      {/* ── Settings Section ── */}
      <div className="rounded-md bg-surface-white shadow-sm overflow-hidden">
        {/* Language */}
        <SettingsRow
          icon={<Globe className="h-5 w-5" strokeWidth={1.5} />}
          label="Language"
          rightElement={
            <LanguageSwitcher />
          }
        />

        {/* Badge & Streak Tracking */}
        <Link href="/learner/gamification" className="block">
          <SettingsRow
            icon={<Award className="h-5 w-5" strokeWidth={1.5} />}
            label="Badge & Streak Tracking"
            rightElement={<ChevronRight className="h-5 w-5 text-text-disabled" />}
          />
        </Link>

        {/* Notification Center */}
        <Link href="/learner/notifications" className="block">
          <SettingsRow
            icon={<Bell className="h-5 w-5" strokeWidth={1.5} />}
            label="Notification Center"
            rightElement={<ChevronRight className="h-5 w-5 text-text-disabled" />}
          />
        </Link>

        {/* Help Center */}
        <div className="border-b border-border-light">
          <SettingsRow
            icon={<HelpCircle className="h-5 w-5" strokeWidth={1.5} />}
            label="Help Center"
            rightElement={
              helpExpanded ? (
                <ChevronDown className="h-5 w-5 text-text-disabled" />
              ) : (
                <ChevronRight className="h-5 w-5 text-text-disabled" />
              )
            }
            onClick={() => setHelpExpanded((prev) => !prev)}
            isLast
          />
          {helpExpanded && (
            <div className="px-lg pb-lg">
              <HelpCenter
                supervisor={{
                  name: 'Support Team',
                  role: 'Platform Support',
                  phone: '+91-9876543210',
                }}
                manager={{
                  name: 'Admin Office',
                  role: 'Administration',
                  phone: '+91-9876543211',
                }}
                className="shadow-none"
              />
            </div>
          )}
        </div>

        {/* Change Password */}
        <ChangePasswordSection />

        {/* Logout */}
        <SettingsRow
          icon={<LogOut className="h-5 w-5" strokeWidth={1.5} />}
          label="Logout"
          rightElement={
            isLoggingOut ? (
              <LoadingSpinner variant="button" />
            ) : undefined
          }
          onClick={() => dispatch(openModal('confirm-logout'))}
          danger
          isLast
        />
      </div>

      {/* ── Logout Confirmation Dialog ── */}
      <ConfirmDialog
        modalId="confirm-logout"
        title="Logout"
        message="Are you sure you want to logout? You will need to sign in again."
        confirmLabel="Logout"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isLoggingOut}
        onConfirm={handleLogout}
      />
    </div>
  );
}
