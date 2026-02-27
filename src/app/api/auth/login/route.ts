import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { loginSchema } from '@/lib/validators/auth';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisSet } from '@/lib/redis/client';
import { REDIS_PREFIXES, REDIS_TTL } from '@/lib/constants';
import { UserStatus } from '@/types/enums';
import { createHash } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    // Validate request body
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
      return errorResponse(firstError, 400);
    }

    const { empId, password } = parsed.data;

    // Connect to database
    await connectDB();

    // Find user by empId with password field included
    const user = await User.findOne({ empId }).select('+password');

    if (!user) {
      return errorResponse('Invalid credentials', 401);
    }

    // Check if user is offboarded
    if (user.status === UserStatus.OFFBOARDED) {
      return errorResponse('Your account has been deactivated. Please contact your administrator.', 403);
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse('Invalid credentials', 401);
    }

    // Generate JWT tokens
    const tokenPayload = {
      userId: user._id.toString(),
      empId: user.empId,
      role: user.role,
      name: user.name,
    };

    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Store refresh token hash in Redis
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');
    await redisSet(
      `${REDIS_PREFIXES.REFRESH_TOKEN}${user._id.toString()}`,
      refreshTokenHash,
      REDIS_TTL.REFRESH_TOKEN
    );

    const response = successResponse(
      {
        accessToken,
        refreshToken,
        user: {
          id: user._id.toString(),
          name: user.name,
          empId: user.empId,
          role: user.role,
          email: user.email,
          firstLogin: user.firstLogin,
        },
      },
      'Login successful'
    );

    // Set HTTP-only cookies for middleware auth
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Auth/Login] Error:', message);
    return errorResponse('Internal server error', 500);
  }
}
