import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Notification from '@/lib/db/models/Notification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisDel } from '@/lib/redis/client';

// POST /api/notifications/[id]/read
export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;
      const currentUserId = request.headers.get('x-user-id');

      const notification = await Notification.findById(id);
      if (!notification) {
        return errorResponse('Notification not found', 404);
      }

      // Ensure user can only mark their own notifications as read
      if (notification.user.toString() !== currentUserId) {
        return errorResponse('Insufficient permissions', 403);
      }

      notification.read = true;
      await notification.save();

      // Invalidate unread count cache
      await redisDel(`notifications:unread:${currentUserId}`).catch(() => {});

      return successResponse(null, 'Notification marked as read');
    } catch (err) {
      console.error('[Notifications/Read] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);
