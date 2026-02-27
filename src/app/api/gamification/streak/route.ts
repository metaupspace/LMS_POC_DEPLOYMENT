import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// POST /api/gamification/streak
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();
      const currentUserId = request.headers.get('x-user-id') ?? '';

      const gamification = await Gamification.findOne({ user: currentUserId });
      if (!gamification) {
        return errorResponse('Gamification record not found', 404);
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const lastActivity = gamification.streak.lastActivityDate;

      if (lastActivity) {
        const lastDate = new Date(lastActivity);
        lastDate.setHours(0, 0, 0, 0);
        const diffDays = Math.floor(
          (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (diffDays === 0) {
          // Same day — no change
          return successResponse(gamification.streak, 'Streak unchanged (already active today)');
        } else if (diffDays === 1) {
          // Yesterday — increment
          gamification.streak.current += 1;
        } else {
          // More than 1 day gap — reset
          gamification.streak.current = 1;
        }
      } else {
        // First activity ever
        gamification.streak.current = 1;
      }

      if (gamification.streak.current > gamification.streak.longest) {
        gamification.streak.longest = gamification.streak.current;
      }

      gamification.streak.lastActivityDate = new Date();
      await gamification.save();

      return successResponse(gamification.streak, 'Streak updated');
    } catch (err) {
      console.error('[Gamification/Streak] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['staff']
);
