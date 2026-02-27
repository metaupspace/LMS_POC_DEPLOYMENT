import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types';

export interface DashboardStats {
  activeManagers: number;
  activeCoaches: number;
  activeStaff: number;
  activeCourses: number;
  upcomingSessions: number;
}

export const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query<ApiResponse<DashboardStats>, void>({
      query: () => '/dashboard/stats',
      providesTags: ['User', 'Course', 'Session'],
    }),
  }),
});

export const { useGetDashboardStatsQuery } = dashboardApi;
