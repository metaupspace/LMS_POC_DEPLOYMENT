import { useState, useMemo } from 'react';
import { useAutoRefreshTick } from '@/hooks/useSessionStatus';
import { useAppSelector } from '@/store/hooks';
import type { AuthUser } from '@/store/slices/authSlice';
import {
  useGetSessionsQuery,
  type SessionData,
} from '@/store/slices/api/sessionApi';
import { useGetProgressQuery, type ProgressData } from '@/store/slices/api/progressApi';
import { useGetCoursesQuery, type CourseData } from '@/store/slices/api/courseApi';
import { useGetModulesQuery, type ModuleData } from '@/store/slices/api/moduleApi';
import { useGetTestsQuery, useGetCertificationsQuery, type TestData, type CertificationData } from '@/store/slices/api/testApi';

// ─── Types ──────────────────────────────────────────────────

export type TabKey = 'ongoing' | 'assigned' | 'completed' | 'sessions';

export interface TabDef {
  key: TabKey;
  label: string;
}

export const TABS: TabDef[] = [
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'completed', label: 'Completed' },
  { key: 'sessions', label: 'Sessions' },
];

export type CourseCategory = 'ongoing' | 'assigned' | 'completed';

// ─── Helpers ────────────────────────────────────────────────

export function isSameDay(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
}

export function isPastDate(dateStr: string, reference: Date): boolean {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const ref = new Date(reference);
  ref.setHours(0, 0, 0, 0);
  return d < ref;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function categorizeCourse(
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

// ─── Hook ───────────────────────────────────────────────────

export interface LearnerLearningData {
  // Auth
  user: AuthUser | null;

  // Tab state
  activeTab: TabKey;
  setActiveTab: (_tab: TabKey) => void;

  // Loading
  isLoading: boolean;

  // Today reference
  today: Date;

  // Progress map
  progressMap: Map<string, ProgressData>;

  // Course data
  courseModulesMap: Map<string, ModuleData[]>;
  ongoingCourses: CourseData[];
  assignedNotStarted: CourseData[];
  completedCourses: CourseData[];

  // Session data
  userSessions: SessionData[];
  upcomingSessions: SessionData[];
  pastSessions: SessionData[];

  // Test / Certification data
  allTests: TestData[];
  certMap: Map<string, CertificationData>;
  certifiedTests: TestData[];
  pendingTests: TestData[];
  exhaustedTests: TestData[];

  // Tab counts
  tabCounts: Record<TabKey, number>;
}

export function useLearnerLearningData(): LearnerLearningData {
  const user = useAppSelector((s) => s.auth.user);
  const [activeTab, setActiveTab] = useState<TabKey>('ongoing');

  // Auto-refresh every 60s so session status badges update live
  useAutoRefreshTick();

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

  const { data: allTestsResponse } = useGetTestsQuery(
    { includeCompleted: true },
    { skip: !user?.id }
  );

  const { data: certsResponse } = useGetCertificationsQuery(
    undefined,
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

  // ── Certification tests ──
  const allTests = useMemo(
    () => (allTestsResponse?.data ?? []) as TestData[],
    [allTestsResponse]
  );

  const certifications = useMemo(
    () => (certsResponse?.data ?? []) as CertificationData[],
    [certsResponse]
  );

  const certMap = useMemo(() => {
    const map = new Map<string, CertificationData>();
    for (const c of certifications) {
      const testId = (typeof c.test === 'object' ? c.test._id : c.test)?.toString();
      if (testId) map.set(testId, c);
    }
    return map;
  }, [certifications]);

  const certifiedTests = useMemo(
    () => allTests.filter((t) => t.myStatus === 'certified' || certMap.has(t._id)),
    [allTests, certMap]
  );

  const exhaustedTests = useMemo(
    () =>
      allTests.filter((t) => {
        if (t.myStatus === 'certified' || certMap.has(t._id)) return false;
        if (t.myStatus === 'exhausted') return true;
        const attempts = t.myAttemptCount ?? t.myAttempts?.filter((a) => a.status === 'graded').length ?? 0;
        return attempts >= t.maxAttempts;
      }),
    [allTests, certMap]
  );

  const pendingTests = useMemo(
    () =>
      allTests.filter((t) => {
        if (t.myStatus === 'certified' || certMap.has(t._id)) return false;
        if (t.myStatus === 'exhausted') return false;
        const attempts = t.myAttemptCount ?? t.myAttempts?.filter((a) => a.status === 'graded').length ?? 0;
        return attempts < t.maxAttempts;
      }),
    [allTests, certMap]
  );

  // ── Tab counts ──
  const tabCounts: Record<TabKey, number> = useMemo(() => ({
    ongoing: ongoingCourses.length,
    assigned: assignedNotStarted.length,
    completed: completedCourses.length,
    sessions: userSessions.length,
  }), [ongoingCourses.length, assignedNotStarted.length, completedCourses.length, userSessions.length]);

  // ── Loading ──
  const isLoading = isLoadingSessions || isLoadingProgress || isLoadingCourses || isLoadingModules;

  return {
    user,
    activeTab,
    setActiveTab,
    isLoading,
    today,
    progressMap,
    courseModulesMap,
    ongoingCourses,
    assignedNotStarted,
    completedCourses,
    userSessions,
    upcomingSessions,
    pastSessions,
    allTests,
    certMap,
    certifiedTests,
    pendingTests,
    exhaustedTests,
    tabCounts,
  };
}
