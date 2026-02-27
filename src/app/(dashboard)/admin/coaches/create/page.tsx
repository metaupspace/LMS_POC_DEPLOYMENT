'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useCreateUserMutation } from '@/store/slices/api/userApi';
import { createUserSchema } from '@/lib/validators/user';
import type { CreateUserInput } from '@/lib/validators/user';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';
import { Button, Card, Input } from '@/components/ui';

export default function CreateCoach() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [createUser, { isLoading }] = useCreateUserMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: 'coach',
      preferredLanguage: 'en',
      domain: '',
      location: '',
      phone: '',
    },
  });

  const onSubmit = async (formData: CreateUserInput) => {
    try {
      await createUser({
        ...formData,
        role: 'coach',
      }).unwrap();
      dispatch(addToast({ type: 'success', message: 'Coach created successfully', duration: 3000 }));
      router.push('/admin/coaches');
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-lg">
      {/* Header */}
      <div className="flex items-center gap-md">
        <button
          type="button"
          onClick={() => router.push('/admin/coaches')}
          className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
          aria-label="Back to coaches"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-h1 text-text-primary">Add Coach</h1>
      </div>

      {/* Form */}
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-lg">
          <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
            <Input
              label="Name"
              placeholder="Full name"
              {...register('name')}
              error={errors.name?.message}
            />

            <Input
              label="Email"
              type="email"
              placeholder="email@company.com"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Phone"
              placeholder="Phone number"
              {...register('phone')}
              error={errors.phone?.message}
            />

            <Input
              label="Employee ID"
              placeholder="EMP-XXXX"
              {...register('empId')}
              error={errors.empId?.message}
            />

            <Input
              label="Password"
              isPassword
              placeholder="Minimum 8 characters"
              {...register('password')}
              error={errors.password?.message}
            />

            <Input
              label="Domain"
              placeholder="e.g. Technology, Sales"
              {...register('domain')}
              error={errors.domain?.message}
            />

            <Input
              label="Location"
              placeholder="City or office"
              {...register('location')}
              error={errors.location?.message}
            />
          </div>

          {/* Hidden role field is set via defaultValues */}
          <input type="hidden" {...register('role')} />

          {/* Actions */}
          <div className="flex items-center gap-sm pt-md">
            <Button type="submit" variant="primary" isLoading={isLoading}>
              Create Coach
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push('/admin/coaches')}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
