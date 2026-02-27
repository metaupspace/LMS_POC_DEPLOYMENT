import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { comparePassword } from '@/lib/auth/password';
import { changePasswordSchema } from '@/lib/validators/auth';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { getAuthUser } from '@/lib/auth/rbac';
import { redisDel } from '@/lib/redis/client';
import { REDIS_PREFIXES } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);

    if (!authUser) {
      return errorResponse('Authentication required', 401);
    }

    const body: unknown = await request.json();

    // Validate request body
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
      return errorResponse(firstError, 400);
    }

    const { currentPassword, newPassword } = parsed.data;

    // Connect to database
    await connectDB();

    // Fetch user with password
    const user = await User.findById(authUser.userId).select('+password');

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // Verify current password
    const isCurrentValid = await comparePassword(currentPassword, user.password);
    if (!isCurrentValid) {
      return errorResponse('Current password is incorrect', 400);
    }

    // Assign raw password — pre-save hook on User model will hash it
    user.password = newPassword;

    // If first login, set to false
    if (user.firstLogin) {
      user.firstLogin = false;
    }

    await user.save();

    // Invalidate refresh token in Redis
    await redisDel(`${REDIS_PREFIXES.REFRESH_TOKEN}${authUser.userId}`);

    return successResponse(null, 'Password changed successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[Auth/ChangePassword] Error:', message);
    return errorResponse('Internal server error', 500);
  }
}
