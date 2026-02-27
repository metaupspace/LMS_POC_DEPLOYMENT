import { type NextRequest } from 'next/server';
import { verifyRefreshToken, signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { refreshTokenSchema } from '@/lib/validators/auth';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisGet, redisSet } from '@/lib/redis/client';
import { REDIS_PREFIXES, REDIS_TTL } from '@/lib/constants';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    // Validate request body
    const parsed = refreshTokenSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
      return errorResponse(firstError, 400);
    }

    const { refreshToken } = parsed.data;

    // Verify token signature
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return errorResponse('Invalid or expired refresh token', 401);
    }

    // Check against Redis stored hash
    const storedHash = await redisGet<string>(
      `${REDIS_PREFIXES.REFRESH_TOKEN}${payload.userId}`
    );

    if (!storedHash) {
      return errorResponse('Refresh token has been revoked', 401);
    }

    const incomingHash = createHash('sha256').update(refreshToken).digest('hex');
    if (storedHash !== incomingHash) {
      return errorResponse('Invalid refresh token', 401);
    }

    // Rotate: generate new tokens
    const tokenPayload = {
      userId: payload.userId,
      empId: payload.empId,
      role: payload.role,
      name: payload.name,
    };

    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    // Update Redis with new refresh token hash
    const newRefreshHash = createHash('sha256').update(newRefreshToken).digest('hex');
    await redisSet(
      `${REDIS_PREFIXES.REFRESH_TOKEN}${payload.userId}`,
      newRefreshHash,
      REDIS_TTL.REFRESH_TOKEN
    );

    const response = successResponse(
      {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
      'Tokens refreshed successfully'
    );

    // Update HTTP-only cookies
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });
    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Auth/Refresh] Error:', message);
    return errorResponse('Internal server error', 500);
  }
}
