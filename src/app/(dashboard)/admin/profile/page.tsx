'use client';

import { ArrowLeft, Mail, Phone, Building2, MapPin, Globe } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useGetUserByIdQuery } from '@/store/slices/api/userApi';
import { Button, Card, Badge, LoadingSpinner } from '@/components/ui';

export default function ProfilePage() {
  const router = useRouter();
  const authUser = useAppSelector((s) => s.auth.user);
  const { data: userResponse, isLoading } = useGetUserByIdQuery(authUser?.id ?? '', {
    skip: !authUser?.id,
  });

  const user = userResponse?.data;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading profile..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-md">
        <p className="text-body-lg text-text-secondary">Failed to load profile.</p>
        <Button variant="primary" size="md" onClick={() => router.push('/admin/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-lg">
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
        <h1 className="text-h1 text-text-primary">My Profile</h1>
      </div>

      {/* Profile Card */}
      <Card>
        <div className="flex flex-col gap-lg">
          {/* Avatar + Name */}
          <div className="flex items-center gap-lg">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-h3 font-semibold text-primary-main">
              {initials}
            </div>
            <div>
              <h2 className="text-h2 text-text-primary">{user.name}</h2>
              <p className="text-body-md text-text-secondary">{user.empId}</p>
              <div className="mt-xs flex items-center gap-sm">
                <Badge variant="info">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
                <Badge variant={user.status === 'active' ? 'success' : 'warning'}>
                  {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            <div className="flex items-center gap-sm">
              <Mail className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-caption text-text-secondary">Email</p>
                <p className="text-body-md text-text-primary">{user.email || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <Phone className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-caption text-text-secondary">Phone</p>
                <p className="text-body-md text-text-primary">{user.phone || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <Building2 className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-caption text-text-secondary">Domain</p>
                <p className="text-body-md text-text-primary">{user.domain || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <MapPin className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-caption text-text-secondary">Location</p>
                <p className="text-body-md text-text-primary">{user.location || '-'}</p>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <Globe className="h-4 w-4 text-text-secondary" />
              <div>
                <p className="text-caption text-text-secondary">Language</p>
                <p className="text-body-md text-text-primary">
                  {user.preferredLanguage === 'en' ? 'English' : user.preferredLanguage}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
