import { baseApi } from './baseApi';
import type { ApiResponse } from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface UploadResponse {
  url: string;
  publicId: string;
  format: string;
  size: number;
}

// ─── API Slice ──────────────────────────────────────────

export const uploadApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadFile: builder.mutation<ApiResponse<UploadResponse>, FormData>({
      query: (formData) => ({
        url: '/upload',
        method: 'POST',
        body: formData,
      }),
    }),
  }),
});

export const { useUploadFileMutation } = uploadApi;
