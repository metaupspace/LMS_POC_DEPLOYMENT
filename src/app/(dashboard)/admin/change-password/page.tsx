'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useChangePasswordMutation } from '@/store/slices/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { Button, Card, Input } from '@/components/ui';

export default function ChangePasswordPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword }).unwrap();
      dispatch(addToast({ type: 'success', message: 'Password changed successfully.', duration: 3000 }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to change password.';
      setError(message);
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-lg">
      {/* Header */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
          aria-label="Go back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-h1 text-text-primary">Change Password</h1>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-lg">
          <Input
            label="Current Password"
            isPassword
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />

          <Input
            label="New Password"
            isPassword
            placeholder="Enter new password (min 8 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />

          <Input
            label="Confirm New Password"
            isPassword
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {error && (
            <div className="rounded-sm border border-error/30 bg-error/5 px-md py-sm">
              <p className="text-body-md text-error">{error}</p>
            </div>
          )}

          <Button type="submit" variant="primary" isLoading={isLoading} isBlock>
            Change Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
