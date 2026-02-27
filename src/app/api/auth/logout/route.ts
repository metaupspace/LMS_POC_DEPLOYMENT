import { type NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { getAuthUser } from '@/lib/auth/rbac';
import { redisDel } from '@/lib/redis/client';
import { REDIS_PREFIXES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request);

    if (!user) {
      return errorResponse('Authentication required', 401);
    }

    // Remove refresh token from Redis
    await redisDel(`${REDIS_PREFIXES.REFRESH_TOKEN}${user.userId}`);

    const response = successResponse(null, 'Logged out successfully');

    // Clear HTTP-only cookies
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Auth/Logout] Error:', message);
    return errorResponse('Internal server error', 500);
  }
}
