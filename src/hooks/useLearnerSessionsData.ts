import { useMemo, useState } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  useGetSessionsQuery,
  type SessionData,
} from '@/store/slices/api/sessionApi';
import { getDisplayStatus, useAutoRefreshTick } from '@/hooks/useSessionStatus';

// ─── Helpers ───────────────────────────────────────────────

function isSameDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getStaffId(staff: string | { _id: string }): string {
  return typeof staff === 'string' ? staff : staff._id;
}

// ─── Filter Types ──────────────────────────────────────────

export type AttendanceFilter = 'all' | 'attended' | 'not_attended';

export interface FilterTab {
  key: AttendanceFilter;
  label: string;
  count: number;
}

// ─── Hook ──────────────────────────────────────────────────

export function useLearnerSessionsData() {
  const user = useAppSelector((s) => s.auth.user);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');

  // Auto-refresh every 60s so status transitions happen live
  const tick = useAutoRefreshTick();

  const { data: sessionsResponse, isLoading } = useGetSessionsQuery(
    { limit: 50, sortBy: 'date', sortOrder: 'asc' },
    { skip: !user?.id }
  );

  const sessions = useMemo(() => sessionsResponse?.data ?? [], [sessionsResponse]);

  // Filter sessions where user is enrolled
  const userSessions = useMemo(() => {
    return sessions.filter(
      (s) =>
        user?.id &&
        s.enrolledStaff.some((staff) => getStaffId(staff) === user.id)
    );
  }, [sessions, user?.id]);

  // Categorize by display status
  const ongoingSessions = useMemo(() => {
    return userSessions.filter((s) => getDisplayStatus(s) === 'ongoing');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSessions, tick]);

  const upcomingSessions = useMemo(() => {
    return userSessions.filter((s) => getDisplayStatus(s) === 'upcoming');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSessions, tick]);

  const completedSessions = useMemo(() => {
    return userSessions
      .filter((s) => getDisplayStatus(s) === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSessions, tick]);

  // Apply attendance filter to completed sessions
  const filteredCompletedSessions = useMemo(() => {
    if (attendanceFilter === 'all') return completedSessions;

    return completedSessions.filter((s) => {
      const attended = s.attendance.some(
        (a) => getStaffId(a.staff) === user?.id && a.status === 'present'
      );
      return attendanceFilter === 'attended' ? attended : !attended;
    });
  }, [completedSessions, attendanceFilter, user?.id]);

  const attendedCount = useMemo(() => {
    return completedSessions.filter((s) =>
      s.attendance.some(
        (a) => getStaffId(a.staff) === user?.id && a.status === 'present'
      )
    ).length;
  }, [completedSessions, user?.id]);

  const filterTabs: FilterTab[] = [
    { key: 'all', label: 'All', count: completedSessions.length },
    { key: 'attended', label: 'Attended', count: attendedCount },
    { key: 'not_attended', label: 'Not Attended', count: completedSessions.length - attendedCount },
  ];

  return {
    user,
    isLoading,
    ongoingSessions,
    upcomingSessions,
    completedSessions,
    filteredCompletedSessions,
    attendanceFilter,
    setAttendanceFilter,
    filterTabs,
    isSameDay,
  };
}
