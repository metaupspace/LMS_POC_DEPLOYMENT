import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import Module from '@/lib/db/models/Module';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { POINTS } from '@/lib/constants';

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

      // Repair any stuck progress records (in_progress but should be completed)
      const stuckRecords = await LearnerProgress.find({
        user: userId,
        status: 'in_progress',
      });

      if (stuckRecords.length > 0) {
        const moduleIds = stuckRecords.map((r) => r.module);
        const moduleDocs = await Module.find({ _id: { $in: moduleIds } })
          .select('_id contents quiz')
          .lean();
        const moduleMap = new Map(moduleDocs.map((m) => [m._id.toString(), m]));

        let repairedPointsDelta = 0;

        for (const record of stuckRecords) {
          const mod = moduleMap.get(record.module.toString());
          if (!mod) continue;

          const totalContents = mod.contents?.length ?? 0;
          const allContentsDone =
            totalContents > 0 && record.completedContents.length >= totalContents;

          if (!allContentsDone) continue;

          const hasQuiz = mod.quiz !== null && mod.quiz !== undefined;

          if (!hasQuiz || record.quizPassed) {
            const previousVideoPoints = record.videoPoints || 0;
            record.status = 'completed';
            record.videoCompleted = true;
            record.videoPoints = record.videoPoints || POINTS.VIDEO_COMPLETION;
            record.totalModulePoints =
              (record.videoPoints || 0) + (record.quizPoints || 0) + (record.proofOfWorkPoints || 0);
            record.completedAt = record.completedAt || new Date();
            await record.save();

            if (previousVideoPoints === 0) {
              repairedPointsDelta += POINTS.VIDEO_COMPLETION;
            }
          }
        }

        // Sync repaired points to gamification
        if (repairedPointsDelta > 0) {
          await Gamification.findOneAndUpdate(
            { user: userId },
            { $inc: { totalPoints: repairedPointsDelta } },
            { upsert: true }
          );
        }
      }

      // Fetch fresh records after repair
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
