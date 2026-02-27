'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import {
  ArrowLeft,
  Edit3,
  Mail,
  Phone,
  MapPin,
  Building2,
  Globe,
  Star,
  Flame,
  Award,
  Calendar,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import {
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useOffboardUserMutation,
  useOnboardUserMutation,
  useResetPasswordMutation,
} from '@/store/slices/api/userApi';
import { useGetUserGamificationQuery } from '@/store/slices/api/gamificationApi';
import { useGetUserProgressQuery } from '@/store/slices/api/progressApi';
import type { ProgressData } from '@/store/slices/api/progressApi';
import type { BadgeData } from '@/store/slices/api/gamificationApi';
import { updateUserSchema, type UpdateUserInput } from '@/lib/validators/user';
import {
  Button,
  Card,
  Input,
  Badge,
  Table,
  LoadingSpinner,
  ConfirmDialog,
  Modal,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import type { BadgeTier } from '@/types/enums';

// ─── Status Badge Variant ─────────────────────────────────

type StatusVariant = 'success' | 'warning' | 'error' | 'default';

const statusVariantMap: Record<string, StatusVariant> = {
  active: 'success',
  offboarded: 'warning',
};

// ─── Progress Status Variant ──────────────────────────────

const progressStatusVariant: Record<string, StatusVariant> = {
  not_started: 'default',
  in_progress: 'warning',
  completed: 'success',
};

// ─── Badge Tier Variant ───────────────────────────────────

type BadgeComponentVariant = 'default' | 'info' | 'warning' | 'success';

const badgeTierVariant: Record<BadgeTier, BadgeComponentVariant> = {
  rookie: 'default',
  silver: 'info',
  gold: 'warning',
  premium: 'success',
};

// ─── Format Status Label ──────────────────────────────────

function formatStatusLabel(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Format Date ──────────────────────────────────────────

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Staff Detail Page ────────────────────────────────────

export default function StaffDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const isAdmin = currentUser?.role === 'admin';

  const [isEditing, setIsEditing] = useState(false);
  const [serverError, setServerError] = useState('');
  const [resetPwValue, setResetPwValue] = useState('');

  // RTK Query hooks
  const { data: userResponse, isLoading, isError } = useGetUserByIdQuery(id);
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [offboardUser, { isLoading: isOffboarding }] = useOffboardUserMutation();
  const [onboardUser, { isLoading: isOnboarding }] = useOnboardUserMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  // Gamification & Progress (only fetch when not editing to avoid unnecessary calls)
  const {
    data: gamificationResponse,
    isLoading: gamificationLoading,
  } = useGetUserGamificationQuery(id);
  const {
    data: progressResponse,
    isLoading: progressLoading,
  } = useGetUserProgressQuery(id);

  const staff = userResponse?.data;
  const gamification = gamificationResponse?.data;
  const progressRecords = progressResponse?.data ?? [];

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    values: staff
      ? {
          name: staff.name,
          email: staff.email,
          phone: staff.phone,
          domain: staff.domain,
          location: staff.location,
          preferredLanguage: staff.preferredLanguage,
        }
      : undefined,
  });

  // ─── Handlers ──────────────────────────────────────────

  const handleEditToggle = () => {
    if (isEditing) {
      reset();
    }
    setIsEditing((prev) => !prev);
    setServerError('');
  };

  const onSubmit = async (formData: UpdateUserInput) => {
    setServerError('');
    try {
      await updateUser({ id, body: formData }).unwrap();
      dispatch(addToast({ type: 'success', message: 'Staff member updated successfully.', duration: 3000 }));
      setIsEditing(false);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to update staff member.';
      setServerError(message);
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleOffboard = async () => {
    try {
      await offboardUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Staff member offboarded successfully.', duration: 3000 }));
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to offboard staff member.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Staff member deleted successfully.', duration: 3000 }));
      router.push('/admin/staff');
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to delete staff member.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleOnboard = async () => {
    try {
      await onboardUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Staff member re-onboarded successfully.', duration: 3000 }));
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to re-onboard staff member.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwValue || resetPwValue.length < 8) {
      dispatch(addToast({ type: 'error', message: 'Password must be at least 8 characters.', duration: 3000 }));
      return;
    }
    try {
      await resetPassword({ id, newPassword: resetPwValue }).unwrap();
      dispatch(closeModal());
      setResetPwValue('');
      dispatch(addToast({ type: 'success', message: 'Password reset successfully.', duration: 3000 }));
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to reset password.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  // ─── Progress Table Columns ───────────────────────────

  const progressColumns: TableColumn<ProgressData>[] = [
    {
      key: 'module',
      label: 'Module / Course',
      render: (_value: unknown, row: ProgressData) => (
        <div>
          <p className="text-body-md font-medium text-text-primary">{row.module}</p>
          <p className="text-caption text-text-secondary">{row.course}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown) => {
        const s = value as string;
        return (
          <Badge variant={progressStatusVariant[s] ?? 'default'}>
            {formatStatusLabel(s)}
          </Badge>
        );
      },
    },
    {
      key: 'totalModulePoints',
      label: 'Points Earned',
      align: 'center',
      render: (value: unknown) => (
        <span className="text-body-md font-semibold text-text-primary">
          {value as number}
        </span>
      ),
    },
    {
      key: 'completedAt',
      label: 'Completed',
      align: 'right',
      render: (value: unknown) => (
        <span className="text-body-md text-text-secondary">
          {formatDate(value as string | null)}
        </span>
      ),
    },
  ];

  // ─── Loading / Error States ────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading staff details..." />
      </div>
    );
  }

  if (isError || !staff) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-md">
        <p className="text-body-lg text-text-secondary">Failed to load staff details.</p>
        <Button variant="primary" size="md" onClick={() => router.push('/admin/staff')}>
          Back to Staff
        </Button>
      </div>
    );
  }

  // ─── Initials ──────────────────────────────────────────

  const initials = staff.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-md">
          <button
            type="button"
            onClick={() => router.push('/admin/staff')}
            className="flex h-10 w-10 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
            aria-label="Back to staff"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-h1 text-text-primary">Staff Member Details</h1>
        </div>
        {isAdmin && !isEditing && staff.status === 'active' && (
          <Button
            variant="secondary"
            size="md"
            leftIcon={<Edit3 className="h-4 w-4" />}
            onClick={handleEditToggle}
          >
            Edit
          </Button>
        )}
      </div>

      {/* Profile Section */}
      <Card className="max-w-3xl">
        {isEditing ? (
          /* ── Edit Mode ───────────────────────────────── */
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
            {serverError && (
              <div className="rounded-sm border border-error/30 bg-error/5 px-md py-sm">
                <p className="text-body-md text-error">{serverError}</p>
              </div>
            )}

            <Input
              label="Name"
              placeholder="Enter full name"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="Enter email address"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Phone"
              type="tel"
              placeholder="Enter phone number"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Domain"
              placeholder="Enter domain"
              error={errors.domain?.message}
              {...register('domain')}
            />

            <Input
              label="Location"
              placeholder="Enter location"
              error={errors.location?.message}
              {...register('location')}
            />

            <div className="flex items-center justify-end gap-md pt-md">
              <Button type="button" variant="secondary" onClick={handleEditToggle}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" isLoading={isUpdating}>
                Save Changes
              </Button>
            </div>
          </form>
        ) : (
          /* ── View Mode ───────────────────────────────── */
          <div className="flex flex-col gap-lg">
            {/* Profile Header */}
            <div className="flex items-center gap-lg">
              {staff.profileImage ? (
                <Image
                  src={staff.profileImage}
                  alt={staff.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-h3 font-semibold text-primary-main">
                  {initials}
                </div>
              )}
              <div>
                <h2 className="text-h2 text-text-primary">{staff.name}</h2>
                <p className="text-body-md text-text-secondary">{staff.empId}</p>
                <div className="mt-xs flex items-center gap-sm">
                  <Badge variant={statusVariantMap[staff.status] ?? 'default'}>
                    {staff.status.charAt(0).toUpperCase() + staff.status.slice(1)}
                  </Badge>
                  <Badge variant="info">Staff</Badge>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <div className="flex items-center gap-sm">
                <Mail className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Email</p>
                  <p className="text-body-md text-text-primary">{staff.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Phone className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Phone</p>
                  <p className="text-body-md text-text-primary">{staff.phone || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Building2 className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Domain</p>
                  <p className="text-body-md text-text-primary">{staff.domain || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <MapPin className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Location</p>
                  <p className="text-body-md text-text-primary">{staff.location || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Globe className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Language</p>
                  <p className="text-body-md text-text-primary">
                    {staff.preferredLanguage === 'en' ? 'English' : staff.preferredLanguage}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions — admin only */}
            {isAdmin && (
              <div className="flex items-center gap-md border-t border-border-light pt-lg">
                {staff.status === 'active' && (
                  <>
                    <Button
                      variant="secondary"
                      size="md"
                      leftIcon={<KeyRound className="h-4 w-4" />}
                      onClick={() => dispatch(openModal('reset-password-staff'))}
                    >
                      Reset Password
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => dispatch(openModal('offboard-staff'))}
                    >
                      Off-board
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => dispatch(openModal('delete-staff'))}
                    >
                      Delete
                    </Button>
                  </>
                )}
                {staff.status === 'offboarded' && (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                      onClick={() => dispatch(openModal('onboard-staff'))}
                    >
                      Re-Onboard
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => dispatch(openModal('delete-staff'))}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Learner Analytics Section (view mode only) */}
      {!isEditing && (
        <div className="flex max-w-3xl flex-col gap-lg">
          <h2 className="text-h2 text-text-primary">Learner Analytics</h2>

          {gamificationLoading || progressLoading ? (
            <div className="flex items-center justify-center py-xl">
              <LoadingSpinner variant="inline" text="Loading analytics..." />
            </div>
          ) : !gamification && progressRecords.length === 0 ? (
            <Card>
              <p className="py-lg text-center text-body-md text-text-secondary">
                No learning data yet
              </p>
            </Card>
          ) : (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
                {/* Total Points */}
                <Card>
                  <div className="flex items-center gap-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light">
                      <Star className="h-5 w-5 text-primary-main" />
                    </div>
                    <div>
                      <p className="text-h1 font-semibold text-text-primary">
                        {gamification?.totalPoints ?? 0}
                      </p>
                      <p className="text-caption text-text-secondary">Total Points</p>
                    </div>
                  </div>
                </Card>

                {/* Current Streak */}
                <Card>
                  <div className="flex items-center gap-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10">
                      <Flame className="h-5 w-5 text-error" />
                    </div>
                    <div>
                      <p className="text-h1 font-semibold text-text-primary">
                        {gamification?.streak.current ?? 0}
                      </p>
                      <p className="text-caption text-text-secondary">Current Streak</p>
                    </div>
                  </div>
                </Card>

                {/* Badges Earned */}
                <Card>
                  <div className="flex items-center gap-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10">
                      <Award className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-h1 font-semibold text-text-primary">
                        {gamification?.badges.length ?? 0}
                      </p>
                      <p className="text-caption text-text-secondary">Badges Earned</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Badges Display */}
              {gamification && gamification.badges.length > 0 && (
                <Card
                  header={
                    <div className="flex items-center gap-sm">
                      <Award className="h-5 w-5 text-primary-main" />
                      <h3 className="text-h3 text-text-primary">Badges</h3>
                    </div>
                  }
                >
                  <div className="flex flex-wrap gap-sm">
                    {gamification.badges.map((badge: BadgeData) => (
                      <Badge
                        key={badge.name}
                        variant={badgeTierVariant[badge.name as BadgeTier] ?? 'default'}
                        className="px-md py-xs text-body-md"
                      >
                        {badge.name.charAt(0).toUpperCase() + badge.name.slice(1)}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}

              {/* Progress Table */}
              {progressRecords.length > 0 && (
                <Card
                  header={
                    <div className="flex items-center gap-sm">
                      <Calendar className="h-5 w-5 text-primary-main" />
                      <h3 className="text-h3 text-text-primary">Learning Progress</h3>
                    </div>
                  }
                  noPadding
                >
                  <div className="p-md">
                    <Table<ProgressData>
                      columns={progressColumns}
                      data={progressRecords}
                      rowKey="_id"
                      emptyMessage="No progress records found"
                    />
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        modalId="offboard-staff"
        title="Off-board Staff Member"
        message={`Are you sure you want to off-board ${staff.name}? They will lose access to the platform.`}
        confirmLabel="Off-board"
        variant="danger"
        isLoading={isOffboarding}
        onConfirm={handleOffboard}
      />

      <ConfirmDialog
        modalId="delete-staff"
        title="Delete Staff Member"
        message={`Are you sure you want to permanently delete ${staff.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        modalId="onboard-staff"
        title="Re-Onboard Staff Member"
        message={`Are you sure you want to re-onboard ${staff.name}? They will regain access to the platform.`}
        confirmLabel="Re-Onboard"
        variant="primary"
        isLoading={isOnboarding}
        onConfirm={handleOnboard}
      />

      {/* Reset Password Modal */}
      <Modal
        modalId="reset-password-staff"
        title="Reset Password"
        maxWidth="sm"
        onClose={() => setResetPwValue('')}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => { dispatch(closeModal()); setResetPwValue(''); }}>
              Cancel
            </Button>
            <Button variant="primary" size="md" onClick={handleResetPassword} isLoading={isResetting}>
              Reset Password
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-md">
          <p className="text-body-md text-text-secondary">
            Enter a new password for {staff.name}. They will be prompted to change it on next login.
          </p>
          <Input
            label="New Password"
            type="password"
            placeholder="Minimum 8 characters"
            value={resetPwValue}
            onChange={(e) => setResetPwValue(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
