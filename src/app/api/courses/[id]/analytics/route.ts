import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Course from '@/lib/db/models/Course';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// Helper to extract string ID from a populated or raw ObjectId field
function extractId(field: unknown): string | undefined {
  if (!field) return undefined;
  if (typeof field === 'object' && field !== null && '_id' in field) {
    return String((field as { _id: unknown })._id);
  }
  return String(field);
}

// GET /api/courses/[id]/analytics
export const GET = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id: courseId } = await context.params;

      const course = await Course.findById(courseId)
        .populate('assignedStaff', 'name empId email domain location')
        .populate('modules', 'title order contents quiz')
        .lean();

      if (!course) return errorResponse('Course not found', 404);

      const assignedStaff = (course.assignedStaff ?? []) as unknown as Array<{
        _id: unknown;
        name: string;
        empId: string;
        email?: string;
        domain?: string;
        location?: string;
      }>;
      const courseModules = (course.modules ?? []) as unknown as Array<{
        _id: unknown;
        title: string;
        order: number;
        contents?: unknown[];
        quiz?: unknown;
      }>;

      const totalStaff = assignedStaff.length;
      const totalModules = courseModules.length;

      // Fetch all progress records for this course
      const allProgress = await LearnerProgress.find({ course: courseId })
        .populate('user', 'name empId email')
        .populate('module', 'title order')
        .lean();

      // Group progress by user
      const userProgressMap = new Map<string, typeof allProgress>();
      for (const p of allProgress) {
        const userId = extractId(p.user);
        if (!userId) continue;
        if (!userProgressMap.has(userId)) userProgressMap.set(userId, []);
        userProgressMap.get(userId)!.push(p);
      }

      let learnersCompleted = 0;
      let learnersInProgress = 0;
      let learnersNotStarted = 0;
      let totalPointsEarned = 0;

      // Batch-fetch gamification for all assigned staff
      const staffIds = assignedStaff.map((s) => s._id);
      const gamificationRecords = await Gamification.find({ user: { $in: staffIds } }).lean();
      const gamificationMap = new Map(
        gamificationRecords.map((g) => [g.user.toString(), g])
      );

      const perLearnerStats = assignedStaff.map((staff) => {
        const staffId = String(staff._id ?? '');
        const progressRecords = userProgressMap.get(staffId) || [];

        const modulesCompleted = progressRecords.filter((p) => p.status === 'completed').length;
        const modulesInProgress = progressRecords.filter((p) => p.status === 'in_progress').length;
        const modulesNotStarted = totalModules - modulesCompleted - modulesInProgress;
        const learnerPoints = progressRecords.reduce(
          (sum, p) =>
            sum + (p.videoPoints || 0) + (p.quizPoints || 0) + (p.proofOfWorkPoints || 0),
          0
        );

        totalPointsEarned += learnerPoints;

        let courseStatus: string;
        if (modulesCompleted === totalModules && totalModules > 0) {
          courseStatus = 'completed';
          learnersCompleted++;
        } else if (modulesCompleted > 0 || modulesInProgress > 0) {
          courseStatus = 'in_progress';
          learnersInProgress++;
        } else {
          courseStatus = 'not_started';
          learnersNotStarted++;
        }

        const gamification = gamificationMap.get(staffId);

        // Per-module breakdown for this learner
        const moduleProgress = courseModules.map((mod) => {
          const modId = String(mod._id);
          const mp = progressRecords.find((p) => extractId(p.module) === modId);
          return {
            moduleId: mod._id,
            moduleTitle: mod.title,
            moduleOrder: mod.order,
            status: mp?.status || 'not_started',
            videoCompleted: mp?.videoCompleted || false,
            videoPoints: mp?.videoPoints || 0,
            quizPassed: mp?.quizPassed || false,
            quizPoints: mp?.quizPoints || 0,
            proofOfWorkPoints: mp?.proofOfWorkPoints || 0,
            totalModulePoints: mp?.totalModulePoints || 0,
            completedAt: mp?.completedAt || null,
          };
        });

        return {
          user: {
            _id: staff._id,
            name: staff.name,
            empId: staff.empId,
            email: staff.email,
            domain: staff.domain,
            location: staff.location,
          },
          courseStatus,
          modulesCompleted,
          modulesInProgress,
          modulesNotStarted: Math.max(0, modulesNotStarted),
          totalModules,
          completionPercent:
            totalModules > 0 ? Math.round((modulesCompleted / totalModules) * 100) : 0,
          pointsEarned: learnerPoints,
          totalPoints: gamification?.totalPoints || 0,
          badges: gamification?.badges || [],
          streak: gamification?.streak?.current || 0,
          moduleProgress,
        };
      });

      // Module-level aggregated stats
      const perModuleStats = courseModules.map((mod) => {
        const modId = String(mod._id);
        const moduleProgressRecords = allProgress.filter(
          (p) => extractId(p.module) === modId
        );

        const completed = moduleProgressRecords.filter((p) => p.status === 'completed').length;
        const inProgress = moduleProgressRecords.filter((p) => p.status === 'in_progress').length;
        const avgPoints =
          moduleProgressRecords.length > 0
            ? Math.round(
                moduleProgressRecords.reduce((sum, p) => sum + (p.totalModulePoints || 0), 0) /
                  moduleProgressRecords.length
              )
            : 0;

        return {
          moduleId: mod._id,
          title: mod.title,
          order: mod.order,
          totalLearners: totalStaff,
          completed,
          inProgress,
          notStarted: Math.max(0, totalStaff - completed - inProgress),
          completionRate: totalStaff > 0 ? Math.round((completed / totalStaff) * 100) : 0,
          avgPoints,
        };
      });

      return successResponse({
        courseId,
        courseSummary: {
          totalLearners: totalStaff,
          learnersCompleted,
          learnersInProgress,
          learnersNotStarted,
          courseCompletionRate:
            totalStaff > 0 ? Math.round((learnersCompleted / totalStaff) * 100) : 0,
          totalModules,
          totalPointsEarned,
          avgPointsPerLearner: totalStaff > 0 ? Math.round(totalPointsEarned / totalStaff) : 0,
        },
        perModuleStats,
        perLearnerStats,
      });
    } catch (err) {
      console.error(
        '[CourseAnalytics/GET] Error:',
        err instanceof Error ? err.message : err
      );
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach']
);
