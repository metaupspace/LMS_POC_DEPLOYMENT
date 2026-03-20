'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  CalendarDays,
  CalendarX,
  Clock,
  Users,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  MapPin,
  RefreshCw,
  Video,
  CheckCircle2,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useGenerateAttendanceCodeMutation,
  type SessionData,
} from '@/store/slices/api/sessionApi';
import { getDisplayStatus } from '@/hooks/useSessionStatus';
import { SessionCardSkeleton } from '@/components/skeletons';
import { useCoachHomeData, formatDate } from '@/hooks/useCoachHomeData';

// ─── Helpers ──────────────────────────────────────────────

function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// ─── Attendance Code Display ──────────────────────────────

interface AttendanceCodeDisplayProps {
  code: string;
  expiresAt: string;
  sessionId: string;
  onRegenerate: () => void;
  isRegenerating: boolean;
}

function AttendanceCodeDisplay({
  code,
  expiresAt,
  sessionId,
  onRegenerate,
  isRegenerating,
}: AttendanceCodeDisplayProps) {
  const dispatch = useAppDispatch();
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    setSecondsLeft(Math.max(0, diff));
  }, [expiresAt]);

  useEffect(() => {
    if (secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      dispatch(
        addToast({
          type: 'success',
          message: 'Attendance code copied to clipboard',
          duration: 2000,
        })
      );
      setTimeout(() => setCopied(false), 2000);
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: 'Failed to copy code',
          duration: 3000,
        })
      );
    }
  }, [code, dispatch]);

  const isExpired = secondsLeft <= 0;

  return (
    <div
      className="mt-md rounded-md bg-primary-light p-lg text-center"
      data-session-id={sessionId}
    >
      {isExpired ? (
        <>
          <p className="text-body-md font-medium text-error">Code expired</p>
          <Button
            variant="primary"
            size="md"
            isBlock
            isLoading={isRegenerating}
            onClick={onRegenerate}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            className="mt-md min-h-[48px]"
          >
            Regenerate Code
          </Button>
        </>
      ) : (
        <>
          <p className="text-caption font-medium text-text-secondary uppercase tracking-wide">
            Attendance Code
          </p>
          <p className="mt-sm text-[32px] font-bold tracking-[8px] text-primary-main">
            {code}
          </p>
          <p className="mt-sm text-body-md text-text-secondary">
            Expires in{' '}
            <span className={secondsLeft <= 60 ? 'font-semibold text-error' : 'font-semibold'}>
              {formatCountdown(secondsLeft)}
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            leftIcon={
              copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )
            }
            className="mt-sm min-h-[44px]"
          >
            {copied ? 'Copied!' : 'Copy Code'}
          </Button>
        </>
      )}
    </div>
  );
}

// ─── Session Card (Today) ─────────────────────────────────

interface SessionCardProps {
  session: SessionData;
}

function SessionCard({ session }: SessionCardProps) {
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);
  const [activeCode, setActiveCode] = useState<{
    code: string;
    expiresAt: string;
  } | null>(() => {
    // Check if session already has a valid attendance code
    if (session.attendanceCode && session.attendanceCodeExpiresAt) {
      const expiresAt = new Date(session.attendanceCodeExpiresAt).getTime();
      if (expiresAt > Date.now()) {
        return {
          code: session.attendanceCode,
          expiresAt: session.attendanceCodeExpiresAt,
        };
      }
    }
    return null;
  });

  const [generateCode, { isLoading: isGenerating }] = useGenerateAttendanceCodeMutation();

  const handleGenerateCode = useCallback(async () => {
    try {
      const result = await generateCode(session._id).unwrap();
      if (result.data) {
        setActiveCode({
          code: result.data.attendanceCode,
          expiresAt: result.data.expiresAt,
        });
        dispatch(
          addToast({
            type: 'success',
            message: 'Attendance code generated successfully',
            duration: 3000,
          })
        );
      }
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: 'Failed to generate attendance code',
          duration: 4000,
        })
      );
    }
  }, [generateCode, session._id, dispatch]);

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-[180px] w-full bg-surface-background">
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
            <CalendarDays className="h-12 w-12 text-primary-main opacity-50" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-lg">
        {/* Title */}
        <h3 className="text-h3 font-semibold text-text-primary line-clamp-2">
          {session.title}
        </h3>

        {/* Location + Time */}
        <div className="mt-sm flex items-center gap-xs text-body-md text-text-secondary">
          {session.mode === 'online' ? (
            <Video className="h-4 w-4 flex-shrink-0" />
          ) : (
            <MapPin className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="truncate">
            {session.mode === 'online' ? 'Online' : session.location} &mdash; {session.timeSlot}
          </span>
        </div>

        {/* Badges row */}
        <div className="mt-md flex flex-wrap items-center gap-sm">
          {session.mode === 'online' && (
            <Badge variant="info">Online</Badge>
          )}
          <Badge variant="info">
            <Clock className="mr-[4px] inline h-3 w-3" />
            {session.duration} min
          </Badge>
          <Badge variant="default">
            <Users className="mr-[4px] inline h-3 w-3" />
            {session.enrolledStaff.length} enrolled
          </Badge>
        </div>

        {/* Attendance Code Display */}
        {activeCode ? (
          <AttendanceCodeDisplay
            code={activeCode.code}
            expiresAt={activeCode.expiresAt}
            sessionId={session._id}
            onRegenerate={handleGenerateCode}
            isRegenerating={isGenerating}
          />
        ) : (
          <Button
            variant="primary"
            size="lg"
            isBlock
            isLoading={isGenerating}
            onClick={handleGenerateCode}
            className="mt-md min-h-[48px]"
          >
            Generate Code
          </Button>
        )}

        {/* Expand/Collapse Details */}
        <Button
          variant="ghost"
          size="sm"
          isBlock
          onClick={() => setExpanded((prev) => !prev)}
          rightIcon={
            expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          }
          className="mt-sm min-h-[44px]"
        >
          {expanded ? 'Hide Details' : 'View Details'}
        </Button>

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-md space-y-md border-t border-border-light pt-md">
            <h4 className='text-body-md font-semibold text-text-primary'>Description:</h4>
            {session.description && (<>
              <p className="text-body-md text-text-secondary">{session.description}</p>
              </>
            )}
            <div>
              <h4 className="text-body-md font-semibold text-text-primary">Enrolled Staff</h4>
              {session.enrolledStaff.length > 0 ? (
                <ul className="mt-sm space-y-xs">
                  {session.enrolledStaff.map((staff) => {
                    const id = typeof staff === 'string' ? staff : staff._id;
                    const label = typeof staff === 'string' ? staff : (staff.name ?? staff._id);
                    return (
                      <li
                        key={id}
                        className="flex items-center gap-sm rounded-sm bg-surface-background px-sm py-sm text-text-secondary"
                      >
                        <Users className="h-4 w-4 flex-shrink-0" />
                        {label}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-sm text-caption text-text-disabled">No staff enrolled yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Compact Session Card (Upcoming) ──────────────────────

interface CompactSessionCardProps {
  session: SessionData;
}

function CompactSessionCard({ session }: CompactSessionCardProps) {
  return (
    <Card className="flex items-center gap-md">
      {/* Date badge */}
      <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-md bg-primary-light">
        <span className="text-caption font-semibold text-primary-main leading-none">
          {new Intl.DateTimeFormat('en-IN', { day: 'numeric' }).format(new Date(session.date))}
        </span>
        <span className="text-[10px] font-medium text-primary-main uppercase leading-tight">
          {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(session.date))}
        </span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <h4 className="text-body-md font-semibold text-text-primary truncate">
          {session.title}
        </h4>
        <div className="mt-[2px] flex items-center gap-xs text-caption text-text-secondary">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{session.timeSlot}</span>
          {session.mode === 'online' && (
            <Badge variant="info">Online</Badge>
          )}
        </div>
        <div className="mt-[2px] flex items-center gap-xs text-caption text-text-secondary">
          <Users className="h-3 w-3 flex-shrink-0" />
          <span>{session.enrolledStaff.length} enrolled</span>
        </div>
      </div>

      {/* Chevron */}
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-text-disabled" />
    </Card>
  );
}

// ─── Completed Session Card ──────────────────────────────

interface CompletedSessionCardProps {
  session: SessionData;
}

function CompletedSessionCard({ session }: CompletedSessionCardProps) {
  const attendedCount = session.attendance.filter((a) => a.status === 'present').length;
  const totalEnrolled = session.enrolledStaff.length;

  return (
    <Card className="flex items-center gap-md">
      {/* Date badge */}
      <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-md bg-success/10">
        <span className="text-caption font-semibold text-success leading-none">
          {new Intl.DateTimeFormat('en-IN', { day: 'numeric' }).format(new Date(session.date))}
        </span>
        <span className="text-[10px] font-medium text-success uppercase leading-tight">
          {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(session.date))}
        </span>
      </div>

      {/* Details */}
      <div className="min-w-0 flex-1">
        <h4 className="text-body-md font-semibold text-text-primary truncate">
          {session.title}
        </h4>
        <div className="mt-[2px] flex items-center gap-xs text-caption text-text-secondary">
          <Clock className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{formatDate(session.date)} &mdash; {session.timeSlot}</span>
        </div>
        <div className="mt-[2px] flex items-center gap-xs text-caption text-text-secondary">
          <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-success" />
          <span>{attendedCount}/{totalEnrolled} attended</span>
        </div>
      </div>

      {/* Completed badge */}
      <Badge variant="success">Completed</Badge>
    </Card>
  );
}

// ─── Main Page Component ──────────────────────────────────

export default function CoachHome() {
  const {
    isLoading,
    todaySessions,
    upcomingPreview,
    hasMoreUpcoming,
    completedPreview,
    hasMoreCompleted,
  } = useCoachHomeData();

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="space-y-lg">
        <h2 className="text-h2 text-text-primary">Today&apos;s Sessions</h2>
        <SessionCardSkeleton />
        <SessionCardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-xl">
      {/* ── Live Now (ongoing today) ── */}
      {todaySessions.some((s) => getDisplayStatus(s) === 'ongoing') && (
        <section>
          <h2 className="text-h2 text-text-primary flex items-center gap-sm">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            Live Now
          </h2>
          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 gap-md">
            {todaySessions
              .filter((s) => getDisplayStatus(s) === 'ongoing')
              .map((session) => (
                <SessionCard key={session._id} session={session} />
              ))}
          </div>
        </section>
      )}

      {/* ── Today's Upcoming Sessions ── */}
      <section>
        <h2 className="text-h2 text-text-primary">Today&apos;s Sessions</h2>

        {todaySessions.filter((s) => getDisplayStatus(s) === 'upcoming').length > 0 ? (
          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 gap-md">
            {todaySessions
              .filter((s) => getDisplayStatus(s) === 'upcoming')
              .map((session) => (
                <SessionCard key={session._id} session={session} />
              ))}
          </div>
        ) : !todaySessions.some((s) => getDisplayStatus(s) === 'ongoing') ? (
          <div className="mt-md flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
            <CalendarX className="h-12 w-12 text-text-disabled" />
            <p className="mt-md text-body-lg font-medium text-text-secondary">
              No sessions today
            </p>
            <p className="mt-xs text-body-md text-text-disabled">
              Your scheduled sessions will appear here
            </p>
          </div>
        ) : null}
      </section>

      {/* ── Upcoming Sessions ── */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-h2 text-text-primary">Upcoming Sessions</h2>
          {hasMoreUpcoming && (
            <button
              type="button"
              className="text-body-md font-semibold text-primary-main min-h-[44px] flex items-center"
            >
              View All
            </button>
          )}
        </div>

        {upcomingPreview.length > 0 ? (
          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {upcomingPreview.map((session) => (
              <CompactSessionCard key={session._id} session={session} />
            ))}
          </div>
        ) : (
          <div className="mt-md flex flex-col items-center justify-center rounded-md bg-surface-white py-xl px-lg text-center shadow-sm">
            <CalendarDays className="h-10 w-10 text-text-disabled" />
            <p className="mt-sm text-body-md text-text-secondary">
              No upcoming sessions scheduled
            </p>
          </div>
        )}
      </section>

      {/* ── Completed Sessions ── */}
      {completedPreview.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-h2 text-text-primary">Completed Sessions</h2>
            {hasMoreCompleted && (
              <button
                type="button"
                className="text-body-md font-semibold text-primary-main min-h-[44px] flex items-center"
              >
                View All
              </button>
            )}
          </div>

          <div className="mt-md grid grid-cols-1 sm:grid-cols-2 gap-sm">
            {completedPreview.map((session) => (
              <CompletedSessionCard key={session._id} session={session} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
