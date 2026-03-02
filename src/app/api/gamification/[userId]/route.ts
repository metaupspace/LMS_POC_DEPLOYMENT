import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Gamification from '@/lib/db/models/Gamification';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import TrainingSession from '@/lib/db/models/TrainingSession';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { BADGE_TIERS, POINTS } from '@/lib/constants';

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

      let gamification = await Gamification.findOne({ user: userId }).lean();
      if (!gamification) {
        // Auto-create gamification record for this user
        await Gamification.create({
          user: userId,
          totalPoints: 0,
          badges: [],
          streak: { current: 0, longest: 0 },
        });
        gamification = await Gamification.findOne({ user: userId }).lean();
        if (!gamification) {
          return errorResponse('Failed to create gamification record', 500);
        }
      }

      // Reconcile: check if gamification points are in sync with LearnerProgress + session attendance
      const progressRecords = await LearnerProgress.find({ user: userId })
        .select('videoPoints quizPoints proofOfWorkPoints')
        .lean();

      const modulePoints = progressRecords.reduce(
        (sum, p) => sum + (p.videoPoints || 0) + (p.quizPoints || 0) + (p.proofOfWorkPoints || 0),
        0
      );

      // Count sessions where user marked attendance as present
      const attendedSessionCount = await TrainingSession.countDocuments({
        'attendance.staff': userId,
        'attendance.status': 'present',
      });

      const totalEarnedPoints = modulePoints + attendedSessionCount * POINTS.SESSION_ATTENDANCE;

      if (gamification.totalPoints < totalEarnedPoints) {
        // Points are out of sync — repair
        await Gamification.findOneAndUpdate(
          { user: userId },
          { totalPoints: totalEarnedPoints },
        );
        gamification = { ...gamification, totalPoints: totalEarnedPoints };

        // Also check badges after reconciliation
        for (const tier of BADGE_TIERS) {
          const alreadyHas = gamification.badges.some((b) => b.name === tier.name);
          if (!alreadyHas && totalEarnedPoints >= tier.threshold) {
            await Gamification.findOneAndUpdate(
              { user: userId },
              {
                $push: {
                  badges: {
                    name: tier.name,
                    threshold: tier.threshold,
                    earnedAt: new Date(),
                    icon: tier.icon,
                  },
                },
              }
            );
            gamification = {
              ...gamification,
              badges: [
                ...gamification.badges,
                { name: tier.name, threshold: tier.threshold, earnedAt: new Date(), icon: tier.icon },
              ],
            };
          }
        }
      }

      // Check if streak has lapsed (last activity older than yesterday)
      const streakData = gamification.streak;
      let currentStreak = streakData?.current ?? 0;
      if (streakData?.lastActivityDate && currentStreak > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const lastStr = new Date(streakData.lastActivityDate).toISOString().split('T')[0];

        if (lastStr !== todayStr && lastStr !== yesterdayStr) {
          // Streak broken — reset current to 0
          currentStreak = 0;
          await Gamification.findOneAndUpdate(
            { user: userId },
            { 'streak.current': 0 },
          );
          gamification = { ...gamification, streak: { ...streakData, current: 0 } };
        }
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
