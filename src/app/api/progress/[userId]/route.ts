import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// GET /api/progress/[userId]
export const GET = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { userId } = await context.params;
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      // Staff can only view their own progress
      if (currentRole === 'staff' && userId !== currentUserId) {
        return errorResponse('Insufficient permissions', 403);
      }

      const records = await LearnerProgress.find({ user: userId })
        .populate('course', 'title description thumbnail status')
        .populate('module', 'title order')
        .sort({ 'course._id': 1, 'module.order': 1 })
        .lean();

      // Group by course
      const grouped: Record<string, { course: unknown; modules: unknown[] }> = {};

      for (const record of records) {
        const courseId = record.course?._id?.toString() ?? 'unknown';
        if (!grouped[courseId]) {
          grouped[courseId] = {
            course: record.course,
            modules: [],
          };
        }
        grouped[courseId].modules.push({
          module: record.module,
          status: record.status,
          videoCompleted: record.videoCompleted,
          videoPoints: record.videoPoints,
          quizPassed: record.quizPassed,
          quizPoints: record.quizPoints,
          proofOfWorkPoints: record.proofOfWorkPoints,
          totalModulePoints: record.totalModulePoints,
          completedContents: record.completedContents,
          completedAt: record.completedAt,
        });
      }

      const result = Object.values(grouped);

      return successResponse(result, 'User progress retrieved');
    } catch (err) {
      console.error('[Progress/GET/:userId] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);
