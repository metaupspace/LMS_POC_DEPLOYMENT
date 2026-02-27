'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Edit, UserX, Trash2, Save, X, RefreshCw, KeyRound } from 'lucide-react';
import {
  useGetUserByIdQuery,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useOffboardUserMutation,
  useOnboardUserMutation,
  useResetPasswordMutation,
} from '@/store/slices/api/userApi';
import type { UpdateUserBody } from '@/store/slices/api/userApi';
import { updateUserSchema } from '@/lib/validators/user';
import type { UpdateUserInput } from '@/lib/validators/user';
import { useAppDispatch } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import {
  Button,
  Card,
  Input,
  Badge,
  LoadingSpinner,
  ConfirmDialog,
  Modal,
} from '@/components/ui';

// ─── Helpers ────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getStatusVariant(status: string): 'success' | 'warning' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'offboarded':
      return 'warning';
    default:
      return 'default';
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ─── Component ──────────────────────────────────────────

export default function ManagerDetail() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const id = params.id as string;

  const { data: response, isLoading, isError } = useGetUserByIdQuery(id);
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [offboardUser, { isLoading: isOffboarding }] = useOffboardUserMutation();
  const [onboardUser, { isLoading: isOnboarding }] = useOnboardUserMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [resetPwValue, setResetPwValue] = useState('');

  const user = response?.data ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
  });

  // Reset form defaults when user data loads or edit mode changes
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone,
        domain: user.domain,
        location: user.location,
        preferredLanguage: user.preferredLanguage,
      });
    }
  }, [user, reset, isEditing]);

  const handleSave = useCallback(
    async (formData: UpdateUserInput) => {
      try {
        const body: UpdateUserBody = {};
        if (formData.name) body.name = formData.name;
        if (formData.email) body.email = formData.email;
        if (formData.phone !== undefined) body.phone = formData.phone;
        if (formData.domain !== undefined) body.domain = formData.domain;
        if (formData.location !== undefined) body.location = formData.location;
        if (formData.preferredLanguage !== undefined) body.preferredLanguage = formData.preferredLanguage;

        await updateUser({ id, body }).unwrap();
        dispatch(addToast({ type: 'success', message: 'Manager updated successfully', duration: 3000 }));
        setIsEditing(false);
      } catch (err) {
        dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
      }
    },
    [id, updateUser, dispatch]
  );

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        phone: user.phone,
        domain: user.domain,
        location: user.location,
        preferredLanguage: user.preferredLanguage,
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Manager deleted successfully', duration: 3000 }));
      router.push('/admin/managers');
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    }
  };

  const handleOffboard = async () => {
    try {
      await offboardUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Manager offboarded successfully', duration: 3000 }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    }
  };

  const handleOnboard = async () => {
    try {
      await onboardUser(id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Manager re-onboarded successfully', duration: 3000 }));
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
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

  // ── Loading & Error States ────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading manager details..." />
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-md">
        <p className="text-body-lg text-text-secondary">Manager not found.</p>
        <Button variant="secondary" onClick={() => router.push('/admin/managers')}>
          Back to Managers
        </Button>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl space-y-lg">
      {/* Header */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={() => router.push('/admin/managers')}
          className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
          aria-label="Back to managers"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-h1 text-text-primary">Manager Details</h1>
      </div>

      {/* Profile Section */}
      <Card>
        <div className="flex flex-col items-start gap-lg sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary-light">
            <span className="text-h2 font-semibold text-primary-main">
              {getInitials(user.name)}
            </span>
          </div>

          {/* Name & Meta */}
          <div className="flex-1">
            {isEditing ? (
              <Input
                label="Name"
                {...register('name')}
                error={errors.name?.message}
              />
            ) : (
              <>
                <h2 className="text-h2 text-text-primary">{user.name}</h2>
                <div className="mt-xs flex items-center gap-sm">
                  <span className="text-body-md text-text-secondary">{user.empId}</span>
                  <Badge variant="info">{capitalize(user.role)}</Badge>
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Details Grid */}
      <Card>
        <form onSubmit={handleSubmit(handleSave)}>
          <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
            {/* Email */}
            <div>
              {isEditing ? (
                <Input
                  label="Email"
                  type="email"
                  {...register('email')}
                  error={errors.email?.message}
                />
              ) : (
                <div>
                  <p className="text-caption font-medium uppercase text-text-secondary">Email</p>
                  <p className="mt-xs text-body-md text-text-primary">{user.email}</p>
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              {isEditing ? (
                <Input
                  label="Phone"
                  {...register('phone')}
                  error={errors.phone?.message}
                />
              ) : (
                <div>
                  <p className="text-caption font-medium uppercase text-text-secondary">Phone</p>
                  <p className="mt-xs text-body-md text-text-primary">{user.phone || '-'}</p>
                </div>
              )}
            </div>

            {/* Domain */}
            <div>
              {isEditing ? (
                <Input
                  label="Domain"
                  {...register('domain')}
                  error={errors.domain?.message}
                />
              ) : (
                <div>
                  <p className="text-caption font-medium uppercase text-text-secondary">Domain</p>
                  <p className="mt-xs text-body-md text-text-primary">{user.domain || '-'}</p>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              {isEditing ? (
                <Input
                  label="Location"
                  {...register('location')}
                  error={errors.location?.message}
                />
              ) : (
                <div>
                  <p className="text-caption font-medium uppercase text-text-secondary">Location</p>
                  <p className="mt-xs text-body-md text-text-primary">{user.location || '-'}</p>
                </div>
              )}
            </div>

            {/* Status (read-only in both modes) */}
            <div>
              <p className="text-caption font-medium uppercase text-text-secondary">Status</p>
              <div className="mt-xs">
                <Badge variant={getStatusVariant(user.status)}>{capitalize(user.status)}</Badge>
              </div>
            </div>

            {/* Preferred Language */}
            <div>
              {isEditing ? (
                <Input
                  label="Preferred Language"
                  {...register('preferredLanguage')}
                  error={errors.preferredLanguage?.message}
                />
              ) : (
                <div>
                  <p className="text-caption font-medium uppercase text-text-secondary">
                    Preferred Language
                  </p>
                  <p className="mt-xs text-body-md text-text-primary">
                    {user.preferredLanguage || 'en'}
                  </p>
                </div>
              )}
            </div>

            {/* Created Date (always read-only) */}
            <div>
              <p className="text-caption font-medium uppercase text-text-secondary">Created</p>
              <p className="mt-xs text-body-md text-text-primary">{formatDate(user.createdAt)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-xl flex flex-wrap items-center gap-sm">
            {isEditing ? (
              <>
                <Button
                  type="submit"
                  variant="primary"
                  leftIcon={<Save className="h-4 w-4" />}
                  isLoading={isUpdating}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  leftIcon={<X className="h-4 w-4" />}
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                {user.status === 'active' && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<Edit className="h-4 w-4" />}
                      onClick={() => setIsEditing(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<KeyRound className="h-4 w-4" />}
                      onClick={() => dispatch(openModal('reset-password-manager'))}
                    >
                      Reset Password
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      leftIcon={<UserX className="h-4 w-4" />}
                      onClick={() => dispatch(openModal('offboard-manager'))}
                    >
                      Off-board
                    </Button>
                  </>
                )}
                {user.status === 'offboarded' && (
                  <Button
                    type="button"
                    variant="primary"
                    leftIcon={<RefreshCw className="h-4 w-4" />}
                    onClick={() => dispatch(openModal('onboard-manager'))}
                  >
                    Re-Onboard
                  </Button>
                )}
                <Button
                  type="button"
                  variant="danger"
                  leftIcon={<Trash2 className="h-4 w-4" />}
                  onClick={() => dispatch(openModal('delete-manager'))}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        </form>
      </Card>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        modalId="offboard-manager"
        title="Off-board Manager"
        message={`Are you sure you want to off-board ${user.name}? They will lose access to the platform.`}
        confirmLabel="Off-board"
        variant="danger"
        isLoading={isOffboarding}
        onConfirm={handleOffboard}
      />

      <ConfirmDialog
        modalId="delete-manager"
        title="Delete Manager"
        message={`Are you sure you want to delete ${user.name}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        modalId="onboard-manager"
        title="Re-Onboard Manager"
        message={`Are you sure you want to re-onboard ${user.name}? They will regain access to the platform.`}
        confirmLabel="Re-Onboard"
        variant="primary"
        isLoading={isOnboarding}
        onConfirm={handleOnboard}
      />

      {/* Reset Password Modal */}
      <Modal
        modalId="reset-password-manager"
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
            Enter a new password for {user.name}. They will be prompted to change it on next login.
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
