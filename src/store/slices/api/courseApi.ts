import { baseApi } from './baseApi';
import type {
  CourseStatus,
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface PopulatedStaff {
  _id: string;
  name: string;
  empId: string;
  email?: string;
}

export interface CourseData {
  _id: string;
  title: string;
  description: string;
  domain: string;
  thumbnail: string;
  status: CourseStatus;
  coach: string;
  assignedStaff: (string | PopulatedStaff)[];
  modules: string[];
  proofOfWorkEnabled: boolean;
  proofOfWorkInstructions: string;
  proofOfWorkMandatory: boolean;
  passingThreshold: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestionData {
  questionText: string;
  questionImage?: string;
  options: { text: string; image?: string; isCorrect: boolean }[];
  points: number;
}

export interface QuizData {
  _id: string;
  questions: QuizQuestionData[];
  passingScore: number;
  maxAttempts: number;
}

export interface ModuleData {
  _id: string;
  title: string;
  description: string;
  course: string;
  order: number;
  contents: {
    type: string;
    title: string;
    data: string;
    duration: number;
    downloadable: boolean;
  }[];
  quiz: QuizData | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  domain?: string;
  status?: CourseStatus;
  coach?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCourseBody {
  title: string;
  description: string;
  domain: string;
  thumbnail?: string;
  coach?: string;
  proofOfWorkEnabled?: boolean;
  proofOfWorkInstructions?: string;
  proofOfWorkMandatory?: boolean;
  passingThreshold?: number;
  status?: 'draft' | 'active';
}

export interface UpdateCourseBody {
  title?: string;
  description?: string;
  domain?: string;
  thumbnail?: string;
  status?: CourseStatus;
  coach?: string;
  proofOfWorkEnabled?: boolean;
  proofOfWorkInstructions?: string;
  proofOfWorkMandatory?: boolean;
  passingThreshold?: number;
}

export interface AssignCourseBody {
  staffIds: string[];
}

// ─── API Slice ──────────────────────────────────────────

export const courseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCourses: builder.query<PaginatedResponse<CourseData> & { pagination: PaginationMeta }, GetCoursesParams>({
      query: (params) => ({
        url: '/courses',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Course' as const, id: _id })),
              { type: 'Course', id: 'LIST' },
            ]
          : [{ type: 'Course', id: 'LIST' }],
    }),

    getCourseById: builder.query<ApiResponse<CourseData>, string>({
      query: (id) => `/courses/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Course', id }],
    }),

    createCourse: builder.mutation<ApiResponse<CourseData>, CreateCourseBody>({
      query: (body) => ({
        url: '/courses',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Course', id: 'LIST' }],
    }),

    updateCourse: builder.mutation<ApiResponse<CourseData>, { id: string; body: UpdateCourseBody }>({
      query: ({ id, body }) => ({
        url: `/courses/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Course', id },
        { type: 'Course', id: 'LIST' },
      ],
    }),

    deleteCourse: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/courses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Course', id },
        { type: 'Course', id: 'LIST' },
      ],
    }),

    assignCourse: builder.mutation<ApiResponse<CourseData>, { id: string; body: AssignCourseBody }>({
      query: ({ id, body }) => ({
        url: `/courses/${id}/assign`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Course', id },
        { type: 'Course', id: 'LIST' },
      ],
    }),

    getCourseModules: builder.query<ApiResponse<ModuleData[]>, string>({
      query: (courseId) => `/courses/${courseId}/modules`,
      providesTags: (_result, _error, courseId) => [
        { type: 'Module', id: `COURSE_${courseId}` },
      ],
    }),
  }),
});

export const {
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useAssignCourseMutation,
  useGetCourseModulesQuery,
} = courseApi;
