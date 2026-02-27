'use client';

import { useState } from 'react';
import { ArrowLeft, Bell, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
} from '@/store/slices/api/notificationApi';
import { Button, Card, Badge, LoadingSpinner, Pagination } from '@/components/ui';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetNotificationsQuery({
    page,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [markAsRead] = useMarkAsReadMutation();

  const notifications = data?.data ?? [];
  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading notifications..." />
      </div>
    );
  }

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
        <h1 className="text-h1 text-text-primary">Notifications</h1>
      </div>

      {/* Notification List */}
      {notifications.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center justify-center py-xl">
            <Bell className="mb-md h-12 w-12 text-text-disabled" />
            <p className="text-body-lg font-medium text-text-primary">No notifications</p>
            <p className="mt-xs text-body-md text-text-secondary">
              You&apos;re all caught up!
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-sm">
          {notifications.map((n) => (
            <Card
              key={n._id}
              className={`transition-colors ${!n.read ? 'border-l-4 border-l-primary-main' : ''}`}
            >
              <div className="flex items-start justify-between gap-md">
                <div className="flex-1">
                  <div className="flex items-center gap-sm">
                    <h3 className="text-body-md font-medium text-text-primary">{n.title}</h3>
                    {!n.read && <Badge variant="info">New</Badge>}
                  </div>
                  <p className="mt-xs text-body-md text-text-secondary">{n.message}</p>
                  <p className="mt-xs text-caption text-text-disabled">{formatDate(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Check className="h-4 w-4" />}
                    onClick={() => markAsRead(n._id)}
                  >
                    Mark Read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
