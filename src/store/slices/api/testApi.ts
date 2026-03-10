import { baseApi } from './baseApi';
import type { ApiResponse, PaginatedResponse } from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface TestQuestionOption {
  text: string;
  image?: string;
  isCorrect?: boolean;
}

export interface TestQuestion {
  questionText: string;
  questionImage?: string;
  options: TestQuestionOption[];
  points: number;
  index?: number;
}

export interface TestData {
  _id: string;
  id?: string;
  title: string;
  description: string;
  domain: string;
  certificationTitle: string;
  questions: TestQuestion[];
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  assignedStaff: Array<{
    _id: string;
    name: string;
    empId: string;
    email: string;
    domain?: string;
  }>;
  status: 'draft' | 'active' | 'archived';
  createdBy?: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
  // Staff-specific fields
  myAttempts?: AttemptData[];
  myCertification?: CertificationData | null;
  myStatus?: 'available' | 'attempted' | 'certified' | 'exhausted';
  myAttemptCount?: number;
  myBestScore?: number | null;
}

export interface AttemptData {
  _id: string;
  id?: string;
  user: string;
  test: string;
  answers: Array<{ questionIndex: number; selectedOption: number }>;
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  pointsEarned: number;
  totalPoints: number;
  violations: Array<{
    type: string;
    timestamp: string;
    details: string;
  }>;
  totalViolations: number;
  startedAt: string;
  submittedAt: string | null;
  timeSpentSeconds: number;
  wasOfflineSync: boolean;
  status: string;
  attemptNumber: number;
}

export interface CertificationData {
  _id: string;
  id?: string;
  user: string;
  test: string | { _id: string; title: string; domain?: string };
  title: string;
  earnedAt: string;
  score: number;
}

export interface StartTestResponse {
  attemptId: string;
  questions: TestQuestion[];
  answers: Array<{ questionIndex: number; selectedOption: number }>;
  timeLimitMinutes: number;
  startedAt: string;
  resuming: boolean;
}

export interface SubmitTestResponse {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  passingScore: number;
  pointsEarned: number;
  totalPoints: number;
  certification: { title: string; earnedAt: string } | null;
  attemptNumber: number;
  maxAttempts: number;
  attemptsRemaining: number;
  totalViolations: number;
}

interface GetTestsParams {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
  includeCompleted?: boolean;
}

interface CreateTestBody {
  title: string;
  description?: string;
  domain?: string;
  certificationTitle: string;
  questions: Array<{
    questionText: string;
    questionImage?: string;
    options: Array<{ text: string; image?: string; isCorrect: boolean }>;
    points?: number;
  }>;
  passingScore?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  status?: string;
}

interface SubmitTestBody {
  testId: string;
  attemptId: string;
  answers: Array<{ questionIndex: number; selectedOption: number }>;
  violations?: Array<{ type: string; details?: string; timestamp?: string }>;
  timeSpentSeconds?: number;
  wasOfflineSync?: boolean;
}

// ─── API Slice ──────────────────────────────────────────

export const testApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Admin/Manager — List tests
    getTests: builder.query<
      PaginatedResponse<TestData>,
      GetTestsParams | void
    >({
      query: (params) => ({
        url: '/tests',
        params: params || {},
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({
                type: 'Test' as const,
                id: _id,
              })),
              { type: 'Test', id: 'LIST' },
            ]
          : [{ type: 'Test', id: 'LIST' }],
    }),

    // Get single test
    getTestById: builder.query<ApiResponse<TestData>, string>({
      query: (id) => `/tests/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Test', id }],
    }),

    // Create test
    createTest: builder.mutation<ApiResponse<TestData>, CreateTestBody>({
      query: (body) => ({ url: '/tests', method: 'POST', body }),
      invalidatesTags: [{ type: 'Test', id: 'LIST' }],
    }),

    // Update test
    updateTest: builder.mutation<
      ApiResponse<TestData>,
      { id: string; body: Partial<CreateTestBody> }
    >({
      query: ({ id, body }) => ({
        url: `/tests/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Test', id },
        { type: 'Test', id: 'LIST' },
      ],
    }),

    // Delete test
    deleteTest: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({ url: `/tests/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Test', id: 'LIST' }],
    }),

    // Assign staff to test
    assignTestStaff: builder.mutation<
      ApiResponse<TestData>,
      { testId: string; staffIds: string[] }
    >({
      query: ({ testId, staffIds }) => ({
        url: `/tests/${testId}/assign`,
        method: 'POST',
        body: { staffIds },
      }),
      invalidatesTags: (_result, _error, { testId }) => [
        { type: 'Test', id: testId },
        { type: 'Test', id: 'LIST' },
      ],
    }),

    // Staff — Start test
    startTest: builder.mutation<ApiResponse<StartTestResponse>, string>({
      query: (testId) => ({
        url: `/tests/${testId}/start`,
        method: 'POST',
      }),
    }),

    // Staff — Submit test
    submitTest: builder.mutation<ApiResponse<SubmitTestResponse>, SubmitTestBody>(
      {
        query: ({ testId, ...body }) => ({
          url: `/tests/${testId}/submit`,
          method: 'POST',
          body,
        }),
        invalidatesTags: [
          { type: 'Test', id: 'LIST' },
          { type: 'Certification', id: 'LIST' },
          'Gamification',
        ],
      }
    ),

    // Staff — Report violation
    reportViolation: builder.mutation<
      ApiResponse<null>,
      { testId: string; attemptId: string; type: string; details?: string }
    >({
      query: ({ testId, ...body }) => ({
        url: `/tests/${testId}/violation`,
        method: 'POST',
        body,
      }),
    }),

    // Get certifications
    getCertifications: builder.query<
      ApiResponse<CertificationData[]>,
      string | void
    >({
      query: (userId) =>
        `/certifications${userId ? `?userId=${userId}` : ''}`,
      providesTags: [{ type: 'Certification', id: 'LIST' }],
    }),
  }),
});

export const {
  useGetTestsQuery,
  useGetTestByIdQuery,
  useCreateTestMutation,
  useUpdateTestMutation,
  useDeleteTestMutation,
  useAssignTestStaffMutation,
  useStartTestMutation,
  useSubmitTestMutation,
  useReportViolationMutation,
  useGetCertificationsQuery,
} = testApi;
