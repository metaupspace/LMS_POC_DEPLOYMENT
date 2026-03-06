'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useGetNotificationsQuery, useMarkAsReadMutation } from '@/store/slices/api/notificationApi';
import { useAppSelector } from '@/store/hooks';
import { useNotificationStream } from '@/hooks/useNotificationStream';

const viewAllRoutes: Record<string, string> = {
  admin: '/admin/notifications',
  manager: '/admin/notifications',
  coach: '/coach/notifications',
  staff: '/learner/notifications',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationBellProps {
  iconClassName?: string;
}

export default function NotificationBell({ iconClassName = 'text-white' }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const permissionRef = useRef(false);

  const user = useAppSelector((s) => s.auth.user);
  const userId = user?.id;

  const { data, refetch } = useGetNotificationsQuery(
    { limit: 5, read: false },
    {
      skip: !userId,
      pollingInterval: 30000,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    }
  );
  const [markAsRead] = useMarkAsReadMutation();
  const userRole = user?.role;
  const viewAllHref = viewAllRoutes[userRole ?? 'admin'] ?? '/admin/notifications';

  const notifications = data?.data ?? [];
  const unreadCount = data?.pagination?.total ?? 0;

  // Request browser notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        permissionRef.current = true;
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then((perm) => {
          permissionRef.current = perm === 'granted';
        });
      }
    }
  }, []);

  // Real-time: when SSE pushes a new notification, refetch + show browser notification
  const handleNewNotification = useCallback(
    (notification: Record<string, unknown>) => {
      refetch();

      // Show browser push notification
      if (permissionRef.current && typeof window !== 'undefined' && 'Notification' in window) {
        try {
          new Notification(
            (notification.title as string) ?? 'New Notification',
            {
              body: (notification.message as string) ?? '',
              icon: '/icons/icon-192x192.png',
              tag: 'lms-notification',
            }
          );
        } catch {
          // Browser doesn't support Notification constructor (e.g., mobile)
        }
      }
    },
    [refetch]
  );

  useNotificationStream(handleNewNotification);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleNotificationClick = async (id: string) => {
    await markAsRead(id);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative rounded-sm p-xs transition-colors hover:opacity-70 ${iconClassName}`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -right-[2px] -top-[2px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-[4px] text-[10px] font-semibold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-sm w-[320px] rounded-md border border-border-light bg-surface-white shadow-md animate-[scaleIn_150ms_ease-out]">
          <div className="border-b border-border-light px-md py-sm">
            <h4 className="text-body-md font-semibold text-text-primary">Notifications</h4>
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-md py-lg text-center text-body-md text-text-secondary">
                No new notifications
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n._id}
                  type="button"
                  onClick={() => handleNotificationClick(n._id)}
                  className="flex w-full flex-col gap-[2px] border-b border-border-light px-md py-sm text-left transition-colors last:border-b-0 hover:bg-surface-background"
                >
                  <span className="text-body-md font-medium text-text-primary">{n.title}</span>
                  <span className="line-clamp-2 text-caption text-text-secondary">{n.message}</span>
                  <span className="text-[11px] text-text-disabled">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-border-light px-md py-sm text-center">
            <Link
              href={viewAllHref}
              onClick={() => setOpen(false)}
              className="text-body-md font-medium text-primary-main transition-colors hover:text-primary-hover"
            >
              View All
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
