import { baseApi } from './baseApi';
import type { ApiResponse, PaginatedResponse, PaginationMeta } from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface QuizOptionData {
  text: string;
  image: string;
  isCorrect: boolean;
}

export interface QuizQuestionData {
  questionText: string;
  questionImage: string;
  options: QuizOptionData[];
  points: number;
}

export interface QuizData {
  _id: string;
  module: string;
  questions: QuizQuestionData[];
  passingScore: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface GetQuizzesParams {
  page?: number;
  limit?: number;
  module?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateQuizBody {
  module: string;
  questions: QuizQuestionData[];
  passingScore: number;
  maxAttempts?: number;
}

export interface UpdateQuizBody {
  questions?: QuizQuestionData[];
  passingScore?: number;
  maxAttempts?: number;
}

export interface AttemptQuizBody {
  answers: { questionIndex: number; selectedOption: number }[];
}

export interface QuizAttemptResult {
  score: number;
  passed: boolean;
  attemptsRemaining: number;
  pointsEarned: number;
  correctCount: number;
  totalQuestions: number;
  attemptNumber: number;
  maxAttempts: number;
}

// ─── API Slice ──────────────────────────────────────────

export const quizApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getQuizzes: builder.query<PaginatedResponse<QuizData> & { pagination: PaginationMeta }, GetQuizzesParams>({
      query: (params) => ({
        url: '/quizzes',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Quiz' as const, id: _id })),
              { type: 'Quiz', id: 'LIST' },
            ]
          : [{ type: 'Quiz', id: 'LIST' }],
    }),

    getQuizById: builder.query<ApiResponse<QuizData>, string>({
      query: (id) => `/quizzes/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Quiz', id }],
    }),

    createQuiz: builder.mutation<ApiResponse<QuizData>, CreateQuizBody>({
      query: (body) => ({
        url: '/quizzes',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { module }) => [
        { type: 'Quiz', id: 'LIST' },
        { type: 'Module', id: module },
      ],
    }),

    updateQuiz: builder.mutation<ApiResponse<QuizData>, { id: string; body: UpdateQuizBody }>({
      query: ({ id, body }) => ({
        url: `/quizzes/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quiz', id },
        { type: 'Quiz', id: 'LIST' },
      ],
    }),

    deleteQuiz: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/quizzes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Quiz', id },
        { type: 'Quiz', id: 'LIST' },
      ],
    }),

    attemptQuiz: builder.mutation<ApiResponse<QuizAttemptResult>, { id: string; body: AttemptQuizBody }>({
      query: ({ id, body }) => ({
        url: `/quizzes/${id}/attempt`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Quiz', id },
        { type: 'Progress', id: 'LIST' },
        { type: 'Gamification', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetQuizzesQuery,
  useGetQuizByIdQuery,
  useCreateQuizMutation,
  useUpdateQuizMutation,
  useDeleteQuizMutation,
  useAttemptQuizMutation,
} = quizApi;
