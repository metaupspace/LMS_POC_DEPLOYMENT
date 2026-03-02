import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Notification from '@/lib/db/models/Notification';
import { withAuth } from '@/lib/auth/rbac';
import { paginatedResponse, errorResponse } from '@/lib/utils/apiResponse';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils/pagination';
import type { FilterQuery } from 'mongoose';
import type { INotification } from '@/types';

// GET /api/notifications
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();
      const currentUserId = request.headers.get('x-user-id');

      const { searchParams } = new URL(request.url);
      const { page, limit } = getPaginationParams(searchParams);
      const unreadOnly = searchParams.get('unreadOnly') === 'true';
      const readParam = searchParams.get('read');

      const filter: FilterQuery<INotification> = { user: currentUserId };
      if (unreadOnly || readParam === 'false') {
        filter.read = false;
      } else if (readParam === 'true') {
        filter.read = true;
      }

      const skip = (page - 1) * limit;

      const [notifications, total] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Notification.countDocuments(filter),
      ]);

      const pagination = buildPaginationMeta(total, page, limit);
      return paginatedResponse(notifications, pagination, 'Notifications retrieved');
    } catch (err) {
      console.error('[Notifications/GET] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);
