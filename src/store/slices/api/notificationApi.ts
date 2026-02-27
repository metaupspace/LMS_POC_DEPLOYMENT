import { baseApi } from './baseApi';
import type {
  NotificationType,
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface NotificationData {
  _id: string;
  user: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  read?: boolean;
  type?: NotificationType;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── API Slice ──────────────────────────────────────────

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<PaginatedResponse<NotificationData> & { pagination: PaginationMeta }, GetNotificationsParams>({
      query: (params) => ({
        url: '/notifications',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Notification' as const, id: _id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    markAsRead: builder.mutation<ApiResponse<NotificationData>, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
} = notificationApi;
