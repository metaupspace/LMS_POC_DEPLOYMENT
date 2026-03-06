import { baseApi } from './baseApi';

// ─── Types ──────────────────────────────────────────────

export interface LearnerProgressReportParams {
  courseId?: string;
  userId?: string;
  status?: string;
  format?: 'json' | 'excel' | 'pdf';
}

export interface SessionAttendanceReportParams {
  sessionId?: string;
  instructor?: string;
  domain?: string;
  dateFrom?: string;
  dateTo?: string;
  format?: 'json' | 'excel' | 'pdf';
}

// ─── API Slice ──────────────────────────────────────────

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    generateLearnerProgressReport: builder.query<Blob | Record<string, unknown>, LearnerProgressReportParams>({
      query: (params) => ({
        url: '/reports/learner-progress',
        params,
        responseHandler: (response) => {
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            return response.json();
          }
          return response.blob();
        },
      }),
    }),

    generateSessionAttendanceReport: builder.query<Blob | Record<string, unknown>, SessionAttendanceReportParams>({
      query: (params) => ({
        url: '/reports/session-attendance',
        params,
        responseHandler: (response) => {
          const contentType = response.headers.get('content-type') ?? '';
          if (contentType.includes('application/json')) {
            return response.json();
          }
          return response.blob();
        },
      }),
    }),
  }),
});

export const {
  useLazyGenerateLearnerProgressReportQuery,
  useLazyGenerateSessionAttendanceReportQuery,
} = reportApi;
