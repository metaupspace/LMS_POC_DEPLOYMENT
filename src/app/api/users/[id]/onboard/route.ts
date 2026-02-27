import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { UserStatus } from '@/types/enums';

// POST /api/users/[id]/onboard
export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;
      const currentRole = request.headers.get('x-user-role');

      const user = await User.findById(id);
      if (!user) {
        return errorResponse('User not found', 404);
      }

      if (user.status !== UserStatus.OFFBOARDED) {
        return errorResponse('User is not offboarded', 400);
      }

      // Admin can re-onboard anyone; Manager can only re-onboard coaches and staff
      if (currentRole === 'manager' && (user.role === 'admin' || user.role === 'manager')) {
        return errorResponse('Insufficient permissions', 403);
      }

      user.status = UserStatus.ACTIVE;
      user.firstLogin = true;
      await user.save();

      return successResponse(null, 'User re-onboarded successfully');
    } catch (err) {
      console.error('[Users/Onboard] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin']
);
