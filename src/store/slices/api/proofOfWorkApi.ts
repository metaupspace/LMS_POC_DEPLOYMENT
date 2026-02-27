import { baseApi } from './baseApi';
import type {
  ProofOfWorkStatus,
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface ProofOfWorkData {
  _id: string;
  user: string;
  course: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  status: ProofOfWorkStatus;
  reviewedBy: string;
  reviewNote: string;
  submittedAt: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetProofsParams {
  page?: number;
  limit?: number;
  course?: string;
  user?: string;
  status?: ProofOfWorkStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReviewProofBody {
  status: 'approved' | 'redo_requested';
  reviewNote?: string;
}

// ─── API Slice ──────────────────────────────────────────

export const proofOfWorkApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProofs: builder.query<PaginatedResponse<ProofOfWorkData> & { pagination: PaginationMeta }, GetProofsParams>({
      query: (params) => ({
        url: '/proof-of-work',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'ProofOfWork' as const, id: _id })),
              { type: 'ProofOfWork', id: 'LIST' },
            ]
          : [{ type: 'ProofOfWork', id: 'LIST' }],
    }),

    uploadProof: builder.mutation<ApiResponse<ProofOfWorkData>, FormData>({
      query: (formData) => ({
        url: '/proof-of-work/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: [
        { type: 'ProofOfWork', id: 'LIST' },
        { type: 'Progress', id: 'LIST' },
        { type: 'Gamification', id: 'LIST' },
      ],
    }),

    reviewProof: builder.mutation<ApiResponse<ProofOfWorkData>, { id: string; body: ReviewProofBody }>({
      query: ({ id, body }) => ({
        url: `/proof-of-work/${id}/review`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ProofOfWork', id },
        { type: 'ProofOfWork', id: 'LIST' },
        { type: 'Progress', id: 'LIST' },
        { type: 'Gamification', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProofsQuery,
  useUploadProofMutation,
  useReviewProofMutation,
} = proofOfWorkApi;
