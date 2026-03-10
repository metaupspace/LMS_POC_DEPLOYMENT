'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  BookOpen,
  CalendarDays,
  FileCheck,
  Award,
  Flame,
  Bell,
  BellOff,
  ClipboardCheck,
} from 'lucide-react';
import { Button, LoadingSpinner } from '@/components/ui';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  type NotificationData,
} from '@/store/slices/api/notificationApi';
import type { NotificationType } from '@/types';

// ─── Constants ───────────────────────────────────────────

const LIMIT = 20;

const typeIcons: Record<NotificationType, React.ElementType> = {
  assignment: BookOpen,
  session_reminder: CalendarDays,
  proof_update: FileCheck,
  proof_submitted: FileCheck,
  proof_approved: FileCheck,
  proof_rejected: FileCheck,
  badge_earned: Award,
  streak: Flame,
  general: Bell,
  test_assigned: ClipboardCheck,
  certification_earned: Award,
};

const typeColors: Record<NotificationType, string> = {
  assignment: 'bg-blue-50 text-blue-600',
  session_reminder: 'bg-amber-50 text-amber-600',
  proof_update: 'bg-emerald-50 text-emerald-600',
  proof_submitted: 'bg-emerald-50 text-emerald-600',
  proof_approved: 'bg-green-50 text-green-600',
  proof_rejected: 'bg-red-50 text-red-600',
  badge_earned: 'bg-purple-50 text-purple-600',
  streak: 'bg-orange-50 text-orange-600',
  general: 'bg-surface-background text-text-secondary',
  test_assigned: 'bg-indigo-50 text-indigo-600',
  certification_earned: 'bg-yellow-50 text-yellow-600',
};

// ─── Time Ago Helper ─────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'Just now';

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(dateStr));
}

// ─── Skeleton Item ───────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="flex items-start gap-md px-md py-md animate-pulse">
      <div className="h-10 w-10 flex-shrink-0 rounded-full bg-border-light" />
      <div className="flex-1 space-y-sm">
        <div className="h-4 w-3/4 rounded-sm bg-border-light" />
        <div className="h-3 w-full rounded-sm bg-border-light" />
        <div className="h-3 w-16 rounded-sm bg-border-light" />
      </div>
    </div>
  );
}

// ─── Notification Item ───────────────────────────────────

interface NotificationItemProps {
  notification: NotificationData;
  onMarkAsRead: (_id: string) => void;
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const Icon = typeIcons[notification.type] ?? Bell;
  const colorClass = typeColors[notification.type] ?? typeColors.general;

  const handleClick = useCallback(() => {
    if (!notification.read) {
      onMarkAsRead(notification._id);
    }
  }, [notification._id, notification.read, onMarkAsRead]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        flex w-full items-start gap-md px-md min-h-[56px] py-md text-left
        transition-colors active:bg-surface-background
        ${notification.read ? 'bg-transparent' : 'bg-primary-light/30'}
      `}
    >
      {/* Unread Indicator + Icon */}
      <div className="relative flex-shrink-0">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full ${colorClass}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
        </div>
        {!notification.read && (
          <span className="absolute -left-[2px] top-0 h-[8px] w-[8px] rounded-full bg-primary-main" />
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-body-md font-medium text-text-primary leading-snug">
          {notification.title}
        </p>
        <p className="mt-[2px] text-caption text-text-secondary line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <p className="mt-xs text-caption text-text-disabled">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

// ─── Main Page Component ─────────────────────────────────

export default function CoachNotifications() {
  const [page, setPage] = useState(1);

  const { data: response, isLoading, isFetching } = useGetNotificationsQuery({
    page,
    limit: LIMIT,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [markAsRead] = useMarkAsReadMutation();

  // Accumulate notifications across pages for "load more" pattern
  const [previousNotifications, setPreviousNotifications] = useState<NotificationData[]>([]);

  // Merge already-loaded notifications with current page data
  const allNotifications = useMemo(() => {
    if (!response?.data) return previousNotifications;
    // If page is 1, it's the initial load — use just the response
    if (page === 1) return response.data;
    // For subsequent pages, merge with previous
    const existingIds = new Set(previousNotifications.map((n) => n._id));
    const newItems = response.data.filter((n) => !existingIds.has(n._id));
    return [...previousNotifications, ...newItems];
  }, [response?.data, page, previousNotifications]);

  const pagination = response?.pagination;
  const hasMorePages = pagination ? page < pagination.totalPages : false;

  const handleLoadMore = useCallback(() => {
    // Save current notifications before fetching next page
    setPreviousNotifications(allNotifications);
    setPage((prev) => prev + 1);
  }, [allNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: string) => {
      try {
        await markAsRead(id).unwrap();
      } catch {
        // Silently fail — the notification will remain unread
      }
    },
    [markAsRead]
  );

  // ── Initial loading state ──
  if (isLoading && page === 1) {
    return (
      <div className="space-y-0">
        <h2 className="text-h2 text-text-primary mb-md">Notifications</h2>
        <div className="rounded-md bg-surface-white shadow-sm overflow-hidden divide-y divide-border-light">
          {[...Array(6)].map((_, i) => (
            <NotificationSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (!isLoading && allNotifications.length === 0) {
    return (
      <div className="space-y-0">
        <h2 className="text-h2 text-text-primary mb-md">Notifications</h2>
        <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
          <BellOff className="h-12 w-12 text-text-disabled" />
          <p className="mt-md text-body-lg font-medium text-text-secondary">
            No notifications yet
          </p>
          <p className="mt-xs text-body-md text-text-disabled">
            You&apos;ll be notified about sessions, assignments, and updates
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <h2 className="text-h2 text-text-primary mb-md">Notifications</h2>

      {/* Notification List */}
      <div className="rounded-md bg-surface-white shadow-sm overflow-hidden">
        <div className="divide-y divide-border-light">
          {allNotifications.map((notification) => (
            <NotificationItem
              key={notification._id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
            />
          ))}
        </div>

        {/* Load More */}
        {hasMorePages && (
          <div className="border-t border-border-light px-md py-md">
            <Button
              variant="ghost"
              size="md"
              isBlock
              isLoading={isFetching}
              onClick={handleLoadMore}
              className="min-h-[44px]"
            >
              Load More
            </Button>
          </div>
        )}

        {/* Inline fetching indicator for subsequent pages */}
        {isFetching && page > 1 && (
          <div className="py-md">
            <LoadingSpinner variant="inline" text="Loading..." />
          </div>
        )}
      </div>
    </div>
  );
}
