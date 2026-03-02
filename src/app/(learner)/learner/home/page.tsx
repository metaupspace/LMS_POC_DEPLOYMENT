'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Flame,
  Star,
  Play,
  MapPin,
  Clock,
  BookOpen,
  Award,
  CheckCircle2,
  CalendarDays,
  Video,
  ExternalLink,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast } from '@/store/slices/uiSlice';
import {
  useGetUserGamificationQuery,
  useUpdateStreakMutation,
} from '@/store/slices/api/gamificationApi';
import {
  useGetSessionsQuery,
  useMarkAttendanceMutation,
  type SessionData,
} from '@/store/slices/api/sessionApi';
import { useGetProgressQuery, type ProgressData } from '@/store/slices/api/progressApi';
import { useGetCoursesQuery, type CourseData } from '@/store/slices/api/courseApi';
import { useGetModulesQuery } from '@/store/slices/api/moduleApi';
import type { ModuleData } from '@/store/slices/api/moduleApi';

// ─── Badge Tier Constants ──────────────────────────────────

const BADGE_TIERS = [
  { name: 'Rookie', threshold: 1000, icon: '\u{1F949}' },
  { name: 'Silver', threshold: 2000, icon: '\u{1F948}' },
  { name: 'Gold', threshold: 3000, icon: '\u{1F947}' },
  { name: 'Premium', threshold: 5000, icon: '\u{1F48E}' },
] as const;

// ─── Helpers ───────────────────────────────────────────────

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

function getCourseDuration(modules: ModuleData[]): number {
  return modules.reduce(
    (acc, mod) => acc + mod.contents.reduce((s, c) => s + (c.duration || 0), 0),
    0
  );
}

// ─── Skeleton Components ───────────────────────────────────

function GamificationSkeleton() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="p-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-md">
            <div className="h-10 w-10 rounded-full bg-border-light" />
            <div className="space-y-xs">
              <div className="h-6 w-16 rounded-sm bg-border-light" />
              <div className="h-3 w-20 rounded-sm bg-border-light" />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <div className="h-5 w-12 rounded-sm bg-border-light" />
            <div className="h-6 w-8 rounded-full bg-border-light" />
          </div>
        </div>
        <div className="mt-md">
          <div className="h-3 w-48 rounded-sm bg-border-light" />
          <div className="mt-sm h-2 w-full rounded-full bg-border-light" />
        </div>
      </div>
    </div>
  );
}

function SessionSkeletonCard() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[200px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-4 w-1/2 rounded-sm bg-border-light" />
        <div className="h-10 w-full rounded-sm bg-border-light" />
        <div className="h-12 w-full rounded-sm bg-border-light" />
      </div>
    </div>
  );
}

function CourseSkeletonCard() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[180px] w-full bg-border-light" />
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

// ─── Gamification Header ───────────────────────────────────

interface GamificationHeaderProps {
  totalPoints: number;
  streakCurrent: number;
  earnedBadgeNames: string[];
}

function GamificationHeader({
  totalPoints,
  streakCurrent,
  earnedBadgeNames,
}: GamificationHeaderProps) {
  // Find next unearned badge
  const nextBadge = useMemo(() => {
    for (const tier of BADGE_TIERS) {
      const earned = earnedBadgeNames.some(
        (b) => b.toLowerCase() === tier.name.toLowerCase()
      );
      if (!earned) return tier;
    }
    return null;
  }, [earnedBadgeNames]);

  const progressToNext = useMemo(() => {
    if (!nextBadge) return 100;
    // Find previous tier threshold
    const tierIndex = BADGE_TIERS.findIndex((t) => t.name === nextBadge.name);
    const prevTier = tierIndex > 0 ? BADGE_TIERS[tierIndex - 1] : undefined;
    const prevThreshold = prevTier ? prevTier.threshold : 0;
    const range = nextBadge.threshold - prevThreshold;
    const progress = totalPoints - prevThreshold;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [totalPoints, nextBadge]);

  const pointsToNext = useMemo(() => {
    if (!nextBadge) return 0;
    return Math.max(0, nextBadge.threshold - totalPoints);
  }, [totalPoints, nextBadge]);

  // Current badge
  const currentBadge = useMemo(() => {
    let current: (typeof BADGE_TIERS)[number] | null = null;
    for (const tier of BADGE_TIERS) {
      const earned = earnedBadgeNames.some(
        (b) => b.toLowerCase() === tier.name.toLowerCase()
      );
      if (earned) current = tier;
    }
    return current;
  }, [earnedBadgeNames]);

  return (
    <Card noPadding className="overflow-hidden">
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-lg">
        {/* Top row: streak + points */}
        <div className="flex items-center justify-between">
          {/* Left: Streak */}
          <div className="flex items-center gap-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Flame className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-h2 font-bold text-text-primary leading-none">
                {streakCurrent}
              </p>
              <p className="text-caption text-text-secondary">Daily Streak</p>
            </div>
          </div>

          {/* Right: Points + Badge */}
          <div className="flex items-center gap-md">
            <div className="flex items-center gap-xs">
              <Star className="h-5 w-5 text-amber-400 fill-amber-400" />
              <span className="text-body-lg font-semibold text-text-primary">
                {totalPoints.toLocaleString()}
              </span>
            </div>
            {currentBadge && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-white shadow-sm"
                title={currentBadge.name}
              >
                <Award className="h-4 w-4 text-primary-main" />
              </div>
            )}
          </div>
        </div>

        {/* Next badge progress */}
        {nextBadge ? (
          <div className="mt-md">
            <p className="text-caption text-text-secondary">
              <span className="font-semibold text-text-primary">
                {pointsToNext.toLocaleString()}
              </span>{' '}
              more points to{' '}
              <span className="font-semibold text-text-primary">
                {nextBadge.icon} {nextBadge.name}
              </span>
            </p>
            <div className="mt-sm h-2 w-full overflow-hidden rounded-full bg-white/80">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-500"
                style={{ width: `${progressToNext}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-md">
            <p className="text-caption font-semibold text-primary-main">
              All badges earned! You are a Premium learner.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ─── Session Attendance Card ───────────────────────────────

interface SessionAttendanceCardProps {
  session: SessionData;
  userId: string;
}

function SessionAttendanceCard({ session, userId }: SessionAttendanceCardProps) {
  const dispatch = useAppDispatch();
  const [attendanceCode, setAttendanceCode] = useState('');
  const [markAttendance, { isLoading: isMarking }] = useMarkAttendanceMutation();

  // Check if user has already marked attendance
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
        addToast({
          type: 'warning',
          message: 'Please enter a valid 6-digit code',
          duration: 3000,
        })
      );
      return;
    }

    try {
      await markAttendance({
        id: session._id,
        body: { attendanceCode },
      }).unwrap();

      dispatch(
        addToast({
          type: 'success',
          message: 'Attendance Marked! +30 points',
          duration: 3000,
        })
      );
      setAttendanceCode('');
    } catch {
      dispatch(
        addToast({
          type: 'error',
          message: 'Invalid attendance code. Please try again.',
          duration: 4000,
        })
      );
    }
  }, [attendanceCode, markAttendance, session._id, dispatch]);

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail */}
      <div className="relative h-[200px] w-full bg-surface-background">
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
        {getSessionDisplayStatus(session) === 'ongoing' && (
          <div className="absolute top-sm right-sm">
            <Badge variant="info">Ongoing</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-lg">
        {/* Title */}
        <h3 className="text-h3 font-semibold text-text-primary line-clamp-2">
          {session.title}
        </h3>

        {/* Location / Online + Time */}
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

        {/* Duration */}
        <div className="mt-xs flex items-center gap-xs text-body-md text-text-secondary">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{session.duration} min</span>
        </div>

        {/* Coach */}
        <div className="mt-xs text-body-md text-text-secondary">
          Coach: {typeof session.instructor === 'object' && session.instructor !== null ? session.instructor.name : (session.instructor ?? 'TBD')}
        </div>

        {/* Join Now button for online sessions */}
        {session.mode === 'online' && session.meetingLink && (
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
          ) : (
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
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Course Learning Card ──────────────────────────────────

interface CourseLearningCardProps {
  course: CourseData;
  modules: ModuleData[];
  progressMap: Map<string, ProgressData>;
}

function CourseLearningCard({ course, modules, progressMap }: CourseLearningCardProps) {
  const router = useRouter();
  const duration = getCourseDuration(modules);

  const completedCount = useMemo(
    () => modules.filter((m) => progressMap.get(m._id)?.status === 'completed').length,
    [modules, progressMap]
  );

  const hasInProgress = useMemo(
    () => modules.some((m) => progressMap.get(m._id)?.status === 'in_progress'),
    [modules, progressMap]
  );

  const progressPercent = modules.length > 0
    ? Math.round((completedCount / modules.length) * 100)
    : 0;

  const showProgress = completedCount > 0 || hasInProgress;

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail with Play overlay */}
      <button
        type="button"
        className="relative h-[180px] w-full bg-surface-background block"
        onClick={() => router.push(`/learner/learning/course/${course._id}`)}
        aria-label={`${hasInProgress ? 'Continue' : 'Start'} ${course.title}`}
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md">
            <Play className="h-6 w-6 text-primary-main ml-[2px]" fill="currentColor" />
          </div>
        </div>
      </button>

      {/* Content */}
      <div className="p-lg">
        {/* Domain tag */}
        {course.domain && (
          <p className="text-caption text-text-secondary font-medium uppercase tracking-wide">
            {course.domain}
          </p>
        )}

        {/* Duration + Module count */}
        <div className="mt-xs flex items-center gap-md text-body-md text-text-secondary">
          {duration > 0 && (
            <span className="flex items-center gap-xs">
              <Clock className="h-3.5 w-3.5" />
              {duration} min
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

        {/* Progress bar (only if started) */}
        {showProgress && (
          <div className="mt-md">
            <div className="flex items-center justify-between text-caption text-text-secondary">
              <span>{completedCount} of {modules.length} modules</span>
              <span className="font-semibold text-primary-main">{progressPercent}%</span>
            </div>
            <div className="mt-xs h-2 w-full overflow-hidden rounded-full bg-surface-background">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-primary-main transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Start / Continue button */}
        <Button
          variant="primary"
          size="lg"
          isBlock
          leftIcon={<Play className="h-4 w-4" fill="currentColor" />}
          onClick={() => router.push(`/learner/learning/course/${course._id}`)}
          className="mt-md min-h-[48px]"
        >
          {hasInProgress ? 'Continue' : 'Start'}
        </Button>
      </div>
    </Card>
  );
}

// ─── Main Page Component ───────────────────────────────────

export default function LearnerHome() {
  const user = useAppSelector((s) => s.auth.user);
  const streakUpdatedRef = useRef(false);

  // ── Queries (skip until user is loaded) ──
  const { data: gamificationResponse, isLoading: isLoadingGamification } =
    useGetUserGamificationQuery(user?.id ?? '', { skip: !user?.id });

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

  // ── Update streak on mount ──
  const [updateStreak] = useUpdateStreakMutation();

  useEffect(() => {
    if (user?.id && !streakUpdatedRef.current) {
      streakUpdatedRef.current = true;
      updateStreak().catch(() => {
        // Streak update is fire-and-forget; ignore errors silently
      });
    }
  }, [user?.id, updateStreak]);

  // Auto-refresh every 60s so session status badges update live
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Derived data ──
  const gamification = useMemo(
    () => gamificationResponse?.data ?? null,
    [gamificationResponse]
  );

  const sessions = useMemo(
    () => sessionsResponse?.data ?? [],
    [sessionsResponse]
  );

  const progressList = useMemo(
    () => progressResponse?.data ?? [],
    [progressResponse]
  );

  const courses = useMemo(
    () => coursesResponse?.data ?? [],
    [coursesResponse]
  );

  const modules = useMemo(
    () => modulesResponse?.data ?? [],
    [modulesResponse]
  );

  // Today reference
  const today = useMemo(() => new Date(), []);

  // Today's sessions: only upcoming/ongoing, not already attended
  const todaySessions = useMemo(
    () =>
      sessions.filter((s) => {
        if (!isSameDay(s.date, today)) return false;
        if (!user?.id) return false;
        if (!s.enrolledStaff.some(
          (staff) => (typeof staff === 'string' ? staff : staff._id) === user.id
        )) return false;

        // Exclude attended sessions
        const attended = s.attendance.some(
          (a) => ((typeof a.staff === 'string' ? a.staff : a.staff._id) === user.id) && a.status === 'present'
        );
        if (attended) return false;

        // Exclude completed sessions (time elapsed)
        const ds = getSessionDisplayStatus(s);
        return ds === 'upcoming' || ds === 'ongoing';
      }),
    [sessions, today, user?.id]
  );

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

  // Group modules by courseId
  const courseModulesMap = useMemo(() => {
    const map = new Map<string, ModuleData[]>();
    const assignedIds = new Set(assignedCourses.map((c) => c._id));

    for (const mod of modules) {
      if (!assignedIds.has(mod.course)) continue;
      const existing = map.get(mod.course) ?? [];
      existing.push(mod);
      map.set(mod.course, existing);
    }

    for (const [key, mods] of map) {
      map.set(key, mods.sort((a, b) => a.order - b.order));
    }

    return map;
  }, [modules, assignedCourses]);

  // Learning courses: in-progress first, then not-started, exclude completed
  const learningCourses = useMemo(() => {
    const inProgress: CourseData[] = [];
    const notStarted: CourseData[] = [];

    for (const c of assignedCourses) {
      const mods = courseModulesMap.get(c._id) ?? [];
      if (mods.length === 0) {
        notStarted.push(c);
        continue;
      }

      const allCompleted = mods.every((m) => progressMap.get(m._id)?.status === 'completed');
      if (allCompleted) continue; // hide completed courses

      const hasStarted = mods.some((m) => {
        const p = progressMap.get(m._id);
        return p?.status === 'in_progress' || p?.status === 'completed';
      });

      if (hasStarted) {
        inProgress.push(c);
      } else {
        notStarted.push(c);
      }
    }

    return [...inProgress, ...notStarted];
  }, [assignedCourses, courseModulesMap, progressMap]);

  const hasInProgressCourse = useMemo(() => {
    return learningCourses.some((c) => {
      const mods = courseModulesMap.get(c._id) ?? [];
      return mods.some((m) => {
        const p = progressMap.get(m._id);
        return p?.status === 'in_progress' || p?.status === 'completed';
      });
    });
  }, [learningCourses, courseModulesMap, progressMap]);

  // ── Loading state ──
  const isLoading =
    isLoadingGamification ||
    isLoadingSessions ||
    isLoadingProgress ||
    isLoadingCourses ||
    isLoadingModules;

  // ── Gamification data extraction ──
  const totalPoints = gamification?.totalPoints ?? 0;
  const streakCurrent = gamification?.streak?.current ?? 0;
  const earnedBadgeNames = useMemo(
    () => gamification?.badges?.map((b) => b.name) ?? [],
    [gamification?.badges]
  );

  return (
    <div className="space-y-xl pb-lg">
      {/* ── Section 1: Gamification Header ── */}
      <section>
        {isLoadingGamification ? (
          <GamificationSkeleton />
        ) : (
          <GamificationHeader
            totalPoints={totalPoints}
            streakCurrent={streakCurrent}
            earnedBadgeNames={earnedBadgeNames}
          />
        )}
      </section>

      {/* ── Section 2: Today's Sessions (conditional) ── */}
      {isLoadingSessions ? (
        <section>
          <h2 className="text-h3 font-semibold text-text-primary">
            Loading sessions...
          </h2>
          <div className="mt-md space-y-md">
            <SessionSkeletonCard />
          </div>
        </section>
      ) : todaySessions.length > 0 ? (
        <section>
          <h2 className="text-h3 font-semibold text-text-primary">
            You have a session to attend today!
          </h2>
          <div className="mt-md space-y-md">
            {todaySessions.map((session) => (
              <SessionAttendanceCard
                key={session._id}
                session={session}
                userId={user?.id ?? ''}
              />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Section 3: Continue Learning / Today's Task ── */}
      <section>
        <h2 className="text-h2 font-semibold text-text-primary">
          {hasInProgressCourse ? 'Continue Learning' : "Today's Task"}
        </h2>

        {isLoading ? (
          <div className="mt-md space-y-md">
            <CourseSkeletonCard />
            <CourseSkeletonCard />
          </div>
        ) : learningCourses.length > 0 ? (
          <div className="mt-md space-y-md">
            {learningCourses.map((c) => (
              <CourseLearningCard
                key={c._id}
                course={c}
                modules={courseModulesMap.get(c._id) ?? []}
                progressMap={progressMap}
              />
            ))}
          </div>
        ) : (
          <div className="mt-md flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
            <BookOpen className="h-12 w-12 text-text-disabled" />
            <p className="mt-md text-body-lg font-medium text-text-secondary">
              No courses assigned yet
            </p>
            <p className="mt-xs text-body-md text-text-disabled">
              Your assigned courses will appear here
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
