'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useGetNotificationsQuery, useMarkAsReadMutation } from '@/store/slices/api/notificationApi';
import { useAppSelector } from '@/store/hooks';

const viewAllRoutes: Record<string, string> = {
  admin: '/admin/notifications',
  manager: '/admin/notifications',
  coach: '/coach/notifications',
  staff: '/learner/notifications',
};

interface NotificationBellProps {
  iconClassName?: string;
}

export default function NotificationBell({ iconClassName = 'text-white' }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useGetNotificationsQuery(
    { limit: 5, read: false },
    { pollingInterval: 30000 }
  );
  const [markAsRead] = useMarkAsReadMutation();
  const userRole = useAppSelector((s) => s.auth.user?.role);
  const viewAllHref = viewAllRoutes[userRole ?? 'admin'] ?? '/admin/notifications';

  const notifications = data?.data ?? [];
  const unreadCount = data?.pagination?.total ?? 0;

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
