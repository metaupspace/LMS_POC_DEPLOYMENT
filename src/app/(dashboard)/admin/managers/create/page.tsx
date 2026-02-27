'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { useCreateUserMutation } from '@/store/slices/api/userApi';
import { createUserSchema, type CreateUserInput } from '@/lib/validators/user';
import { Button, Card, Input } from '@/components/ui';

export default function CreateManagerPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [serverError, setServerError] = useState('');

  const [createUser, { isLoading }] = useCreateUserMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      empId: '',
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'manager',
      domain: '',
      location: '',
      preferredLanguage: 'en',
    },
  });

  const onSubmit = async (formData: CreateUserInput) => {
    setServerError('');
    try {
      await createUser({ ...formData, role: 'manager' }).unwrap();
      dispatch(addToast({ type: 'success', message: 'Manager created successfully.', duration: 3000 }));
      router.push('/admin/managers');
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to create manager.';
      setServerError(message);
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={() => router.push('/admin/managers')}
          className="flex h-10 w-10 items-center justify-center rounded-sm text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
          aria-label="Back to managers"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-h1 text-text-primary">Add Manager</h1>
      </div>

      {/* Form Card */}
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-lg">
          {/* Server Error */}
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
            placeholder="Enter phone number (optional)"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            label="Employee ID"
            placeholder="Enter employee ID"
            error={errors.empId?.message}
            {...register('empId')}
          />

          <Input
            label="Password"
            isPassword
            placeholder="Minimum 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />

          <Input
            label="Domain"
            placeholder="Enter domain (optional)"
            error={errors.domain?.message}
            {...register('domain')}
          />

          <Input
            label="Location"
            placeholder="Enter location (optional)"
            error={errors.location?.message}
            {...register('location')}
          />

          {/* Actions */}
          <div className="flex items-center justify-end gap-md pt-md">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/managers')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              Create Manager
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
