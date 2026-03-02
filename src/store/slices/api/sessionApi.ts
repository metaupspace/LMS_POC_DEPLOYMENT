import { baseApi } from './baseApi';
import type {
  SessionStatus,
  AttendanceStatus,
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface PopulatedUser {
  _id: string;
  name: string;
  empId: string;
  email?: string;
}

export interface AttendanceRecordData {
  staff: string | PopulatedUser;
  markedAt: string;
  status: AttendanceStatus;
}

export interface SessionData {
  _id: string;
  title: string;
  description: string;
  domain: string;
  location: string;
  date: string;
  timeSlot: string;
  duration: number;
  mode: 'offline' | 'online';
  meetingLink: string;
  thumbnail: string;
  instructor: string | PopulatedUser | null;
  enrolledStaff: (string | PopulatedUser)[];
  attendanceCode: string;
  attendanceCodeExpiresAt: string;
  attendance: AttendanceRecordData[];
  status: SessionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetSessionsParams {
  page?: number;
  limit?: number;
  search?: string;
  domain?: string;
  status?: SessionStatus;
  instructor?: string;
  date?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateSessionBody {
  title: string;
  description: string;
  domain: string;
  location: string;
  date: string;
  timeSlot: string;
  duration: number;
  mode?: 'offline' | 'online';
  meetingLink?: string;
  thumbnail?: string;
  instructor?: string;
  enrolledStaff?: string[];
}

export interface UpdateSessionBody {
  title?: string;
  description?: string;
  domain?: string;
  location?: string;
  date?: string;
  timeSlot?: string;
  duration?: number;
  mode?: 'offline' | 'online';
  meetingLink?: string;
  thumbnail?: string;
  instructor?: string;
  enrolledStaff?: string[];
  status?: SessionStatus;
}

export interface MarkAttendanceBody {
  attendanceCode: string;
}

export interface AttendanceCodeResponse {
  attendanceCode: string;
  expiresAt: string;
}

// ─── API Slice ──────────────────────────────────────────

export const sessionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSessions: builder.query<PaginatedResponse<SessionData> & { pagination: PaginationMeta }, GetSessionsParams>({
      query: (params) => ({
        url: '/sessions',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Session' as const, id: _id })),
              { type: 'Session', id: 'LIST' },
            ]
          : [{ type: 'Session', id: 'LIST' }],
    }),

    getSessionById: builder.query<ApiResponse<SessionData>, string>({
      query: (id) => `/sessions/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Session', id }],
    }),

    createSession: builder.mutation<ApiResponse<SessionData>, CreateSessionBody>({
      query: (body) => ({
        url: '/sessions',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Session', id: 'LIST' }],
    }),

    updateSession: builder.mutation<ApiResponse<SessionData>, { id: string; body: UpdateSessionBody }>({
      query: ({ id, body }) => ({
        url: `/sessions/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Session', id },
        { type: 'Session', id: 'LIST' },
      ],
    }),

    deleteSession: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/sessions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Session', id },
        { type: 'Session', id: 'LIST' },
      ],
    }),

    generateAttendanceCode: builder.mutation<ApiResponse<AttendanceCodeResponse>, string>({
      query: (id) => ({
        url: `/sessions/${id}/attendance-code`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Session', id }],
    }),

    markAttendance: builder.mutation<ApiResponse<SessionData>, { id: string; body: MarkAttendanceBody }>({
      query: ({ id, body }) => ({
        url: `/sessions/${id}/mark-attendance`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Session', id }],
    }),
  }),
});

export const {
  useGetSessionsQuery,
  useGetSessionByIdQuery,
  useCreateSessionMutation,
  useUpdateSessionMutation,
  useDeleteSessionMutation,
  useGenerateAttendanceCodeMutation,
  useMarkAttendanceMutation,
} = sessionApi;
