import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { withAuth } from '@/lib/auth/rbac';
import { hashPassword } from '@/lib/auth/password';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisDel } from '@/lib/redis/client';
import { REDIS_PREFIXES } from '@/lib/constants';

// POST /api/users/[id]/reset-password
export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body = (await request.json()) as { newPassword?: string };
      const { newPassword } = body;

      if (!newPassword || newPassword.length < 8) {
        return errorResponse('Password must be at least 8 characters', 400);
      }

      await connectDB();
      const { id } = await context.params;
      const currentRole = request.headers.get('x-user-role');

      const user = await User.findById(id);
      if (!user) {
        return errorResponse('User not found', 404);
      }

      // Manager cannot reset admin/manager passwords
      if (currentRole === 'manager' && (user.role === 'admin' || user.role === 'manager')) {
        return errorResponse('Insufficient permissions', 403);
      }

      // Hash and save new password
      user.password = await hashPassword(newPassword);
      user.firstLogin = true;
      await user.save();

      // Invalidate their refresh token
      await redisDel(`${REDIS_PREFIXES.REFRESH_TOKEN}${id}`).catch(() => {});

      return successResponse(
        null,
        'Password reset successfully. User will be prompted to change password on next login.'
      );
    } catch (err) {
      console.error('[Users/ResetPassword] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin']
);
