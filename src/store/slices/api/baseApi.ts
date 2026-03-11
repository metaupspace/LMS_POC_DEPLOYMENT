import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { RootState } from '../../store';
import { setTokens, logout } from '../authSlice';

// Mutex to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const baseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const state = api.getState() as RootState;
    const refreshToken = state.auth.refreshToken;

    if (!refreshToken) {
      api.dispatch(logout());
      api.dispatch(baseApi.util.resetApiState());
      return result;
    }

    // If another request is already refreshing, wait for it
    if (isRefreshing && refreshPromise) {
      const refreshed = await refreshPromise;
      if (refreshed) {
        result = await baseQuery(args, api, extraOptions);
      }
      return result;
    }

    isRefreshing = true;
    refreshPromise = (async (): Promise<boolean> => {
      try {
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
            body: { refreshToken },
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          const response = refreshResult.data as {
            success: boolean;
            data: { accessToken: string; refreshToken: string };
          };

          if (response.success && response.data) {
            api.dispatch(
              setTokens({
                accessToken: response.data.accessToken,
                refreshToken: response.data.refreshToken,
              })
            );
            return true;
          }
        }

        api.dispatch(logout());
        api.dispatch(baseApi.util.resetApiState());
        return false;
      } catch {
        api.dispatch(logout());
        api.dispatch(baseApi.util.resetApiState());
        return false;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();

    const refreshed = await refreshPromise;
    if (refreshed) {
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Course',
    'Module',
    'Quiz',
    'Session',
    'Progress',
    'ProofOfWork',
    'Gamification',
    'Notification',
    'Test',
    'Certification',
  ],
  endpoints: () => ({}),
});
