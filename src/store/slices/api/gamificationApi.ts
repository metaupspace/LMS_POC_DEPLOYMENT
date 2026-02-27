import { baseApi } from './baseApi';
import type { BadgeTier, ApiResponse } from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface BadgeData {
  name: BadgeTier;
  threshold: number;
  earnedAt: string;
  icon: string;
}

export interface StreakData {
  current: number;
  longest: number;
  lastActivityDate: string;
}

export interface GamificationData {
  _id: string;
  user: string;
  totalPoints: number;
  badges: BadgeData[];
  streak: StreakData;
  createdAt: string;
  updatedAt: string;
}

// ─── API Slice ──────────────────────────────────────────

export const gamificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUserGamification: builder.query<ApiResponse<GamificationData>, string>({
      query: (userId) => `/gamification/${userId}`,
      providesTags: (_result, _error, userId) => [
        { type: 'Gamification', id: `USER_${userId}` },
        { type: 'Gamification', id: 'LIST' },
      ],
    }),

    updateStreak: builder.mutation<ApiResponse<GamificationData>, void>({
      query: () => ({
        url: '/gamification/streak',
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Gamification', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetUserGamificationQuery,
  useUpdateStreakMutation,
} = gamificationApi;
