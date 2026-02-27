import type { PaginationMeta, PaginationQuery } from '@/types/api';
import { PAGINATION_DEFAULTS } from '@/lib/constants';

export function getPaginationParams(searchParams: URLSearchParams): PaginationQuery {
  const page = Math.max(1, parseInt(searchParams.get('page') ?? String(PAGINATION_DEFAULTS.PAGE), 10));
  const rawLimit = parseInt(searchParams.get('limit') ?? String(PAGINATION_DEFAULTS.LIMIT), 10);
  const limit = Math.min(Math.max(1, rawLimit), PAGINATION_DEFAULTS.MAX_LIMIT);
  const search = searchParams.get('search') ?? undefined;
  const sortBy = searchParams.get('sortBy') ?? undefined;
  const sortOrderParam = searchParams.get('sortOrder');
  const sortOrder: 'asc' | 'desc' | undefined =
    sortOrderParam === 'asc' || sortOrderParam === 'desc' ? sortOrderParam : undefined;

  return { page, limit, search, sortBy, sortOrder };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
