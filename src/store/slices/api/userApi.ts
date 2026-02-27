import { baseApi } from './baseApi';
import type {
  UserRole,
  UserStatus,
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface UserData {
  _id: string;
  empId: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  domain: string;
  location: string;
  status: UserStatus;
  profileImage: string;
  preferredLanguage: string;
  firstLogin: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserBody {
  empId: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  domain: string;
  location: string;
  preferredLanguage?: string;
}

export interface UserMetadata {
  domains: string[];
  locations: string[];
}

export interface UpdateUserBody {
  name?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  domain?: string;
  location?: string;
  profileImage?: string;
  preferredLanguage?: string;
  status?: UserStatus;
}

// ─── API Slice ──────────────────────────────────────────

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<PaginatedResponse<UserData> & { pagination: PaginationMeta }, GetUsersParams>({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'User' as const, id: _id })),
              { type: 'User', id: 'LIST' },
            ]
          : [{ type: 'User', id: 'LIST' }],
    }),

    getUserById: builder.query<ApiResponse<UserData>, string>({
      query: (id) => `/users/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    createUser: builder.mutation<ApiResponse<UserData>, CreateUserBody>({
      query: (body) => ({
        url: '/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    updateUser: builder.mutation<ApiResponse<UserData>, { id: string; body: UpdateUserBody }>({
      query: ({ id, body }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    deleteUser: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    offboardUser: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/users/${id}/offboard`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    onboardUser: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/users/${id}/onboard`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    getUserMetadata: builder.query<ApiResponse<UserMetadata>, void>({
      query: () => '/users/metadata',
    }),

    resetPassword: builder.mutation<ApiResponse<null>, { id: string; newPassword: string }>({
      query: ({ id, newPassword }) => ({
        url: `/users/${id}/reset-password`,
        method: 'POST',
        body: { newPassword },
      }),
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useOffboardUserMutation,
  useOnboardUserMutation,
  useGetUserMetadataQuery,
  useResetPasswordMutation,
} = userApi;
