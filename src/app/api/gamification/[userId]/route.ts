import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { BADGE_TIERS } from '@/lib/constants';

// GET /api/gamification/[userId]
export const GET = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { userId } = await context.params;
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      // Staff can only view their own gamification
      if (currentRole === 'staff' && userId !== currentUserId) {
        return errorResponse('Insufficient permissions', 403);
      }

      const gamification = await Gamification.findOne({ user: userId }).lean();
      if (!gamification) {
        return errorResponse('Gamification record not found', 404);
      }

      // Calculate next badge
      const earnedBadgeNames = new Set(gamification.badges.map((b) => b.name));
      const nextBadge = BADGE_TIERS.find((tier) => !earnedBadgeNames.has(tier.name));

      const result = {
        totalPoints: gamification.totalPoints,
        badges: gamification.badges,
        streak: gamification.streak,
        nextBadge: nextBadge
          ? {
              name: nextBadge.name,
              threshold: nextBadge.threshold,
              pointsNeeded: nextBadge.threshold - gamification.totalPoints,
            }
          : null,
      };

      return successResponse(result, 'Gamification data retrieved');
    } catch (err) {
      console.error('[Gamification/GET] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);
