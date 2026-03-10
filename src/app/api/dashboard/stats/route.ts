import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import Course from '@/lib/db/models/Course';
import TrainingSession from '@/lib/db/models/TrainingSession';
import CertificationTest from '@/lib/db/models/CertificationTest';
import TestAttempt from '@/lib/db/models/TestAttempt';
import Certification from '@/lib/db/models/Certification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisGet, redisSet } from '@/lib/redis/client';
import { UserStatus, CourseStatus, SessionStatus } from '@/types/enums';

const CACHE_KEY = 'dashboard:stats';
const CACHE_TTL = 300; // 5 minutes

interface RecentAttempt {
  _id: string;
  score: number;
  passed: boolean;
  totalViolations: number;
  submittedAt: string;
  user: { _id: string; name: string; empId: string } | null;
  test: { _id: string; title: string; certificationTitle: string } | null;
}

interface DashboardStats {
  activeManagers: number;
  activeCoaches: number;
  activeStaff: number;
  activeCourses: number;
  upcomingSessions: number;
  tests: {
    total: number;
    active: number;
    totalAttempts: number;
    totalCertifications: number;
    passRate: number;
    recentAttempts: RecentAttempt[];
  };
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
        totalTests,
        activeTests,
        totalAttempts,
        passedAttempts,
        totalCertifications,
        recentAttempts,
      ] = await Promise.all([
        User.countDocuments({ role: 'manager', status: UserStatus.ACTIVE }),
        User.countDocuments({ role: 'coach', status: UserStatus.ACTIVE }),
        User.countDocuments({ role: 'staff', status: UserStatus.ACTIVE }),
        Course.countDocuments({ status: CourseStatus.ACTIVE }),
        TrainingSession.countDocuments({ status: SessionStatus.UPCOMING }),
        CertificationTest.countDocuments(),
        CertificationTest.countDocuments({ status: 'active' }),
        TestAttempt.countDocuments({ status: 'graded' }),
        TestAttempt.countDocuments({ status: 'graded', passed: true }),
        Certification.countDocuments(),
        TestAttempt.find({ status: 'graded' })
          .sort({ submittedAt: -1 })
          .limit(5)
          .populate('user', 'name empId')
          .populate('test', 'title certificationTitle')
          .lean(),
      ]);

      const testPassRate = totalAttempts > 0
        ? Math.round((passedAttempts / totalAttempts) * 100)
        : 0;

      const stats: DashboardStats = {
        activeManagers,
        activeCoaches,
        activeStaff,
        activeCourses,
        upcomingSessions,
        tests: {
          total: totalTests,
          active: activeTests,
          totalAttempts,
          totalCertifications,
          passRate: testPassRate,
          recentAttempts: recentAttempts as unknown as RecentAttempt[],
        },
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
