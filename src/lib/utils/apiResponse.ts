import { NextResponse } from 'next/server';
import type { ApiResponse, PaginatedResponse, PaginationMeta } from '@/types/api';

export function successResponse<T>(
  data: T,
  message = 'Success',
  statusCode = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      message,
      error: null,
    },
    { status: statusCode }
  );
}

export function errorResponse(
  message: string,
  statusCode = 500,
  error: string | null = null
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      error: error ?? message,
    },
    { status: statusCode }
  );
}

export function paginatedResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  message = 'Success'
): NextResponse<PaginatedResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    error: null,
    pagination,
  });
}
