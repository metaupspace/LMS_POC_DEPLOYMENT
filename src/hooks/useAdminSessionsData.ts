import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import type { CalendarEvent } from '@/components/ui';
import { getDisplayStatus, useAutoRefreshTick } from '@/hooks/useSessionStatus';
import {
  useGetSessionsQuery,
  type SessionData,
} from '@/store/slices/api/sessionApi';

// ─── Constants ──────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Ongoing', value: 'ongoing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const LIMIT = 9;

type ViewMode = 'card' | 'calendar';

// ─── Hook ───────────────────────────────────────────────────

export function useAdminSessionsData() {
  const router = useRouter();

  // ── View & Filters ──────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Auto-refresh every 60s so status transitions happen live
  const tick = useAutoRefreshTick();

  // ── Calendar day selection ──────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Query ───────────────────────────────────────────────
  // Fetch all sessions (no server-side status filter) so we can filter by computed display status
  const { data, isLoading, isFetching } = useGetSessionsQuery({
    limit: 200,
    search: search || undefined,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  const allFetchedSessions = useMemo(() => data?.data ?? [], [data]);

  // Filter by computed display status on the frontend
  const statusFilteredSessions = useMemo(() => {
    if (!status) return allFetchedSessions;
    return allFetchedSessions.filter((s) => getDisplayStatus(s) === status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFetchedSessions, status, tick]);

  // Client-side pagination
  const totalFiltered = statusFilteredSessions.length;
  const totalPages = Math.ceil(totalFiltered / LIMIT);
  const sessions = statusFilteredSessions.slice((page - 1) * LIMIT, page * LIMIT);
  const pagination = totalFiltered > 0
    ? { total: totalFiltered, totalPages, page, limit: LIMIT }
    : undefined;

  const allSessions = allFetchedSessions;

  // ── Calendar events ─────────────────────────────────────
  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      allSessions.map((s) => {
        const ds = getDisplayStatus(s);
        return {
          date: s.date.split('T')[0] ?? s.date,
          title: s.title,
          status: (ds === 'ongoing' ? 'upcoming' : ds) as CalendarEvent['status'],
        };
      }),
    [allSessions]
  );

  // ── Sessions for selected day ───────────────────────────
  const selectedDaySessions = useMemo(() => {
    if (!selectedDate) return [];
    return allSessions.filter((s) => s.date.split('T')[0] === selectedDate);
  }, [selectedDate, allSessions]);

  // ── Handlers ────────────────────────────────────────────

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleCardClick = useCallback(
    (sessionId: string) => {
      router.push(`/admin/sessions/${sessionId}`);
    },
    [router]
  );

  const handleDayClick = useCallback((_date: Date, dayEvents: CalendarEvent[]) => {
    if (dayEvents.length > 0) {
      const dateKey = `${_date.getFullYear()}-${String(_date.getMonth() + 1).padStart(2, '0')}-${String(_date.getDate()).padStart(2, '0')}`;
      setSelectedDate(dateKey);
    } else {
      setSelectedDate(null);
    }
  }, []);

  const navigateToCreate = useCallback(() => {
    router.push('/admin/sessions/create');
  }, [router]);

  return {
    // State
    viewMode,
    setViewMode,
    page,
    setPage,
    search,
    status,
    selectedDate,

    // Query results
    isLoading,
    isFetching,
    sessions,
    pagination,
    calendarEvents,
    selectedDaySessions,

    // Handlers
    handleSearchChange,
    handleStatusChange,
    handleCardClick,
    handleDayClick,
    navigateToCreate,

    // Constants
    STATUS_OPTIONS,
    LIMIT,
  };
}
