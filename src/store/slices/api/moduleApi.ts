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
  course: string;
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
      invalidatesTags: (_result, _error, { course }) => [
        { type: 'Module', id: 'LIST' },
        { type: 'Module', id: `COURSE_${course}` },
        { type: 'Course', id: course },
      ],
    }),

    updateModule: builder.mutation<ApiResponse<ModuleData>, { id: string; body: UpdateModuleBody }>({
      query: ({ id, body }) => ({
        url: `/modules/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Module', id },
        { type: 'Module', id: 'LIST' },
      ],
    }),

    deleteModule: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/modules/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Module', id },
        { type: 'Module', id: 'LIST' },
      ],
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
