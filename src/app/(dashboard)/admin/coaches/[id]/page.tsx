'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { ArrowLeft, Edit3, Mail, Phone, MapPin, Building2, Globe, BookOpen, RefreshCw, KeyRound } from 'lucide-react';
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
import { updateUserSchema, type UpdateUserInput } from '@/lib/validators/user';
import { Button, Card, Input, Badge, LoadingSpinner, ConfirmDialog, Modal } from '@/components/ui';

// ─── Status Badge Variant ─────────────────────────────────

type StatusVariant = 'success' | 'warning' | 'default';

const statusVariantMap: Record<string, StatusVariant> = {
  active: 'success',
  offboarded: 'warning',
};

// ─── Coach Detail Page ────────────────────────────────────

export default function CoachDetailPage() {
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

  const coach = userResponse?.data;

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    values: coach
      ? {
          name: coach.name,
          email: coach.email,
          phone: coach.phone,
          domain: coach.domain,
          location: coach.location,
          preferredLanguage: coach.preferredLanguage,
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
      dispatch(addToast({ type: 'success', message: 'Coach updated successfully.', duration: 3000 }));
      setIsEditing(false);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to update coach.';
      setServerError(message);
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleOffboard = async () => {
    try {
      await offboardUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Coach offboarded successfully.', duration: 3000 }));
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to offboard coach.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleOnboard = async () => {
    try {
      await onboardUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Coach re-onboarded successfully.', duration: 3000 }));
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to re-onboard coach.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Coach deleted successfully.', duration: 3000 }));
      router.push('/admin/coaches');
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to delete coach.';
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

  // ─── Loading / Error States ────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading coach details..." />
      </div>
    );
  }

  if (isError || !coach) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-md">
        <p className="text-body-lg text-text-secondary">Failed to load coach details.</p>
        <Button variant="primary" size="md" onClick={() => router.push('/admin/coaches')}>
          Back to Coaches
        </Button>
      </div>
    );
  }

  // ─── Initials ──────────────────────────────────────────

  const initials = coach.name
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
            onClick={() => router.push('/admin/coaches')}
            className="flex h-10 w-10 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
            aria-label="Back to coaches"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-h1 text-text-primary">Coach Details</h1>
        </div>
        {isAdmin && !isEditing && coach.status === 'active' && (
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
              {coach.profileImage ? (
                <Image
                  src={coach.profileImage}
                  alt={coach.name}
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
                <h2 className="text-h2 text-text-primary">{coach.name}</h2>
                <p className="text-body-md text-text-secondary">{coach.empId}</p>
                <div className="mt-xs flex items-center gap-sm">
                  <Badge variant={statusVariantMap[coach.status] ?? 'default'}>
                    {coach.status.charAt(0).toUpperCase() + coach.status.slice(1)}
                  </Badge>
                  <Badge variant="info">Coach</Badge>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
              <div className="flex items-center gap-sm">
                <Mail className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Email</p>
                  <p className="text-body-md text-text-primary">{coach.email || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Phone className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Phone</p>
                  <p className="text-body-md text-text-primary">{coach.phone || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Building2 className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Domain</p>
                  <p className="text-body-md text-text-primary">{coach.domain || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <MapPin className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Location</p>
                  <p className="text-body-md text-text-primary">{coach.location || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-sm">
                <Globe className="h-4 w-4 text-text-secondary" />
                <div>
                  <p className="text-caption text-text-secondary">Language</p>
                  <p className="text-body-md text-text-primary">
                    {coach.preferredLanguage === 'en' ? 'English' : coach.preferredLanguage}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions — admin only */}
            {isAdmin && (
              <div className="flex items-center gap-md border-t border-border-light pt-lg">
                {coach.status === 'active' && (
                  <>
                    <Button
                      variant="secondary"
                      size="md"
                      leftIcon={<KeyRound className="h-4 w-4" />}
                      onClick={() => dispatch(openModal('reset-password-coach'))}
                    >
                      Reset Password
                    </Button>
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => dispatch(openModal('offboard-coach'))}
                    >
                      Off-board
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => dispatch(openModal('delete-coach'))}
                    >
                      Delete
                    </Button>
                  </>
                )}
                {coach.status === 'offboarded' && (
                  <>
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<RefreshCw className="h-4 w-4" />}
                      onClick={() => dispatch(openModal('onboard-coach'))}
                    >
                      Re-Onboard
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      onClick={() => dispatch(openModal('delete-coach'))}
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

      {/* Assigned Courses Section */}
      {!isEditing && (
        <Card
          className="max-w-3xl"
          header={
            <div className="flex items-center gap-sm">
              <BookOpen className="h-5 w-5 text-primary-main" />
              <h2 className="text-h3 text-text-primary">Assigned Courses</h2>
            </div>
          }
        >
          <p className="text-body-md text-text-secondary">
            Course data loaded from course assignments
          </p>
        </Card>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        modalId="offboard-coach"
        title="Off-board Coach"
        message={`Are you sure you want to off-board ${coach.name}? They will lose access to the platform.`}
        confirmLabel="Off-board"
        variant="danger"
        isLoading={isOffboarding}
        onConfirm={handleOffboard}
      />

      <ConfirmDialog
        modalId="delete-coach"
        title="Delete Coach"
        message={`Are you sure you want to permanently delete ${coach.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        modalId="onboard-coach"
        title="Re-Onboard Coach"
        message={`Are you sure you want to re-onboard ${coach.name}? They will regain access to the platform.`}
        confirmLabel="Re-Onboard"
        variant="primary"
        isLoading={isOnboarding}
        onConfirm={handleOnboard}
      />

      {/* Reset Password Modal */}
      <Modal
        modalId="reset-password-coach"
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
            Enter a new password for {coach.name}. They will be prompted to change it on next login.
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
