import { baseApi } from './baseApi';
import type {
  LearnerProgressStatus,
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface QuizAttemptData {
  score: number;
  passed: boolean;
  answers: { questionIndex: number; selectedOption: number }[];
  attemptedAt: string;
}

export interface ProgressData {
  _id: string;
  user: string;
  course: string;
  module: string;
  status: LearnerProgressStatus;
  completedContents: number[];
  videoCompleted: boolean;
  videoPoints: number;
  quizAttempts: QuizAttemptData[];
  quizPassed: boolean;
  quizPoints: number;
  proofOfWorkPoints: number;
  totalModulePoints: number;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetProgressParams {
  page?: number;
  limit?: number;
  course?: string;
  module?: string;
  status?: LearnerProgressStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── API Slice ──────────────────────────────────────────

export const progressApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProgress: builder.query<PaginatedResponse<ProgressData> & { pagination: PaginationMeta }, GetProgressParams>({
      query: (params) => ({
        url: '/progress',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Progress' as const, id: _id })),
              { type: 'Progress', id: 'LIST' },
            ]
          : [{ type: 'Progress', id: 'LIST' }],
    }),

    getUserProgress: builder.query<ApiResponse<ProgressData[]>, string>({
      query: (userId) => `/progress/${userId}`,
      providesTags: (_result, _error, userId) => [
        { type: 'Progress', id: `USER_${userId}` },
        { type: 'Progress', id: 'LIST' },
      ],
    }),

    updateProgress: builder.mutation<ApiResponse<ProgressData>, { moduleId: string; contentIndex: number }>({
      query: (body) => ({
        url: '/progress',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: [
        { type: 'Progress', id: 'LIST' },
        { type: 'Gamification', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProgressQuery,
  useGetUserProgressQuery,
  useUpdateProgressMutation,
} = progressApi;
