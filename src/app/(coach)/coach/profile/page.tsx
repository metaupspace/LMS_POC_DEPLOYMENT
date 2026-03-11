'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { baseApi } from '@/store/slices/api/baseApi';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import { useGetUserByIdQuery } from '@/store/slices/api/userApi';
import { useChangePasswordMutation, useLogoutMutation } from '@/store/slices/api/authApi';
import { Card, Badge, Button, Input, ConfirmDialog, LoadingSpinner } from '@/components/ui';
import { LanguageSwitcher, HelpCenter } from '@/components/shared';

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
      {/* Settings skeleton */}
      <div className="rounded-md bg-surface-white shadow-sm">
        {[...Array(5)].map((_, i) => (
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
  const content = (
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

  return content;
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

// ─── Main Page Component ─────────────────────────────────

export default function CoachProfile() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [helpExpanded, setHelpExpanded] = useState(false);

  const { data: userResponse, isLoading: isUserLoading } = useGetUserByIdQuery(user?.id ?? '', {
    skip: !user?.id,
  });

  const [logoutMutation, { isLoading: isLoggingOut }] = useLogoutMutation();

  const fullUser = userResponse?.data;

  const handleLogout = useCallback(async () => {
    try {
      await logoutMutation().unwrap();
    } catch {
      // Continue with local logout even if API call fails
    }
    dispatch(closeModal());
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());
    router.push('/login');
  }, [logoutMutation, dispatch, router]);

  // ── Loading state ──
  if (!user || isUserLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <div className="space-y-lg">
      {/* ── Profile Card ── */}
      <Card className="flex flex-col items-center justify-center py-xl">
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
        <p className="mt-xs text-body-md text-center text-text-secondary">{user.empId}</p>

        {/* Role Badge */}
        <div className="mt-sm flex items-center gap-xs justify-center">
          <Badge variant="info">Coach</Badge>
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

        {/* Notifications */}
        <Link href="/coach/notifications" className="block">
          <SettingsRow
            icon={<Bell className="h-5 w-5" strokeWidth={1.5} />}
            label="Notifications"
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
