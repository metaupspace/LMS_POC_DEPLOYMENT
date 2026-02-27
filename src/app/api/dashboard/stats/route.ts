import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Course from '@/lib/db/models/Course';
import TrainingSession from '@/lib/db/models/TrainingSession';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisGet, redisSet } from '@/lib/redis/client';
import { UserStatus, CourseStatus, SessionStatus } from '@/types/enums';

const CACHE_KEY = 'dashboard:stats';
const CACHE_TTL = 300; // 5 minutes

interface DashboardStats {
  activeManagers: number;
  activeCoaches: number;
  activeStaff: number;
  activeCourses: number;
  upcomingSessions: number;
}

export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      const cached = await redisGet<DashboardStats>(CACHE_KEY);
      if (cached) {
        return successResponse(cached, 'Dashboard stats fetched');
      }

      await connectDB();

      const [
        activeManagers,
        activeCoaches,
        activeStaff,
        activeCourses,
        upcomingSessions,
      ] = await Promise.all([
        User.countDocuments({ role: 'manager', status: UserStatus.ACTIVE }),
        User.countDocuments({ role: 'coach', status: UserStatus.ACTIVE }),
        User.countDocuments({ role: 'staff', status: UserStatus.ACTIVE }),
        Course.countDocuments({ status: CourseStatus.ACTIVE }),
        TrainingSession.countDocuments({ status: SessionStatus.UPCOMING }),
      ]);

      const stats: DashboardStats = {
        activeManagers,
        activeCoaches,
        activeStaff,
        activeCourses,
        upcomingSessions,
      };

      await redisSet(CACHE_KEY, stats, CACHE_TTL);

      return successResponse(stats, 'Dashboard stats fetched');
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return errorResponse('Failed to fetch dashboard stats', 500);
    }
  },
  ['admin', 'manager']
);
