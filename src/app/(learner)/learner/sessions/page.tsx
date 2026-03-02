'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import {
  CalendarDays,
  CalendarX,
  Clock,
  MapPin,
  CheckCircle2,
  Play,
  Video,
  ExternalLink,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useGetSessionsQuery,
  useMarkAttendanceMutation,
  type SessionData,
} from '@/store/slices/api/sessionApi';

// ─── Helpers ──────────────────────────────────────────────

function isSameDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getStaffId(staff: string | { _id: string }): string {
  return typeof staff === 'string' ? staff : staff._id;
}

/** Derive display status based on current time vs session date+timeSlot+duration. */
function getDisplayStatus(session: SessionData): 'upcoming' | 'ongoing' | 'completed' | 'cancelled' {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'completed') return 'completed';

  const sessionDate = new Date(session.date);
  const [hours, minutes] = (session.timeSlot ?? '').split(':').map(Number);
  if (!isNaN(hours) && !isNaN(minutes)) {
    sessionDate.setHours(hours, minutes, 0, 0);
  }

  const now = Date.now();
  const startTime = sessionDate.getTime();
  const endTime = startTime + (session.duration ?? 0) * 60 * 1000;

  if (now >= endTime) return 'completed';
  if (now >= startTime) return 'ongoing';
  return 'upcoming';
}

type StatusBadgeVariant = 'warning' | 'info' | 'success' | 'error' | 'default';

const statusVariantMap: Record<string, StatusBadgeVariant> = {
  upcoming: 'warning',
  ongoing: 'info',
  completed: 'success',
  cancelled: 'error',
};

// ─── Filter Types ─────────────────────────────────────────

type AttendanceFilter = 'all' | 'attended' | 'not_attended';

// ─── Skeleton Components ──────────────────────────────────

function SessionCardSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[140px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-4 w-1/2 rounded-sm bg-border-light" />
        <div className="h-12 w-full rounded-sm bg-border-light" />
      </div>
    </div>
  );
}

function CompactCardSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse p-lg">
      <div className="flex items-start justify-between gap-md">
        <div className="flex-1 space-y-sm">
          <div className="h-5 w-3/4 rounded-sm bg-border-light" />
          <div className="h-4 w-full rounded-sm bg-border-light" />
          <div className="h-3 w-1/2 rounded-sm bg-border-light" />
        </div>
        <div className="h-6 w-16 rounded-full bg-border-light" />
      </div>
    </div>
  );
}

// ─── Active Session Card (Ongoing + Upcoming) ─────────────

interface ActiveSessionCardProps {
  session: SessionData;
  userId: string;
  displayStatus: 'upcoming' | 'ongoing';
}

function ActiveSessionCard({ session, userId, displayStatus }: ActiveSessionCardProps) {
  const dispatch = useAppDispatch();
  const [attendanceCode, setAttendanceCode] = useState('');
  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  const userAttendance = useMemo(
    () =>
      session.attendance.find(
        (a) => getStaffId(a.staff) === userId
      ),
    [session.attendance, userId]
  );
  const isPresent = userAttendance?.status === 'present';
  const isOngoing = displayStatus === 'ongoing';
  const isToday = isSameDay(session.date, new Date());
  const canMarkAttendance = (isOngoing || isToday) && !isPresent;

  const handleMarkAttendance = useCallback(async () => {
    if (attendanceCode.length !== 6) {
      dispatch(
        addToast({ type: 'warning', message: 'Please enter a valid 6-digit code', duration: 3000 })
      );
      return;
    }

    try {
      await markAttendance({
        id: session._id,
        body: { attendanceCode },
      }).unwrap();

      dispatch(
        addToast({ type: 'success', message: 'Attendance marked successfully! +30 points', duration: 3000 })
      );
      setAttendanceCode('');
    } catch {
      dispatch(
        addToast({ type: 'error', message: 'Invalid attendance code. Please try again.', duration: 4000 })
      );
    }
  }, [attendanceCode, markAttendance, session._id, dispatch]);

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-[140px] w-full bg-surface-background">
        {session.thumbnail ? (
          <Image
            src={session.thumbnail}
            alt={session.title}
            fill
            unoptimized
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-light">
            <CalendarDays className="h-10 w-10 text-primary-main opacity-50" />
          </div>
        )}
        <div className="absolute top-sm right-sm">
          <Badge variant={statusVariantMap[displayStatus]}>
            {isOngoing ? 'Ongoing' : isToday ? 'Today' : 'Upcoming'}
          </Badge>
        </div>
      </div>

      <div className="p-lg">
        {/* Title */}
        <h3 className="text-h3 font-semibold text-text-primary line-clamp-2">
          {session.title}
        </h3>

        {/* Date + Time */}
        <div className="mt-sm flex items-center gap-xs text-body-md text-text-secondary">
          <CalendarDays className="h-4 w-4 flex-shrink-0" />
          <span>{formatDate(session.date)} &mdash; {session.timeSlot}</span>
        </div>

        {/* Location / Online */}
        <div className="mt-xs flex items-center gap-xs text-body-md text-text-secondary">
          {session.mode === 'online' ? (
            <>
              <Video className="h-4 w-4 flex-shrink-0" />
              <Badge variant="info">Online</Badge>
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{session.location}</span>
            </>
          )}
        </div>

        {/* Duration */}
        <div className="mt-xs flex items-center gap-xs text-body-md text-text-secondary">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{session.duration} min</span>
        </div>

        {/* Coach */}
        <div className="mt-xs text-body-md text-text-secondary">
          Coach:{' '}
          {typeof session.instructor === 'object' && session.instructor !== null
            ? session.instructor.name
            : (session.instructor ?? 'TBD')}
        </div>

        {/* Join Now button for online sessions */}
        {session.mode === 'online' && session.meetingLink && (isOngoing || isToday) && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-md flex items-center justify-center gap-sm rounded-sm bg-blue-600 px-md py-[10px] text-body-md font-semibold text-white transition-colors hover:bg-blue-700 min-h-[48px]"
          >
            <ExternalLink className="h-4 w-4" />
            Join Now
          </a>
        )}

        {/* Attendance section */}
        <div className="mt-md">
          {isPresent ? (
            <div className="flex items-center gap-sm rounded-md bg-success/10 px-md py-md">
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              <Badge variant="success">Present</Badge>
            </div>
          ) : canMarkAttendance ? (
            <div className="space-y-sm">
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 6-digit code"
                value={attendanceCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setAttendanceCode(val);
                }}
                className="
                  w-full rounded-sm border border-border-light bg-surface-white
                  px-md py-[10px] text-body-md text-text-primary text-center
                  tracking-[4px] font-semibold
                  placeholder:text-text-secondary placeholder:tracking-normal placeholder:font-normal
                  focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/20
                  transition-colors duration-200
                "
              />
              <Button
                variant="primary"
                size="lg"
                isBlock
                isLoading={isMarking}
                onClick={handleMarkAttendance}
                disabled={attendanceCode.length !== 6}
                className="min-h-[48px]"
              >
                Mark Attendance
              </Button>
            </div>
          ) : (
            <Badge variant="info">Upcoming</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Completed Session Card ───────────────────────────────

interface CompletedSessionCardProps {
  session: SessionData;
  userId: string;
}

function CompletedSessionCard({ session, userId }: CompletedSessionCardProps) {
  const userAttendance = useMemo(
    () =>
      session.attendance.find(
        (a) => getStaffId(a.staff) === userId
      ),
    [session.attendance, userId]
  );
  const isPresent = userAttendance?.status === 'present';

  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-md">
        <div className="flex-1 min-w-0">
          <h3 className="text-body-lg font-semibold text-text-primary line-clamp-2">
            {session.title}
          </h3>
          <p className="mt-xs text-body-md text-text-secondary">
            {formatDate(session.date)} &mdash; {session.timeSlot}
          </p>
          <p className="mt-xs text-caption text-text-secondary flex items-center gap-xs">
            <MapPin className="h-3.5 w-3.5" />
            {session.location}
          </p>
        </div>
        <div className="flex-shrink-0">
          {isPresent ? (
            <Badge variant="success">Present</Badge>
          ) : (
            <Badge variant="error">Absent</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Main Page Component ──────────────────────────────────

export default function LearnerSessions() {
  const user = useAppSelector((s) => s.auth.user);
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');

  // Auto-refresh every 60s so status transitions happen live
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

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
  }, [userSessions, tick]);

  const upcomingSessions = useMemo(() => {
    return userSessions.filter((s) => getDisplayStatus(s) === 'upcoming');
  }, [userSessions, tick]);

  const completedSessions = useMemo(() => {
    return userSessions
      .filter((s) => getDisplayStatus(s) === 'completed')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  const FILTER_TABS: { key: AttendanceFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: completedSessions.length },
    { key: 'attended', label: 'Attended', count: attendedCount },
    { key: 'not_attended', label: 'Not Attended', count: completedSessions.length - attendedCount },
  ];

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-lg pb-lg">
        <h1 className="text-h2 font-semibold text-text-primary">Sessions</h1>
        <div className="space-y-md">
          <SessionCardSkeleton />
          <SessionCardSkeleton />
        </div>
        <div className="space-y-md">
          <CompactCardSkeleton />
          <CompactCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-xl pb-lg">
      <h1 className="text-h2 font-semibold text-text-primary">Sessions</h1>

      {/* ── Ongoing Sessions ── */}
      {ongoingSessions.length > 0 && (
        <section>
          <div className="flex items-center gap-sm">
            <Play className="h-5 w-5 text-blue-600" />
            <h2 className="text-h3 font-semibold text-text-primary">Ongoing</h2>
          </div>

          <div className="mt-md space-y-md">
            {ongoingSessions.map((session) => (
              <ActiveSessionCard
                key={session._id}
                session={session}
                userId={user?.id ?? ''}
                displayStatus="ongoing"
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Upcoming Sessions ── */}
      <section>
        <h2 className="text-h3 font-semibold text-text-primary">Upcoming Sessions</h2>

        {upcomingSessions.length > 0 ? (
          <div className="mt-md space-y-md">
            {upcomingSessions.map((session) => (
              <ActiveSessionCard
                key={session._id}
                session={session}
                userId={user?.id ?? ''}
                displayStatus="upcoming"
              />
            ))}
          </div>
        ) : ongoingSessions.length === 0 ? (
          <div className="mt-md flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
            <CalendarX className="h-12 w-12 text-text-disabled" />
            <p className="mt-md text-body-lg font-medium text-text-secondary">
              No upcoming sessions
            </p>
            <p className="mt-xs text-body-md text-text-disabled">
              Your scheduled sessions will appear here
            </p>
          </div>
        ) : null}
      </section>

      {/* ── Completed / Past Sessions ── */}
      <section>
        <h2 className="text-h3 font-semibold text-text-primary">Completed Sessions</h2>

        {/* Attendance filter tabs */}
        {completedSessions.length > 0 && (
          <div className="mt-md flex overflow-x-auto border-b border-border-light -mx-md px-md scrollbar-none">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setAttendanceFilter(tab.key)}
                className={`
                  flex items-center gap-xs px-md pb-sm pt-xs flex-shrink-0
                  text-body-md font-medium transition-colors duration-200 whitespace-nowrap
                  ${
                    attendanceFilter === tab.key
                      ? 'border-b-2 border-primary-main text-primary-main'
                      : 'text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                {tab.label}
                <span
                  className={`
                    inline-flex items-center justify-center h-5 min-w-[20px] rounded-full px-[6px]
                    text-caption font-semibold
                    ${
                      attendanceFilter === tab.key
                        ? 'bg-primary-main text-white'
                        : 'bg-surface-background text-text-secondary'
                    }
                  `}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        )}

        {filteredCompletedSessions.length > 0 ? (
          <div className="mt-md space-y-md">
            {filteredCompletedSessions.map((session) => (
              <CompletedSessionCard
                key={session._id}
                session={session}
                userId={user?.id ?? ''}
              />
            ))}
          </div>
        ) : completedSessions.length > 0 ? (
          <div className="mt-md flex flex-col items-center justify-center rounded-md bg-surface-white py-xl px-lg text-center shadow-sm">
            <CalendarDays className="h-10 w-10 text-text-disabled" />
            <p className="mt-sm text-body-md text-text-secondary">
              No {attendanceFilter === 'attended' ? 'attended' : 'missed'} sessions
            </p>
          </div>
        ) : (
          <div className="mt-md flex flex-col items-center justify-center rounded-md bg-surface-white py-xl px-lg text-center shadow-sm">
            <CalendarDays className="h-10 w-10 text-text-disabled" />
            <p className="mt-sm text-body-md text-text-secondary">
              No completed sessions yet
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
