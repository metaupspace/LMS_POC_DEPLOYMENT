'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Plus, CalendarDays, LayoutGrid, MapPin, Clock } from 'lucide-react';

import {
  Button,
  Card,
  SearchBar,
  Dropdown,
  Pagination,
  Badge,
  Calendar,
  LoadingSpinner,
} from '@/components/ui';
import type { CalendarEvent } from '@/components/ui';
import {
  useGetSessionsQuery,
  type SessionData,
} from '@/store/slices/api/sessionApi';
import type { SessionStatus } from '@/types';
import { useTranslation } from '@/i18n';

// ─── Constants ──────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

const LIMIT = 9;

type ViewMode = 'card' | 'calendar';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'default';

const statusVariantMap: Record<string, BadgeVariant> = {
  upcoming: 'warning',
  completed: 'success',
  cancelled: 'error',
};

// ─── Helpers ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Component ──────────────────────────────────────────────

export default function SessionsListPage() {
  const router = useRouter();
  const { t } = useTranslation();

  // ── View & Filters ──────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // ── Calendar day selection ──────────────────────────────
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Query ───────────────────────────────────────────────
  const { data, isLoading, isFetching } = useGetSessionsQuery({
    page,
    limit: LIMIT,
    search: search || undefined,
    status: (status || undefined) as SessionStatus | undefined,
    sortBy: 'date',
    sortOrder: 'desc',
  });

  // For calendar, fetch all sessions (larger limit, no pagination)
  const { data: allSessionsData } = useGetSessionsQuery(
    { limit: 200, sortBy: 'date', sortOrder: 'desc' },
    { skip: viewMode !== 'calendar' }
  );

  const sessions = data?.data ?? [];
  const pagination = data?.pagination;

  const allSessions = useMemo(() => allSessionsData?.data ?? [], [allSessionsData]);

  // ── Calendar events ─────────────────────────────────────
  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      allSessions.map((s) => ({
        date: s.date.split('T')[0] ?? s.date,
        title: s.title,
        status: s.status as CalendarEvent['status'],
      })),
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

  // ── Loading State ───────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading sessions..." />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-lg">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h1 text-text-primary">{t('sessions.trainingSessions')}</h1>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push('/admin/sessions/create')}
        >
          {t('sessions.scheduleSession')}
        </Button>
      </div>

      {/* ── View Toggle + Filters ───────────────────────── */}
      <div className="flex flex-col gap-md md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-sm">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`inline-flex items-center gap-xs rounded-sm px-md py-sm text-body-md font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-primary-main text-white'
                : 'border border-border-light bg-surface-white text-text-primary hover:bg-surface-background'
            }`}
          >
            <CalendarDays className="h-4 w-4" />
            Calendar
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={`inline-flex items-center gap-xs rounded-sm px-md py-sm text-body-md font-medium transition-colors ${
              viewMode === 'card'
                ? 'bg-primary-main text-white'
                : 'border border-border-light bg-surface-white text-text-primary hover:bg-surface-background'
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Card View
          </button>
        </div>

        <div className="flex flex-col gap-md sm:flex-row sm:items-end">
          <Dropdown
            items={STATUS_OPTIONS}
            value={status}
            onChange={handleStatusChange}
            placeholder="All"
            className="w-full sm:w-[180px]"
          />
          <SearchBar
            value={search}
            onChange={handleSearchChange}
            placeholder="Search sessions..."
            className="w-full sm:w-[280px]"
          />
        </div>
      </div>

      {/* ── Calendar View ───────────────────────────────── */}
      {viewMode === 'calendar' && (
        <div className="space-y-lg">
          <Calendar
            events={calendarEvents}
            onDayClick={handleDayClick}
          />

          {selectedDate && (
            <div className="space-y-md">
              <h2 className="text-h3 text-text-primary">
                Sessions on {formatDate(selectedDate)}
              </h2>
              {selectedDaySessions.length === 0 ? (
                <p className="text-body-md text-text-secondary">
                  No sessions scheduled for this day.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-md md:grid-cols-2 lg:grid-cols-3">
                  {selectedDaySessions.map((session) => (
                    <SessionCard
                      key={session._id}
                      session={session}
                      onClick={() => handleCardClick(session._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Card View ───────────────────────────────────── */}
      {viewMode === 'card' && (
        <>
          {sessions.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-md border border-border-light bg-surface-white py-2xl">
              <CalendarDays className="mb-md h-12 w-12 text-text-disabled" />
              <p className="text-body-lg font-medium text-text-primary">
                No sessions found
              </p>
              <p className="mt-xs text-body-md text-text-secondary">
                {search || status
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by scheduling your first session.'}
              </p>
              {!search && !status && (
                <Button
                  className="mt-lg"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => router.push('/admin/sessions/create')}
                >
                  Schedule Session
                </Button>
              )}
            </div>
          ) : (
            <>
              {isFetching && (
                <div className="flex justify-center py-sm">
                  <LoadingSpinner variant="inline" text="Updating..." />
                </div>
              )}
              <div className="grid grid-cols-1 gap-lg md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session) => (
                  <SessionCard
                    key={session._id}
                    session={session}
                    onClick={() => handleCardClick(session._id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Pagination ────────────────────────────────── */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={LIMIT}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}

// ─── Session Card Sub-Component ──────────────────────────────

interface SessionCardProps {
  session: SessionData;
  onClick: () => void;
}

function SessionCard({ session, onClick }: SessionCardProps) {
  const statusVariant = statusVariantMap[session.status] ?? 'default';

  return (
    <Card
      hoverable
      noPadding
      className="cursor-pointer overflow-hidden"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* Thumbnail */}
      {session.thumbnail ? (
        <Image
          src={session.thumbnail}
          alt={session.title}
          width={400}
          height={140}
          className="h-[140px] w-full rounded-t-md object-cover"
          unoptimized
        />
      ) : (
        <div className="flex h-[140px] items-center justify-center rounded-t-md bg-surface-background">
          <CalendarDays className="h-8 w-8 text-text-disabled" />
        </div>
      )}

      {/* Content */}
      <div className="p-md">
        <h3 className="text-body-lg font-medium text-text-primary line-clamp-1">
          {session.title}
        </h3>

        <div className="mt-sm flex items-center gap-xs text-caption text-text-secondary">
          <MapPin className="h-3.5 w-3.5" />
          <span>{session.location || 'No location'}</span>
          <span className="mx-xs">|</span>
          <Clock className="h-3.5 w-3.5" />
          <span>{session.timeSlot}</span>
        </div>

        <p className="mt-xs text-caption text-text-secondary">
          {formatDate(session.date)}
        </p>

        <div className="mt-md flex items-center justify-between">
          <span className="text-caption text-text-secondary">
            {session.instructor ? `Instructor assigned` : 'No instructor'}
          </span>
          <Badge variant={statusVariant}>
            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
