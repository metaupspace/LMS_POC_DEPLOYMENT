'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GraduationCap, BookOpen, Trophy, ArrowRight, ArrowLeft } from 'lucide-react';
import { useChangePasswordMutation } from '@/store/slices/api/authApi';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setUser } from '@/store/slices/authSlice';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// ─── Schema ─────────────────────────────────────────────

const onboardingPasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: z
      .string({ required_error: 'New password is required' })
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
        'Must contain uppercase, lowercase, number, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different',
    path: ['newPassword'],
  });

type OnboardingPasswordInput = z.infer<typeof onboardingPasswordSchema>;

// ─── Intro Slides ───────────────────────────────────────

const slides = [
  {
    icon: GraduationCap,
    title: 'Welcome to LMS',
    description: 'Your personal learning platform. Complete courses, attend sessions, and grow your skills.',
  },
  {
    icon: BookOpen,
    title: 'Learn & Earn Points',
    description: 'Watch videos, take quizzes, and submit proof of work to earn points toward badges.',
  },
  {
    icon: Trophy,
    title: 'Track Your Progress',
    description: 'Build streaks, unlock badges, and see your growth on the leaderboard.',
  },
];

// ─── Component ──────────────────────────────────────────

const roleRoutes: Record<string, string> = {
  admin: '/admin/dashboard',
  manager: '/admin/dashboard',
  coach: '/coach/home',
  staff: '/learner/home',
};

export default function OnboardingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [step, setStep] = useState(0); // 0-2 intro, 3 password form
  const [serverError, setServerError] = useState('');

  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingPasswordInput>({
    resolver: zodResolver(onboardingPasswordSchema),
  });

  const onSubmit = async (data: OnboardingPasswordInput) => {
    setServerError('');
    try {
      const result = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }).unwrap();

      if (!result.success) {
        setServerError(result.message || 'Failed to change password');
        return;
      }

      // Mark firstLogin as false in Redux (backend already set it via change-password)
      if (user) {
        dispatch(setUser({ ...user, firstLogin: false }));
      }

      router.push(roleRoutes[user?.role ?? 'staff'] ?? '/learner/home');
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setServerError(error.data?.message ?? 'Something went wrong. Please try again.');
    }
  };

  // ── Intro Slides ──────────────────────────────────────

  if (step < 3) {
    const slide = slides[step]!;
    const Icon = slide.icon;
    return (
      <div className="w-full max-w-[400px] animate-[slideUp_300ms_ease-out]">
        <div className="rounded-lg bg-surface-white p-xl shadow-md text-center">
          <div className="mb-lg flex justify-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-primary-light">
              <Icon className="h-9 w-9 text-primary-main" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-h2 text-text-primary">{slide.title}</h1>
          {step === 0 && user && (
            <p className="mt-xs text-body-lg text-primary-main font-medium">
              Hi, {user.name}!
            </p>
          )}
          <p className="mt-sm text-body-md text-text-secondary">{slide.description}</p>

          {/* Progress dots */}
          <div className="mt-lg flex justify-center gap-sm">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-[8px] rounded-full transition-all ${
                  i === step ? 'w-lg bg-primary-main' : 'w-[8px] bg-border-light'
                }`}
              />
            ))}
          </div>

          <div className="mt-lg flex gap-sm">
            {step > 0 && (
              <Button
                variant="secondary"
                onClick={() => setStep(step - 1)}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
            )}
            <Button
              isBlock
              onClick={() => setStep(step + 1)}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              {step === 2 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Password Change Form ──────────────────────────────

  return (
    <div className="w-full max-w-[400px] animate-[slideUp_300ms_ease-out]">
      <div className="rounded-lg bg-surface-white p-xl shadow-md">
        <div className="mb-lg text-center">
          <h1 className="text-h2 text-text-primary">Set New Password</h1>
          <p className="mt-xs text-body-md text-text-secondary">
            Please change your password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
          <Input
            label="Current Password"
            placeholder="Enter current password"
            isPassword
            error={errors.currentPassword?.message}
            autoComplete="current-password"
            {...register('currentPassword')}
          />

          <Input
            label="New Password"
            placeholder="Enter new password"
            isPassword
            error={errors.newPassword?.message}
            autoComplete="new-password"
            {...register('newPassword')}
          />

          <Input
            label="Confirm New Password"
            placeholder="Confirm new password"
            isPassword
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
            {...register('confirmPassword')}
          />

          {serverError && (
            <div className="rounded-sm bg-error/5 px-md py-sm text-body-md text-error" role="alert">
              {serverError}
            </div>
          )}

          <div className="mt-sm flex gap-sm">
            <Button variant="secondary" onClick={() => setStep(2)} disabled={isLoading}>
              Back
            </Button>
            <Button type="submit" isBlock isLoading={isLoading}>
              Complete Setup
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
