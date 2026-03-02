'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Play,
  Clock,
  BookOpen,
  CheckCircle2,
  MapPin,
  CalendarDays,
  Star,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Timer,
  Circle,
  ClipboardList,
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
import { useGetProgressQuery, type ProgressData } from '@/store/slices/api/progressApi';
import { useGetCoursesQuery, type CourseData } from '@/store/slices/api/courseApi';
import { useGetModulesQuery, getQuizId, type ModuleData } from '@/store/slices/api/moduleApi';

// ─── Types ──────────────────────────────────────────────────

type TabKey = 'ongoing' | 'assigned' | 'completed' | 'sessions';

interface TabDef {
  key: TabKey;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'completed', label: 'Completed' },
  { key: 'sessions', label: 'Sessions' },
];

type CourseCategory = 'ongoing' | 'assigned' | 'completed';

// ─── Helpers ────────────────────────────────────────────────

function isSameDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

/** Derive display status based on current time vs session date+timeSlot+duration. */
function getSessionDisplayStatus(session: SessionData): 'upcoming' | 'ongoing' | 'completed' {
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

function isPastDate(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  return d < ref;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function categorizeCourse(
  modules: ModuleData[],
  progressMap: Map<string, ProgressData>
): CourseCategory {
  if (modules.length === 0) return 'assigned';

  let hasStarted = false;
  let allCompleted = true;

  for (const mod of modules) {
    const p = progressMap.get(mod._id);
    if (p?.status === 'in_progress' || p?.status === 'completed') {
      hasStarted = true;
    }
    if (!p || p.status !== 'completed') {
      allCompleted = false;
    }
  }

  if (allCompleted) return 'completed';
  if (hasStarted) return 'ongoing';
  return 'assigned';
}

// ─── Skeleton Components ────────────────────────────────────

function TabBarSkeleton() {
  return (
    <div className="flex gap-md overflow-x-auto border-b border-border-light pb-[1px] animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-8 w-20 rounded-sm bg-border-light flex-shrink-0" />
      ))}
    </div>
  );
}

function CourseCardSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[160px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-3 w-20 rounded-full bg-border-light" />
        <div className="h-4 w-1/3 rounded-sm bg-border-light" />
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-2 w-full rounded-full bg-border-light" />
        <div className="h-12 w-full rounded-sm bg-border-light" />
      </div>
    </div>
  );
}

function SessionCardSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="p-lg space-y-md">
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-4 w-1/2 rounded-sm bg-border-light" />
        <div className="h-12 w-full rounded-sm bg-border-light" />
      </div>
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────

function EmptyState({ icon: Icon, title, subtitle }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
      <Icon className="h-12 w-12 text-text-disabled" />
      <p className="mt-md text-body-lg font-medium text-text-secondary">{title}</p>
      <p className="mt-xs text-body-md text-text-disabled">{subtitle}</p>
    </div>
  );
}

// ─── Module Row (within Course Card) ────────────────────────

interface ModuleRowProps {
  module: ModuleData;
  progress: ProgressData | undefined;
}

function ModuleRow({ module, progress }: ModuleRowProps) {
  const router = useRouter();
  const status = progress?.status ?? 'not_started';
  const points = progress?.totalModulePoints ?? 0;
  const hasQuiz = !!getQuizId(module.quiz);
  const isQuizPending = hasQuiz && progress?.videoCompleted && !progress?.quizPassed;

  return (
    <button
      type="button"
      onClick={() => router.push(`/learner/learning/module/${module._id}`)}
      className="flex w-full items-center gap-sm rounded-md px-sm py-xs text-left hover:bg-surface-background transition-colors"
    >
      <div className="flex-shrink-0">
        {status === 'completed' ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : isQuizPending ? (
          <ClipboardList className="h-4 w-4 text-primary-main" />
        ) : status === 'in_progress' ? (
          <Timer className="h-4 w-4 text-amber-500" />
        ) : (
          <Circle className="h-4 w-4 text-text-disabled" />
        )}
      </div>
      <span className="flex-1 text-body-md text-text-primary line-clamp-1">
        {module.title}
      </span>
      {isQuizPending ? (
        <span className="text-caption text-primary-main font-semibold bg-primary-light px-sm py-[2px] rounded-full">
          Take Quiz
        </span>
      ) : points > 0 ? (
        <span className="text-caption text-amber-500 font-medium flex items-center gap-[2px]">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          {points}
        </span>
      ) : null}
    </button>
  );
}

// ─── Course Card ────────────────────────────────────────────

interface CourseCardProps {
  course: CourseData;
  modules: ModuleData[];
  progressMap: Map<string, ProgressData>;
  variant: CourseCategory;
}

function CourseCard({ course, modules, progressMap, variant }: CourseCardProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const completedModuleCount = useMemo(
    () => modules.filter((m) => progressMap.get(m._id)?.status === 'completed').length,
    [modules, progressMap]
  );

  const progressPercent = modules.length > 0
    ? Math.round((completedModuleCount / modules.length) * 100)
    : 0;

  const totalPoints = useMemo(
    () => modules.reduce((sum, m) => sum + (progressMap.get(m._id)?.totalModulePoints ?? 0), 0),
    [modules, progressMap]
  );

  const totalDuration = useMemo(
    () => modules.reduce(
      (sum, m) => sum + m.contents.reduce((s, c) => s + (c.duration || 0), 0),
      0
    ),
    [modules]
  );

  const navigateToCourse = useCallback(
    () => router.push(`/learner/learning/course/${course._id}`),
    [router, course._id]
  );

  const latestCompletedAt = useMemo(() => {
    if (variant !== 'completed') return null;
    let latest: string | null = null;
    for (const mod of modules) {
      const p = progressMap.get(mod._id);
      if (p?.completedAt && (!latest || p.completedAt > latest)) {
        latest = p.completedAt;
      }
    }
    return latest;
  }, [variant, modules, progressMap]);

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail */}
      <button
        type="button"
        className="relative h-[160px] w-full bg-surface-background block"
        onClick={navigateToCourse}
        aria-label={`${variant === 'ongoing' ? 'Continue' : variant === 'assigned' ? 'Start' : 'Review'} ${course.title}`}
      >
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            unoptimized
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-light">
            <BookOpen className="h-12 w-12 text-primary-main opacity-50" />
          </div>
        )}
        {variant === 'ongoing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md">
              <Play className="h-6 w-6 text-primary-main ml-[2px]" fill="currentColor" />
            </div>
          </div>
        )}
        {variant === 'completed' && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success shadow-md">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
          </div>
        )}
      </button>

      <div className="p-lg">
        {/* Domain tag */}
        {course.domain && (
          <p className="text-caption text-text-secondary font-medium uppercase tracking-wide">
            {course.domain}
          </p>
        )}

        {/* Duration + Module count */}
        <div className="mt-xs flex items-center gap-md text-body-md text-text-secondary">
          {totalDuration > 0 && (
            <span className="flex items-center gap-xs">
              <Clock className="h-3.5 w-3.5" />
              {totalDuration} min
            </span>
          )}
          <span className="flex items-center gap-xs">
            <BookOpen className="h-3.5 w-3.5" />
            {modules.length} module{modules.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-sm text-h3 font-semibold text-text-primary line-clamp-2">
          {course.title}
        </h3>

        {/* Description */}
        {course.description && (
          <p className="mt-xs text-body-md text-text-secondary line-clamp-2">
            {course.description}
          </p>
        )}

        {/* Progress bar (for ongoing and completed) */}
        {variant !== 'assigned' && (
          <div className="mt-md">
            <div className="flex items-center justify-between text-caption text-text-secondary">
              <span>{completedModuleCount} of {modules.length} modules</span>
              {variant === 'ongoing' && (
                <span className="font-semibold text-primary-main">{progressPercent}%</span>
              )}
            </div>
            <div className="mt-xs h-2 w-full overflow-hidden rounded-full bg-surface-background">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Points + Completion date (for completed) */}
        {variant === 'completed' && (
          <div className="mt-sm flex items-center justify-between text-body-md">
            <span className="flex items-center gap-xs text-amber-500 font-semibold">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {totalPoints} pts
            </span>
            {latestCompletedAt && (
              <span className="text-text-secondary text-caption">
                {formatDate(latestCompletedAt)}
              </span>
            )}
          </div>
        )}

        {/* Expandable module list */}
        {modules.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-md flex w-full items-center justify-between rounded-md px-sm py-xs text-body-md font-medium text-text-secondary hover:text-text-primary hover:bg-surface-background transition-colors"
            >
              <span>Modules</span>
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {expanded && (
              <div className="mt-xs space-y-[2px]">
                {modules.map((mod) => (
                  <ModuleRow
                    key={mod._id}
                    module={mod}
                    progress={progressMap.get(mod._id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Action button */}
        <Button
          variant={variant === 'completed' ? 'secondary' : 'primary'}
          size="lg"
          isBlock
          leftIcon={
            variant === 'completed' ? (
              <RotateCcw className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" fill="currentColor" />
            )
          }
          onClick={navigateToCourse}
          className="mt-md min-h-[44px]"
        >
          {variant === 'ongoing' ? 'Continue' : variant === 'assigned' ? 'Start' : 'Review'}
        </Button>
      </div>
    </Card>
  );
}

// ─── Session Card (Upcoming) ────────────────────────────────

interface SessionUpcomingCardProps {
  session: SessionData;
  userId: string;
  isToday: boolean;
}

function SessionUpcomingCard({ session, userId, isToday }: SessionUpcomingCardProps) {
  const dispatch = useAppDispatch();
  const [attendanceCode, setAttendanceCode] = useState('');
  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  const userAttendance = useMemo(
    () =>
      session.attendance.find(
        (a) => (typeof a.staff === 'string' ? a.staff : a.staff._id) === userId
      ),
    [session.attendance, userId]
  );
  const isPresent = userAttendance?.status === 'present';

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
        {(() => {
          const ds = getSessionDisplayStatus(session);
          if (ds === 'ongoing') return (
            <div className="absolute top-sm right-sm"><Badge variant="info">Ongoing</Badge></div>
          );
          if (isToday) return (
            <div className="absolute top-sm right-sm"><Badge variant="warning">Today</Badge></div>
          );
          return null;
        })()}
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

        {/* Join Now button for online sessions */}
        {session.mode === 'online' && session.meetingLink && (isToday || getSessionDisplayStatus(session) === 'ongoing') && (
          <a
            href={session.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-md flex items-center justify-center gap-sm rounded-sm bg-blue-600 px-md py-[10px] text-body-md font-semibold text-white transition-colors hover:bg-blue-700 min-h-[44px]"
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
          ) : isToday || getSessionDisplayStatus(session) === 'ongoing' ? (
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
                className="min-h-[44px]"
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

// ─── Session Card (Past) ────────────────────────────────────

interface SessionPastCardProps {
  session: SessionData;
  userId: string;
}

function SessionPastCard({ session, userId }: SessionPastCardProps) {
  const userAttendance = useMemo(
    () =>
      session.attendance.find(
        (a) => (typeof a.staff === 'string' ? a.staff : a.staff._id) === userId
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

// ─── Main Page Component ────────────────────────────────────

export default function MyLearning() {
  const user = useAppSelector((s) => s.auth.user);
  const [activeTab, setActiveTab] = useState<TabKey>('ongoing');

  // Auto-refresh every 60s so session status badges update live
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Queries ──
  const { data: sessionsResponse, isLoading: isLoadingSessions } = useGetSessionsQuery(
    { limit: 50, sortBy: 'date', sortOrder: 'asc' },
    { skip: !user?.id }
  );

  const { data: progressResponse, isLoading: isLoadingProgress } = useGetProgressQuery(
    { limit: 200 },
    { skip: !user?.id }
  );

  const { data: coursesResponse, isLoading: isLoadingCourses } = useGetCoursesQuery(
    { status: 'active', limit: 50 },
    { skip: !user?.id }
  );

  const { data: modulesResponse, isLoading: isLoadingModules } = useGetModulesQuery(
    { limit: 200 },
    { skip: !user?.id }
  );

  // ── Derived data ──
  const sessions = useMemo(() => sessionsResponse?.data ?? [], [sessionsResponse]);
  const progressList = useMemo(() => progressResponse?.data ?? [], [progressResponse]);
  const courses = useMemo(() => coursesResponse?.data ?? [], [coursesResponse]);
  const modules = useMemo(() => modulesResponse?.data ?? [], [modulesResponse]);

  const today = useMemo(() => new Date(), []);

  // Progress map keyed by moduleId
  const progressMap = useMemo(() => {
    const map = new Map<string, ProgressData>();
    for (const p of progressList) {
      map.set(p.module, p);
    }
    return map;
  }, [progressList]);

  // Assigned courses (where user is in assignedStaff)
  const assignedCourses = useMemo(() => {
    return courses.filter((c) =>
      user?.id && c.assignedStaff.some((s) => (typeof s === 'string' ? s : s._id) === user.id)
    );
  }, [courses, user?.id]);

  // Group modules by courseId (only from assigned courses)
  const courseModulesMap = useMemo(() => {
    const map = new Map<string, ModuleData[]>();
    const assignedIds = new Set(assignedCourses.map((c) => c._id));

    for (const mod of modules) {
      if (!assignedIds.has(mod.course)) continue;
      const existing = map.get(mod.course) ?? [];
      existing.push(mod);
      map.set(mod.course, existing);
    }

    // Sort modules by order within each course
    for (const [key, mods] of map) {
      map.set(key, mods.sort((a, b) => a.order - b.order));
    }

    return map;
  }, [modules, assignedCourses]);

  // ── Course categorization ──
  const ongoingCourses = useMemo(() => {
    return assignedCourses.filter((c) => {
      const mods = courseModulesMap.get(c._id) ?? [];
      return categorizeCourse(mods, progressMap) === 'ongoing';
    });
  }, [assignedCourses, courseModulesMap, progressMap]);

  const assignedNotStarted = useMemo(() => {
    return assignedCourses.filter((c) => {
      const mods = courseModulesMap.get(c._id) ?? [];
      return categorizeCourse(mods, progressMap) === 'assigned';
    });
  }, [assignedCourses, courseModulesMap, progressMap]);

  const completedCourses = useMemo(() => {
    return assignedCourses.filter((c) => {
      const mods = courseModulesMap.get(c._id) ?? [];
      return categorizeCourse(mods, progressMap) === 'completed';
    });
  }, [assignedCourses, courseModulesMap, progressMap]);

  // ── Sessions: filter where user is enrolled ──
  const userSessions = useMemo(() => {
    return sessions.filter(
      (s) =>
        user?.id &&
        s.enrolledStaff.some(
          (staff) => (typeof staff === 'string' ? staff : staff._id) === user.id
        )
    );
  }, [sessions, user?.id]);

  const upcomingSessions = useMemo(() => {
    return userSessions.filter(
      (s) => !isPastDate(s.date, today) && s.status !== 'cancelled'
    );
  }, [userSessions, today]);

  const pastSessions = useMemo(() => {
    return userSessions.filter(
      (s) => isPastDate(s.date, today) || s.status === 'completed'
    );
  }, [userSessions, today]);

  // ── Tab counts ──
  const tabCounts: Record<TabKey, number> = useMemo(() => ({
    ongoing: ongoingCourses.length,
    assigned: assignedNotStarted.length,
    completed: completedCourses.length,
    sessions: userSessions.length,
  }), [ongoingCourses.length, assignedNotStarted.length, completedCourses.length, userSessions.length]);

  // ── Loading ──
  const isLoading = isLoadingSessions || isLoadingProgress || isLoadingCourses || isLoadingModules;

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-lg pb-lg">
      {/* Page Title */}
      <h1 className="text-h2 font-semibold text-text-primary">My Learning</h1>

      {/* ── Tab Bar ── */}
      {isLoading ? (
        <TabBarSkeleton />
      ) : (
        <div className="flex overflow-x-auto border-b border-border-light -mx-md px-md scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-xs px-md pb-sm pt-xs flex-shrink-0
                text-body-md font-medium transition-colors duration-200 whitespace-nowrap
                ${
                  activeTab === tab.key
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
                    activeTab === tab.key
                      ? 'bg-primary-main text-white'
                      : 'bg-surface-background text-text-secondary'
                  }
                `}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ── Tab Content ── */}

      {/* Ongoing Tab */}
      {activeTab === 'ongoing' && (
        <section className="space-y-md">
          {isLoading ? (
            <>
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </>
          ) : ongoingCourses.length > 0 ? (
            ongoingCourses.map((c) => (
              <CourseCard
                key={c._id}
                course={c}
                modules={courseModulesMap.get(c._id) ?? []}
                progressMap={progressMap}
                variant="ongoing"
              />
            ))
          ) : (
            <EmptyState
              icon={BookOpen}
              title="No courses in progress"
              subtitle="Start a course from the Assigned tab to see it here"
            />
          )}
        </section>
      )}

      {/* Assigned Tab */}
      {activeTab === 'assigned' && (
        <section className="space-y-md">
          {isLoading ? (
            <>
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </>
          ) : assignedNotStarted.length > 0 ? (
            assignedNotStarted.map((c) => (
              <CourseCard
                key={c._id}
                course={c}
                modules={courseModulesMap.get(c._id) ?? []}
                progressMap={progressMap}
                variant="assigned"
              />
            ))
          ) : (
            <EmptyState
              icon={BookOpen}
              title="All caught up!"
              subtitle="You have started all your assigned courses"
            />
          )}
        </section>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        <section className="space-y-md">
          {isLoading ? (
            <>
              <CourseCardSkeleton />
              <CourseCardSkeleton />
            </>
          ) : completedCourses.length > 0 ? (
            completedCourses.map((c) => (
              <CourseCard
                key={c._id}
                course={c}
                modules={courseModulesMap.get(c._id) ?? []}
                progressMap={progressMap}
                variant="completed"
              />
            ))
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No completed courses yet"
              subtitle="Complete your assigned courses to see them here"
            />
          )}
        </section>
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <section className="space-y-lg">
          {isLoading ? (
            <>
              <SessionCardSkeleton />
              <SessionCardSkeleton />
            </>
          ) : userSessions.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No training sessions"
              subtitle="You have no scheduled training sessions"
            />
          ) : (
            <>
              {/* Upcoming Sessions */}
              {upcomingSessions.length > 0 && (
                <div>
                  <h2 className="text-h3 font-semibold text-text-primary mb-md">
                    Upcoming Sessions
                  </h2>
                  <div className="space-y-md">
                    {upcomingSessions.map((session) => (
                      <SessionUpcomingCard
                        key={session._id}
                        session={session}
                        userId={user?.id ?? ''}
                        isToday={isSameDay(session.date, today)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Past Sessions */}
              {pastSessions.length > 0 && (
                <div>
                  <h2 className="text-h3 font-semibold text-text-primary mb-md">
                    Past Sessions
                  </h2>
                  <div className="space-y-md">
                    {pastSessions.map((session) => (
                      <SessionPastCard
                        key={session._id}
                        session={session}
                        userId={user?.id ?? ''}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
