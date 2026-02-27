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

function getModuleDuration(mod: ModuleData): number {
  return mod.contents.reduce((acc, c) => acc + (c.duration || 0), 0);
}

function getModuleQuestionCount(mod: ModuleData): number {
  // If quiz exists, we show a question indicator; count contents for now
  return mod.quiz ? 1 : 0;
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

function ModuleSkeletonCard() {
  return (
    <div className="rounded-md bg-surface-white shadow-sm overflow-hidden animate-pulse">
      <div className="h-[200px] w-full bg-border-light" />
      <div className="p-lg space-y-md">
        <div className="h-3 w-20 rounded-full bg-border-light" />
        <div className="h-4 w-1/2 rounded-sm bg-border-light" />
        <div className="h-5 w-3/4 rounded-sm bg-border-light" />
        <div className="h-4 w-full rounded-sm bg-border-light" />
        <div className="h-3 w-full rounded-sm bg-border-light" />
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
    () => session.attendance.find((a) => a.staff === userId),
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
          message: 'Attendance Marked!',
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
      </div>

      {/* Content */}
      <div className="p-lg">
        {/* Title */}
        <h3 className="text-h3 font-semibold text-text-primary line-clamp-2">
          {session.title}
        </h3>

        {/* Location + Time */}
        <div className="mt-sm flex items-center gap-xs text-body-md text-text-secondary">
          <MapPin className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">
            {session.location} &mdash; {session.timeSlot}
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

// ─── Module Learning Card ──────────────────────────────────

interface ModuleLearningCardProps {
  module: ModuleData;
  course: CourseData | undefined;
  progress: ProgressData | undefined;
}

function ModuleLearningCard({ module, course, progress }: ModuleLearningCardProps) {
  const router = useRouter();
  const isInProgress = progress?.status === 'in_progress';
  const duration = getModuleDuration(module);
  const hasQuiz = getModuleQuestionCount(module) > 0;

  return (
    <Card noPadding className="overflow-hidden">
      {/* Thumbnail with Play overlay */}
      <button
        type="button"
        className="relative h-[200px] w-full bg-surface-background block"
        onClick={() => router.push(`/learner/learning/module/${module._id}`)}
        aria-label={`Play ${module.title}`}
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
        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-md">
            <Play className="h-6 w-6 text-primary-main ml-[2px]" fill="currentColor" />
          </div>
        </div>
      </button>

      {/* Content */}
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

        {/* Start / Continue button */}
        <Button
          variant="primary"
          size="lg"
          isBlock
          leftIcon={<Play className="h-4 w-4" fill="currentColor" />}
          onClick={() => router.push(`/learner/learning/module/${module._id}`)}
          className="mt-md min-h-[48px]"
        >
          {isInProgress ? 'Continue' : 'Start'}
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

  // Today's sessions: filter for sessions today where user is enrolled
  const todaySessions = useMemo(
    () =>
      sessions.filter(
        (s) => isSameDay(s.date, today) && user?.id && s.enrolledStaff.includes(user.id)
      ),
    [sessions, today, user?.id]
  );

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

  // Learning modules: in-progress first, then not-started
  // Only show modules from courses where user is assigned
  const learningModules = useMemo(() => {
    // Get course IDs where user is assigned
    const assignedCourseIds = new Set(
      courses
        .filter((c) => user?.id && c.assignedStaff.some((s) => (typeof s === 'string' ? s : s._id) === user.id))
        .map((c) => c._id)
    );

    // Get all modules from assigned courses
    const assignedModules = modules.filter((m) => assignedCourseIds.has(m.course));

    // Separate into in-progress and not-started
    const inProgress: ModuleData[] = [];
    const notStarted: ModuleData[] = [];

    for (const mod of assignedModules) {
      const progress = progressMap.get(mod._id);
      if (progress?.status === 'in_progress') {
        inProgress.push(mod);
      } else if (!progress || progress.status === 'not_started') {
        notStarted.push(mod);
      }
      // completed modules are not shown
    }

    return [...inProgress, ...notStarted];
  }, [modules, courses, user?.id, progressMap]);

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
          {learningModules.some((m) => progressMap.get(m._id)?.status === 'in_progress')
            ? 'Continue Learning'
            : "Today's Task"}
        </h2>

        {isLoading ? (
          <div className="mt-md space-y-md">
            <ModuleSkeletonCard />
            <ModuleSkeletonCard />
          </div>
        ) : learningModules.length > 0 ? (
          <div className="mt-md space-y-md">
            {learningModules.map((mod) => (
              <ModuleLearningCard
                key={mod._id}
                module={mod}
                course={courseMap.get(mod.course)}
                progress={progressMap.get(mod._id)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-md flex flex-col items-center justify-center rounded-md bg-surface-white py-2xl px-lg text-center shadow-sm">
            <BookOpen className="h-12 w-12 text-text-disabled" />
            <p className="mt-md text-body-lg font-medium text-text-secondary">
              No tasks assigned yet
            </p>
            <p className="mt-xs text-body-md text-text-disabled">
              Your assigned courses and modules will appear here
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
