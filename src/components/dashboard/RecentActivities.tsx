'use client';

import { useState, useEffect, useCallback } from 'react';
import { Activity, Clock, ChevronDown, Loader2 } from 'lucide-react';
import { Card, LoadingSpinner } from '@/components/ui';

const ITEMS_PER_PAGE = 5;

function timeAgo(date: string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const TYPE_COLORS: Record<string, string> = {
  module_completed: 'border-blue-400',
  test_passed: 'border-green-400',
  test_failed: 'border-red-400',
  certification_earned: 'border-yellow-400',
  proof_submitted: 'border-purple-400',
  proof_approved: 'border-green-400',
  proof_redo_requested: 'border-orange-400',
  attendance_marked: 'border-cyan-400',
  user_created: 'border-indigo-400',
};

export default function RecentActivities() {
  
  const [activities, setActivities] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchActivities = useCallback(async (pageNum: number, append: boolean) => {
    try {
      if (append) setIsLoadingMore(true);
      else setIsLoading(true);

      const res = await fetch(`/api/admin/recent-activities?page=${pageNum}&limit=${ITEMS_PER_PAGE}`);
      const json = await res.json();
      const data = json.data || json;

      const newActivities = data.activities || [];
      const pagination = data.pagination || {};

      if (append) {
        setActivities(prev => [...prev, ...newActivities]);
      } else {
        setActivities(newActivities);
      }

      setHasMore(pagination.hasMore ?? false);
      setTotal(pagination.total ?? 0);
      setPage(pageNum);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Activities] Fetch error:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchActivities(1, false);
  }, [fetchActivities]);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore) {
      fetchActivities(page + 1, true);
    }
  };

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-sm">
        <Activity className="h-5 w-5 text-primary-main" />
        <h2 className="text-h3 text-text-primary">Recent Activity</h2>
      </div>
      {total > 0 && (
        <span className="text-caption text-text-secondary">{total} events</span>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <Card header={header}>
        <div className="flex items-center justify-center py-xl">
          <LoadingSpinner variant="inline" text="Loading activities..." />
        </div>
      </Card>
    );
  }

  return (
    <Card header={header}>
      {activities.length === 0 ? (
        <div className="py-xl text-center">
          <Activity size={36} className="mx-auto mb-sm text-text-disabled" />
          <p className="text-body-md text-text-secondary">No recent activity</p>
        </div>
      ) : (
        <>
          <div className="space-y-0">
            {activities.map((activity: any, idx: number) => (
              <div
                key={`${activity.type}-${idx}-${activity.timestamp}`}
                className={`flex items-start gap-md border-l-2 py-md pl-md ${
                  TYPE_COLORS[activity.type] || 'border-gray-200'
                } ${idx !== activities.length - 1 ? 'border-b border-b-border-light' : ''}`}
              >
                <span className="mt-0.5 flex-shrink-0 text-lg">{activity.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-body-md text-text-primary">
                    <span className="font-medium">
                      {activity.user?.name || 'Unknown'}
                    </span>
                    {activity.user?.empId && (
                      <span className="ml-1 text-caption text-text-secondary">
                        ({activity.user.empId})
                      </span>
                    )}{' '}
                    <span className="text-text-secondary">{activity.message}</span>
                  </p>
                  <div className="mt-xs flex items-center gap-xs">
                    <Clock className="h-3 w-3 text-text-secondary" />
                    <span className="text-caption text-text-secondary">
                      {timeAgo(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="mt-md flex w-full items-center justify-center gap-sm rounded-md border border-border-light py-sm text-body-md text-primary-main transition-colors hover:bg-primary-light/10 disabled:opacity-50"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  Load More ({total - activities.length} remaining)
                </>
              )}
            </button>
          )}

          {/* All loaded */}
          {!hasMore && activities.length > ITEMS_PER_PAGE && (
            <p className="mt-md text-center text-caption text-text-secondary">
              All activities loaded
            </p>
          )}
        </>
      )}
    </Card>
  );
}
