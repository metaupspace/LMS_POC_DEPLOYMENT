import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types';

export interface RecentAttempt {
  _id: string;
  score: number;
  passed: boolean;
  totalViolations: number;
  submittedAt: string;
  user: { _id: string; name: string; empId: string } | null;
  test: { _id: string; title: string; certificationTitle: string } | null;
}

export interface DashboardStats {
  activeManagers: number;
  activeCoaches: number;
  activeStaff: number;
  activeCourses: number;
  upcomingSessions: number;
  tests: {
    total: number;
    active: number;
    totalAttempts: number;
    totalCertifications: number;
    passRate: number;
    recentAttempts: RecentAttempt[];
  };
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<ApiResponse<DashboardStats>, void>({
      query: () => '/dashboard/stats',
      providesTags: ['User', 'Course', 'Session', 'Test', 'Certification'],
    }),
  }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;
