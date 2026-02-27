'use client';

import { useRouter } from 'next/navigation';
import {
  Users,
  GraduationCap,
  BookOpen,
  CalendarDays,
  UserCog,
  Plus,
  ArrowRight,
  Activity,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { useGetDashboardStatsQuery } from '@/store/slices/api/dashboardApi';
import { useGetSessionsQuery } from '@/store/slices/api/sessionApi';
import { useGetNotificationsQuery } from '@/store/slices/api/notificationApi';
import { Card, Button, LoadingSpinner, Badge } from '@/components/ui';
import type { ReactNode } from 'react';
import { UserRole } from '@/types/enums';
import { useTranslation } from '@/i18n';

// ─── Stat Card Config ───────────────────────────────────

interface StatCardConfig {
  key: string;
  labelKey: string;
  icon: ReactNode;
  bgColor: string;
  iconColor: string;
  adminOnly?: boolean;
}

const statCards: StatCardConfig[] = [
  {
    key: 'activeCourses',
    labelKey: 'dashboard.activeCourses',
    icon: <BookOpen className="h-5 w-5" />,
    bgColor: 'bg-primary-light',
    iconColor: 'text-primary-main',
  },
  {
    key: 'upcomingSessions',
    labelKey: 'dashboard.upcomingSessions',
    icon: <CalendarDays className="h-5 w-5" />,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
  {
    key: 'activeStaff',
    labelKey: 'dashboard.totalStaff',
    icon: <Users className="h-5 w-5" />,
    bgColor: 'bg-green-50',
    iconColor: 'text-success',
  },
  {
    key: 'activeCoaches',
    labelKey: 'dashboard.totalCoaches',
    icon: <GraduationCap className="h-5 w-5" />,
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600',
  },
  {
    key: 'activeManagers',
    labelKey: 'dashboard.totalManagers',
    icon: <UserCog className="h-5 w-5" />,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    adminOnly: true,
  },
];

// ─── Relative Time Helper ───────────────────────────────

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Format Session Date/Time ───────────────────────────

function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Dashboard Page ─────────────────────────────────────

export default function DashboardHome() {
  const router = useRouter();
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = user?.role === UserRole.ADMIN;

  // RTK Query hooks
  const {
    data: statsResponse,
    isLoading: statsLoading,
    isError: statsError,
  } = useGetDashboardStatsQuery();

  const {
    data: sessionsResponse,
    isLoading: sessionsLoading,
  } = useGetSessionsQuery({
    limit: 3,
    status: 'upcoming',
    sortBy: 'date',
    sortOrder: 'asc',
  });

  const {
    data: notificationsResponse,
    isLoading: notificationsLoading,
  } = useGetNotificationsQuery({
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const stats = statsResponse?.data;
  const sessions = sessionsResponse?.data ?? [];
  const notifications = notificationsResponse?.data ?? [];

  // Filter stat cards based on role
  const visibleStatCards = statCards.filter(
    (card) => !card.adminOnly || isAdmin
  );

  // ─── Loading State ──────────────────────────────────────

  if (statsLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading dashboard..." />
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────

  if (statsError || !stats) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-md">
        <p className="text-body-lg text-text-secondary">
          Failed to load dashboard data. Please try again.
        </p>
        <Button
          variant="primary"
          size="md"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="space-y-xl">
      {/* Page Header */}
      <div>
        <h1 className="text-h1 text-text-primary">{t('dashboard.dashboard')}</h1>
        <p className="mt-xs text-body-lg text-text-secondary">
          Welcome back, {user?.name ?? 'Admin'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-5">
        {visibleStatCards.map((card) => {
          const value = stats[card.key as keyof typeof stats] ?? 0;
          return (
            <Card key={card.key}>
              <div className="flex items-center gap-md">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${card.bgColor}`}
                >
                  <span className={card.iconColor}>{card.icon}</span>
                </div>
                <div>
                  <p className="text-h1 font-semibold text-text-primary">
                    {value}
                  </p>
                  <p className="text-caption text-text-secondary">
                    {t(card.labelKey)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Two Column Layout: Recent Activities + Quick Actions */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-3">
        {/* Recent Activities — 2/3 width */}
        <div className="lg:col-span-2">
          <Card
            header={
              <div className="flex items-center gap-sm">
                <Activity className="h-5 w-5 text-primary-main" />
                <h2 className="text-h3 text-text-primary">
                  {t('dashboard.recentActivity')}
                </h2>
              </div>
            }
          >
            {notificationsLoading ? (
              <div className="flex items-center justify-center py-xl">
                <LoadingSpinner variant="inline" text="Loading activities..." />
              </div>
            ) : notifications.length === 0 ? (
              <p className="py-xl text-center text-body-md text-text-secondary">
                No recent activities
              </p>
            ) : (
              <ul className="divide-y divide-border-light">
                {notifications.map((notification) => (
                  <li
                    key={notification._id}
                    className="flex items-start gap-md py-md first:pt-0 last:pb-0"
                  >
                    <span className="mt-[6px] h-2 w-2 shrink-0 rounded-full bg-primary-main" />
                    <div className="min-w-0 flex-1">
                      <p className="text-body-md text-text-primary">
                        {notification.message}
                      </p>
                      <div className="mt-xs flex items-center gap-xs">
                        <Clock className="h-3 w-3 text-text-secondary" />
                        <span className="text-caption text-text-secondary">
                          {getRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!notification.read && (
                      <Badge variant="info">New</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Quick Actions — 1/3 width */}
        <div className="lg:col-span-1">
          <Card
            header={
              <div className="flex items-center gap-sm">
                <ArrowRight className="h-5 w-5 text-primary-main" />
                <h2 className="text-h3 text-text-primary">{t('dashboard.quickActions')}</h2>
              </div>
            }
          >
            <div className="flex flex-col gap-sm">
              {isAdmin && (
                <Button
                  variant="primary"
                  size="md"
                  isBlock
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => router.push('/admin/staff/create')}
                >
                  {t('dashboard.addStaff')}
                </Button>
              )}
              <Button
                variant="primary"
                size="md"
                isBlock
                leftIcon={<BookOpen className="h-4 w-4" />}
                onClick={() => router.push('/admin/courses/create')}
              >
                {t('dashboard.createCourse')}
              </Button>
              <Button
                variant="primary"
                size="md"
                isBlock
                leftIcon={<CalendarDays className="h-4 w-4" />}
                onClick={() => router.push('/admin/sessions/create')}
              >
                {t('dashboard.scheduleSession')}
              </Button>
              <Button
                variant="primary"
                size="md"
                isBlock
                leftIcon={<GraduationCap className="h-4 w-4" />}
                onClick={() => router.push('/admin/courses')}
              >
                {t('dashboard.assignCourse')}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Upcoming Training Sessions */}
      <div>
        <div className="mb-md flex items-center justify-between">
          <h2 className="text-h2 text-text-primary">
            {t('dashboard.upcomingSessions')}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            rightIcon={<ArrowRight className="h-4 w-4" />}
            onClick={() => router.push('/admin/sessions')}
          >
            {t('common.viewAll')}
          </Button>
        </div>

        {sessionsLoading ? (
          <div className="flex items-center justify-center py-xl">
            <LoadingSpinner variant="inline" text="Loading sessions..." />
          </div>
        ) : sessions.length === 0 ? (
          <Card>
            <p className="py-xl text-center text-body-md text-text-secondary">
              No upcoming training sessions
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => {
              const instructorName =
                typeof session.instructor === 'object' &&
                session.instructor !== null
                  ? session.instructor.name
                  : 'TBD';

              return (
                <Card
                  key={session._id}
                  hoverable
                  noPadding
                  className="cursor-pointer overflow-hidden"
                  onClick={() => router.push(`/admin/sessions/${session._id}`)}
                >
                  {/* Thumbnail placeholder */}
                  <div className="flex h-[140px] items-center justify-center bg-surface-background">
                    <CalendarDays className="h-10 w-10 text-text-disabled" />
                  </div>

                  <div className="p-lg">
                    <h3 className="text-h3 text-text-primary line-clamp-1">
                      {session.title}
                    </h3>

                    <div className="mt-sm flex items-center gap-xs text-caption text-text-secondary">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      <span className="line-clamp-1">
                        {session.location}
                      </span>
                      <span className="mx-xs">|</span>
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span className="whitespace-nowrap">
                        {formatSessionDate(session.date)}
                        {session.timeSlot ? `, ${session.timeSlot}` : ''}
                      </span>
                    </div>

                    <div className="mt-sm flex items-center gap-xs text-body-md text-text-secondary">
                      <GraduationCap className="h-4 w-4 shrink-0" />
                      <span>Coach: {instructorName}</span>
                    </div>

                    <div className="mt-sm">
                      <Badge variant="success">Upcoming</Badge>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
