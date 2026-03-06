'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap } from 'lucide-react';
import { loginSchema, type LoginInput } from '@/lib/validators/auth';
import { useLoginMutation } from '@/store/slices/api/authApi';
import { useAppDispatch } from '@/store/hooks';
import { setCredentials } from '@/store/slices/authSlice';
import { baseApi } from '@/store/slices/api/baseApi';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useTranslation } from '@/i18n';

const roleRoutes: Record<string, string> = {
  admin: '/admin/dashboard',
  manager: '/admin/dashboard',
  coach: '/coach/home',
  staff: '/learner/home',
};

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const [login, { isLoading }] = useLoginMutation();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError('');
    try {
      const result = await login(data).unwrap();

      if (result.success && result.data) {
        const { accessToken, refreshToken, user } = result.data;

        dispatch(
          setCredentials({
            user: {
              id: user.id,
              name: user.name,
              empId: user.empId,
              role: user.role,
              email: user.email,
              firstLogin: user.firstLogin,
            },
            accessToken,
            refreshToken,
          })
        );

        // Force RTK Query to discard any cached notification data and refetch
        dispatch(baseApi.util.invalidateTags(['Notification']));

        // Redirect first-login users to onboarding
        if (user.firstLogin) {
          router.push('/onboarding');
          return;
        }

        router.push(roleRoutes[user.role] ?? '/login');
      } else {
        setServerError(result.message || 'Login failed');
      }
    } catch (err: unknown) {
      const error = err as { data?: { message?: string } };
      setServerError(error.data?.message ?? 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="w-full max-w-[400px] animate-[slideUp_300ms_ease-out]">
      <div className="rounded-lg bg-surface-white p-xl shadow-md">
        {/* Logo */}
        <div className="mb-xl flex flex-col items-center">
          <div className="mb-md flex h-[56px] w-[56px] items-center justify-center rounded-full bg-primary-light">
            <GraduationCap className="h-7 w-7 text-primary-main" strokeWidth={1.5} />
          </div>
          <h1 className="text-h2 text-text-primary">LMS Platform</h1>
          <p className="mt-xs text-body-md text-text-secondary">{t('auth.signInToAccount')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-md">
          <Input
            label={t('auth.empIdLabel')}
            placeholder={t('auth.empIdPlaceholder')}
            error={errors.empId?.message}
            autoComplete="username"
            {...register('empId')}
          />

          <Input
            label={t('auth.passwordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            isPassword
            error={errors.password?.message}
            autoComplete="current-password"
            {...register('password')}
          />

          {serverError && (
            <div className="rounded-sm bg-error/5 px-md py-sm text-body-md text-error" role="alert">
              {serverError}
            </div>
          )}

          <Button type="submit" isBlock isLoading={isLoading} className="mt-sm">
            {t('auth.loginButton')}
          </Button>
        </form>
      </div>
    </div>
  );
}
