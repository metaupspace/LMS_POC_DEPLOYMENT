import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  useGetSessionsQuery,
  type SessionData,
} from '@/store/slices/api/sessionApi';
import { getDisplayStatus, useAutoRefreshTick } from '@/hooks/useSessionStatus';

// ─── Helpers ───────────────────────────────────────────────

export function isSameDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

export function isFutureDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  const refStart = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return dStart.getTime() > refStart.getTime();
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getInstructorId(instructor: SessionData['instructor']): string | null {
  if (!instructor) return null;
  if (typeof instructor === 'string') return instructor;
  return instructor._id;
}

// ─── Hook ──────────────────────────────────────────────────

export function useCoachHomeData() {
  const user = useAppSelector((s) => s.auth.user);

  const { data: sessionsResponse, isLoading } = useGetSessionsQuery(
    {
      instructor: user?.id,
      sortBy: 'date',
      sortOrder: 'asc',
      limit: 50,
    },
    { skip: !user?.id }
  );

  const today = useMemo(() => new Date(), []);

  // Auto-refresh every 60s so status transitions happen live
  const tick = useAutoRefreshTick();

  const sessions = useMemo(() => sessionsResponse?.data ?? [], [sessionsResponse]);

  // Today's sessions: only upcoming or ongoing (not completed/cancelled)
  const todaySessions = useMemo(
    () =>
      sessions.filter((s) => {
        if (!isSameDay(s.date, today)) return false;
        if (getInstructorId(s.instructor) !== user?.id) return false;
        const ds = getDisplayStatus(s);
        return ds === 'upcoming' || ds === 'ongoing';
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, today, user?.id, tick]
  );

  // Future sessions that haven't started
  const upcomingSessions = useMemo(
    () =>
      sessions.filter(
        (s) => isFutureDay(s.date, today) && getInstructorId(s.instructor) === user?.id
      ),
    [sessions, today, user?.id]
  );

  // All completed sessions (any date, including today)
  const completedSessions = useMemo(
    () =>
      sessions
        .filter(
          (s) =>
            getInstructorId(s.instructor) === user?.id &&
            getDisplayStatus(s) === 'completed'
        )
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessions, user?.id, tick]
  );

  const upcomingPreview = upcomingSessions.slice(0, 5);
  const hasMoreUpcoming = upcomingSessions.length > 5;
  const completedPreview = completedSessions.slice(0, 5);
  const hasMoreCompleted = completedSessions.length > 5;

  return {
    user,
    isLoading,
    todaySessions,
    upcomingSessions,
    upcomingPreview,
    hasMoreUpcoming,
    completedSessions,
    completedPreview,
    hasMoreCompleted,
  };
}
