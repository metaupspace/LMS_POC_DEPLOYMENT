import { baseApi } from './baseApi';
import type { ApiResponse, PaginatedResponse, PaginationMeta } from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface ModuleContentData {
  type: 'video' | 'text';
  title: string;
  data: string;
  duration: number;
  downloadable: boolean;
}

// When quiz is populated by the API, it's a full object; otherwise it's just an ObjectId string
export interface PopulatedQuiz {
  _id: string;
  module: string;
  questions: {
    questionText: string;
    questionImage?: string;
    options: { text: string; image?: string; isCorrect?: boolean }[];
    points: number;
  }[];
  passingScore: number;
  maxAttempts: number;
}

export interface ModuleData {
  _id: string;
  title: string;
  description: string;
  course: string;
  order: number;
  contents: ModuleContentData[];
  quiz: string | PopulatedQuiz | null;
  createdAt: string;
  updatedAt: string;
}

/** Extract quiz ObjectId string regardless of whether quiz is populated or not */
export function getQuizId(quiz: ModuleData['quiz']): string | null {
  if (!quiz) return null;
  if (typeof quiz === 'string') return quiz;
  return quiz._id ?? null;
}

export interface GetModulesParams {
  page?: number;
  limit?: number;
  course?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateModuleBody {
  title: string;
  description: string;
  courseId: string;
  order?: number;
  contents?: ModuleContentData[];
}

export interface UpdateModuleBody {
  title?: string;
  description?: string;
  order?: number;
  contents?: ModuleContentData[];
}

// ─── API Slice ──────────────────────────────────────────

export const moduleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getModules: builder.query<PaginatedResponse<ModuleData> & { pagination: PaginationMeta }, GetModulesParams>({
      query: (params) => ({
        url: '/modules',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Module' as const, id: _id })),
              { type: 'Module', id: 'LIST' },
            ]
          : [{ type: 'Module', id: 'LIST' }],
    }),

    getModuleById: builder.query<ApiResponse<ModuleData>, string>({
      query: (id) => `/modules/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Module', id }],
    }),

    createModule: builder.mutation<ApiResponse<ModuleData>, CreateModuleBody>({
      query: (body) => ({
        url: '/modules',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { courseId }) => [
        { type: 'Module', id: 'LIST' },
        { type: 'Module', id: `COURSE_${courseId}` },
        { type: 'Course', id: courseId },
      ],
    }),

    updateModule: builder.mutation<ApiResponse<ModuleData>, { id: string; body: UpdateModuleBody; courseId?: string }>({
      query: ({ id, body }) => ({
        url: `/modules/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id, courseId }) => {
        const tags: { type: 'Module' | 'Course'; id: string }[] = [
          { type: 'Module', id },
          { type: 'Module', id: 'LIST' },
        ];
        if (courseId) {
          tags.push({ type: 'Module', id: `COURSE_${courseId}` });
        }
        return tags;
      },
    }),

    deleteModule: builder.mutation<ApiResponse<null>, { id: string; courseId?: string } | string>({
      query: (arg) => ({
        url: `/modules/${typeof arg === 'string' ? arg : arg.id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => {
        const id = typeof arg === 'string' ? arg : arg.id;
        const courseId = typeof arg === 'string' ? undefined : arg.courseId;
        const tags: { type: 'Module' | 'Course'; id: string }[] = [
          { type: 'Module', id },
          { type: 'Module', id: 'LIST' },
        ];
        if (courseId) {
          tags.push({ type: 'Module', id: `COURSE_${courseId}` });
          tags.push({ type: 'Course', id: courseId });
        }
        return tags;
      },
    }),
  }),
});

export const {
  useGetModulesQuery,
  useGetModuleByIdQuery,
  useCreateModuleMutation,
  useUpdateModuleMutation,
  useDeleteModuleMutation,
} = moduleApi;
