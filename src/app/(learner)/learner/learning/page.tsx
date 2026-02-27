'use client';

import { useState, useMemo, useCallback } from 'react';
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
import { useGetModulesQuery, type ModuleData } from '@/store/slices/api/moduleApi';

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

// ─── Helpers ────────────────────────────────────────────────

function isSameDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

function isPastDate(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  return d < ref;
}

function getModuleDuration(mod: ModuleData): number {
  return mod.contents.reduce((acc, c) => acc + (c.duration || 0), 0);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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

function ModuleCardSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[180px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-3 w-20 rounded-full bg-border-light" />
        <div className="h-4 w-1/2 rounded-sm bg-border-light" />
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

// ─── Ongoing Module Card ────────────────────────────────────

interface OngoingCardProps {
  module: ModuleData;
  course: CourseData | undefined;
  progress: ProgressData;
}

function OngoingCard({ module, course, progress }: OngoingCardProps) {
  const router = useRouter();
  const duration = getModuleDuration(module);
  const hasQuiz = !!module.quiz;

  // Progress calculation: completedContents out of total contents
  const totalContents = module.contents.length;
  const completedCount = progress.completedContents.length;
  const progressPercent = totalContents > 0
    ? Math.round((completedCount / totalContents) * 100)
    : 0;

  const handleNavigate = useCallback(() => {
    router.push(`/learner/learning/module/${module._id}`);
  }, [router, module._id]);

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail with Play overlay */}
      <button
        type="button"
        className="relative h-[180px] w-full bg-surface-background block"
        onClick={handleNavigate}
        aria-label={`Continue ${module.title}`}
      >
        {course?.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={module.title}
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md">
            <Play className="h-6 w-6 text-primary-main ml-[2px]" fill="currentColor" />
          </div>
        </div>
      </button>

      <div className="p-lg">
        {/* Domain tag */}
        {course?.domain && (
          <p className="text-caption text-text-secondary font-medium uppercase tracking-wide">
            {course.domain}
          </p>
        )}

        {/* Duration + Quiz indicator */}
        <div className="mt-xs flex items-center gap-md text-body-md text-text-secondary">
          {duration > 0 && (
            <span className="flex items-center gap-xs">
              <Clock className="h-3.5 w-3.5" />
              {duration} min
            </span>
          )}
          {hasQuiz && (
            <span className="flex items-center gap-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Quiz
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-sm text-h3 font-semibold text-text-primary line-clamp-2">
          {module.title}
        </h3>

        {/* Description */}
        {module.description && (
          <p className="mt-xs text-body-md text-text-secondary line-clamp-2">
            {module.description}
          </p>
        )}

        {/* Progress bar */}
        <div className="mt-md">
          <div className="flex items-center justify-between text-caption text-text-secondary">
            <span>{completedCount} of {totalContents} completed</span>
            <span className="font-semibold text-primary-main">{progressPercent}%</span>
          </div>
          <div className="mt-xs h-2 w-full overflow-hidden rounded-full bg-surface-background">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Continue button */}
        <Button
          variant="primary"
          size="lg"
          isBlock
          leftIcon={<Play className="h-4 w-4" fill="currentColor" />}
          onClick={handleNavigate}
          className="mt-md min-h-[44px]"
        >
          Continue
        </Button>
      </div>
    </Card>
  );
}

// ─── Assigned Module Card ───────────────────────────────────

interface AssignedCardProps {
  module: ModuleData;
  course: CourseData | undefined;
}

function AssignedCard({ module, course }: AssignedCardProps) {
  const router = useRouter();
  const duration = getModuleDuration(module);
  const hasQuiz = !!module.quiz;

  const handleNavigate = useCallback(() => {
    router.push(`/learner/learning/module/${module._id}`);
  }, [router, module._id]);

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail */}
      <button
        type="button"
        className="relative h-[180px] w-full bg-surface-background block"
        onClick={handleNavigate}
        aria-label={`Start ${module.title}`}
      >
        {course?.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={module.title}
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
      </button>

      <div className="p-lg">
        {/* Domain tag */}
        {course?.domain && (
          <p className="text-caption text-text-secondary font-medium uppercase tracking-wide">
            {course.domain}
          </p>
        )}

        {/* Duration + Quiz indicator */}
        <div className="mt-xs flex items-center gap-md text-body-md text-text-secondary">
          {duration > 0 && (
            <span className="flex items-center gap-xs">
              <Clock className="h-3.5 w-3.5" />
              {duration} min
            </span>
          )}
          {hasQuiz && (
            <span className="flex items-center gap-xs">
              <BookOpen className="h-3.5 w-3.5" />
              Quiz
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="mt-sm text-h3 font-semibold text-text-primary line-clamp-2">
          {module.title}
        </h3>

        {/* Description */}
        {module.description && (
          <p className="mt-xs text-body-md text-text-secondary line-clamp-2">
            {module.description}
          </p>
        )}

        {/* Start button */}
        <Button
          variant="primary"
          size="lg"
          isBlock
          leftIcon={<Play className="h-4 w-4" fill="currentColor" />}
          onClick={handleNavigate}
          className="mt-md min-h-[44px]"
        >
          Start
        </Button>
      </div>
    </Card>
  );
}

// ─── Completed Module Card ──────────────────────────────────

interface CompletedCardProps {
  module: ModuleData;
  course: CourseData | undefined;
  progress: ProgressData;
}

function CompletedCard({ module, course, progress }: CompletedCardProps) {
  const router = useRouter();

  const handleNavigate = useCallback(() => {
    router.push(`/learner/learning/module/${module._id}`);
  }, [router, module._id]);

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail with checkmark overlay */}
      <div className="relative h-[180px] w-full bg-surface-background">
        {course?.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={module.title}
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
        {/* Completion overlay */}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success shadow-md">
            <CheckCircle2 className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      <div className="p-lg">
        {/* Domain tag */}
        {course?.domain && (
          <p className="text-caption text-text-secondary font-medium uppercase tracking-wide">
            {course.domain}
          </p>
        )}

        {/* Title */}
        <h3 className="mt-sm text-h3 font-semibold text-text-primary line-clamp-2">
          {module.title}
        </h3>

        {/* Points + Completion date */}
        <div className="mt-sm flex items-center justify-between text-body-md">
          <span className="flex items-center gap-xs text-amber-500 font-semibold">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {progress.totalModulePoints} pts
          </span>
          {progress.completedAt && (
            <span className="text-text-secondary text-caption">
              {formatDate(progress.completedAt)}
            </span>
          )}
        </div>

        {/* Review button */}
        <Button
          variant="secondary"
          size="lg"
          isBlock
          leftIcon={<RotateCcw className="h-4 w-4" />}
          onClick={handleNavigate}
          className="mt-md min-h-[44px]"
        >
          Review
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
    () => session.attendance.find((a) => a.staff === userId),
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
        addToast({ type: 'success', message: 'Attendance marked successfully!', duration: 3000 })
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
        {isToday && (
          <div className="absolute top-sm right-sm">
            <Badge variant="warning">Today</Badge>
          </div>
        )}
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

        {/* Location */}
        <div className="mt-xs flex items-center gap-xs text-body-md text-text-secondary">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{session.location}</span>
        </div>

        {/* Duration */}
        <div className="mt-xs flex items-center gap-xs text-body-md text-text-secondary">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{session.duration} min</span>
        </div>

        {/* Attendance section */}
        <div className="mt-md">
          {isPresent ? (
            <div className="flex items-center gap-sm rounded-md bg-success/10 px-md py-md">
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
              <Badge variant="success">Present</Badge>
            </div>
          ) : isToday ? (
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
    () => session.attendance.find((a) => a.staff === userId),
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

  // ── Derived data (all wrapped in useMemo) ──
  const sessions = useMemo(() => sessionsResponse?.data ?? [], [sessionsResponse]);
  const progressList = useMemo(() => progressResponse?.data ?? [], [progressResponse]);
  const courses = useMemo(() => coursesResponse?.data ?? [], [coursesResponse]);
  const modules = useMemo(() => modulesResponse?.data ?? [], [modulesResponse]);

  const today = useMemo(() => new Date(), []);

  // Course map for quick lookup
  const courseMap = useMemo(() => {
    const map = new Map<string, CourseData>();
    for (const c of courses) {
      map.set(c._id, c);
    }
    return map;
  }, [courses]);

  // Progress map keyed by moduleId
  const progressMap = useMemo(() => {
    const map = new Map<string, ProgressData>();
    for (const p of progressList) {
      map.set(p.module, p);
    }
    return map;
  }, [progressList]);

  // Assigned course IDs where user is in assignedStaff
  const assignedCourseIds = useMemo(() => {
    return new Set(
      courses
        .filter((c) => user?.id && c.assignedStaff.some((s) => (typeof s === 'string' ? s : s._id) === user.id))
        .map((c) => c._id)
    );
  }, [courses, user?.id]);

  // All modules from assigned courses
  const assignedModules = useMemo(() => {
    return modules.filter((m) => assignedCourseIds.has(m.course));
  }, [modules, assignedCourseIds]);

  // ── Tab data ──
  const ongoingModules = useMemo(() => {
    return assignedModules.filter((m) => {
      const p = progressMap.get(m._id);
      return p?.status === 'in_progress';
    });
  }, [assignedModules, progressMap]);

  const assignedNotStarted = useMemo(() => {
    return assignedModules.filter((m) => {
      const p = progressMap.get(m._id);
      return !p || p.status === 'not_started';
    });
  }, [assignedModules, progressMap]);

  const completedModules = useMemo(() => {
    return assignedModules.filter((m) => {
      const p = progressMap.get(m._id);
      return p?.status === 'completed';
    });
  }, [assignedModules, progressMap]);

  // Sessions: filter where user is enrolled
  const userSessions = useMemo(() => {
    return sessions.filter((s) => user?.id && s.enrolledStaff.includes(user.id));
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
    ongoing: ongoingModules.length,
    assigned: assignedNotStarted.length,
    completed: completedModules.length,
    sessions: userSessions.length,
  }), [ongoingModules.length, assignedNotStarted.length, completedModules.length, userSessions.length]);

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
              <ModuleCardSkeleton />
              <ModuleCardSkeleton />
            </>
          ) : ongoingModules.length > 0 ? (
            ongoingModules.map((mod) => {
              const progress = progressMap.get(mod._id);
              if (!progress) return null;
              return (
                <OngoingCard
                  key={mod._id}
                  module={mod}
                  course={courseMap.get(mod.course)}
                  progress={progress}
                />
              );
            })
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
              <ModuleCardSkeleton />
              <ModuleCardSkeleton />
            </>
          ) : assignedNotStarted.length > 0 ? (
            assignedNotStarted.map((mod) => (
              <AssignedCard
                key={mod._id}
                module={mod}
                course={courseMap.get(mod.course)}
              />
            ))
          ) : (
            <EmptyState
              icon={BookOpen}
              title="All caught up!"
              subtitle="You have started all your assigned modules"
            />
          )}
        </section>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        <section className="space-y-md">
          {isLoading ? (
            <>
              <ModuleCardSkeleton />
              <ModuleCardSkeleton />
            </>
          ) : completedModules.length > 0 ? (
            completedModules.map((mod) => {
              const progress = progressMap.get(mod._id);
              if (!progress) return null;
              return (
                <CompletedCard
                  key={mod._id}
                  module={mod}
                  course={courseMap.get(mod.course)}
                  progress={progress}
                />
              );
            })
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="No completed modules yet"
              subtitle="Complete your assigned modules to see them here"
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
