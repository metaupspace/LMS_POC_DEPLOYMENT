import { useMemo, useRef, useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  useGetUserGamificationQuery,
  useUpdateStreakMutation,
} from '@/store/slices/api/gamificationApi';
import { useGetTestsQuery, type TestData } from '@/store/slices/api/testApi';
import {
  useGetSessionsQuery,
  // type SessionData,
} from '@/store/slices/api/sessionApi';
import { useGetProgressQuery, type ProgressData } from '@/store/slices/api/progressApi';
import { useGetCoursesQuery, type CourseData } from '@/store/slices/api/courseApi';
import { useGetModulesQuery, type ModuleData } from '@/store/slices/api/moduleApi';
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

function getCourseDuration(modules: ModuleData[]): number {
  return modules.reduce(
    (acc, mod) => acc + mod.contents.reduce((s, c) => s + (c.duration || 0), 0),
    0
  );
}

// ─── Hook ──────────────────────────────────────────────────

export function useLearnerHomeData() {
  const user = useAppSelector((s) => s.auth.user);
  const streakUpdatedRef = useRef(false);

  // ── Queries ──
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

  const { data: testsResponse } = useGetTestsQuery(
    { status: 'active', limit: 10 },
    { skip: !user?.id }
  );

  // ── Update streak on mount ──
  const [updateStreak] = useUpdateStreakMutation();

  useEffect(() => {
    if (user?.id && !streakUpdatedRef.current) {
      streakUpdatedRef.current = true;
      updateStreak().catch(() => {});
    }
  }, [user?.id, updateStreak]);

  // Auto-refresh every 60s
  useAutoRefreshTick();

  // ── Derived data ──
  const gamification = useMemo(
    () => gamificationResponse?.data ?? null,
    [gamificationResponse]
  );

  const sessions = useMemo(() => sessionsResponse?.data ?? [], [sessionsResponse]);
  const progressList = useMemo(() => progressResponse?.data ?? [], [progressResponse]);
  const courses = useMemo(() => coursesResponse?.data ?? [], [coursesResponse]);
  const modules = useMemo(() => modulesResponse?.data ?? [], [modulesResponse]);

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

        const attended = s.attendance.some(
          (a) => ((typeof a.staff === 'string' ? a.staff : a.staff._id) === user.id) && a.status === 'present'
        );
        if (attended) return false;

        const ds = getDisplayStatus(s);
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

  // Assigned courses
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

  // Assigned tests — filter out certified and exhausted
  const assignedTests = useMemo(() => {
    const allTests = (testsResponse?.data ?? []) as TestData[];
    return allTests.filter((test) => {
      if (test.myCertification) return false;
      if (test.myAttempts) {
        const gradedAttempts = test.myAttempts.filter((a) => a.status === 'graded').length;
        if (gradedAttempts >= test.maxAttempts) return false;
      }
      return true;
    });
  }, [testsResponse]);

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
      if (allCompleted) continue;

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

  // Gamification data
  const totalPoints = gamification?.totalPoints ?? 0;
  const streakCurrent = gamification?.streak?.current ?? 0;
  const earnedBadgeNames = useMemo(
    () => gamification?.badges?.map((b) => b.name) ?? [],
    [gamification?.badges]
  );

  return {
    user,
    isLoading: {
      gamification: isLoadingGamification,
      sessions: isLoadingSessions,
      courses: isLoadingCourses || isLoadingProgress || isLoadingModules,
      all: isLoadingGamification || isLoadingSessions || isLoadingProgress || isLoadingCourses || isLoadingModules,
    },
    totalPoints,
    streakCurrent,
    earnedBadgeNames,
    todaySessions,
    assignedTests,
    learningCourses,
    hasInProgressCourse,
    courseModulesMap,
    progressMap,
    getCourseDuration,
  };
}
