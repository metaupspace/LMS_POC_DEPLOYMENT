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

export interface ModuleData {
  _id: string;
  title: string;
  description: string;
  course: string;
  order: number;
  contents: ModuleContentData[];
  quiz: string;
  createdAt: string;
  updatedAt: string;
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
