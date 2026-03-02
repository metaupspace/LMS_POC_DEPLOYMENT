import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import Module from '@/lib/db/models/Module';
import Course from '@/lib/db/models/Course';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/utils/apiResponse';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils/pagination';
import { POINTS, BADGE_TIERS } from '@/lib/constants';
import { updateStreak } from '@/lib/utils/updateStreak';
import type { FilterQuery } from 'mongoose';
import type { ILearnerProgress } from '@/types';
import { z } from 'zod';

// GET /api/progress
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const { page, limit } = getPaginationParams(searchParams);
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      const filter: FilterQuery<ILearnerProgress> = {};

      const userId = searchParams.get('userId');
      if (userId) filter.user = userId;

      // Support both 'course' (frontend convention) and 'courseId'
      const courseId = searchParams.get('course') ?? searchParams.get('courseId');
      if (courseId) filter.course = courseId;

      const moduleId = searchParams.get('module');
      if (moduleId) filter.module = moduleId;

      // Coach: only progress for their assigned courses
      if (currentRole === 'coach') {
        const coachCourses = await Course.find({ coach: currentUserId }).select('_id').lean();
        const courseIds = coachCourses.map((c) => c._id);
        filter.course = { $in: courseIds };
      }

      // Staff: only their own progress
      if (currentRole === 'staff') {
        filter.user = currentUserId;
      }

      // Repair any stuck progress records before returning
      if (currentRole === 'staff' && currentUserId) {
        const stuckRecords = await LearnerProgress.find({
          user: currentUserId,
          status: 'in_progress',
        });

        if (stuckRecords.length > 0) {
          const stuckModuleIds = stuckRecords.map((r) => r.module);
          const moduleDocs = await Module.find({ _id: { $in: stuckModuleIds } })
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

              // Track points that need to be added to gamification
              if (previousVideoPoints === 0) {
                repairedPointsDelta += POINTS.VIDEO_COMPLETION;
              }
            }
          }

          // Sync repaired points to gamification
          if (repairedPointsDelta > 0) {
            await Gamification.findOneAndUpdate(
              { user: currentUserId },
              { $inc: { totalPoints: repairedPointsDelta } },
              { upsert: true }
            );
          }
        }
      }

      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        LearnerProgress.find(filter)
          .populate('user', 'name empId')
          .populate('course', 'title')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        LearnerProgress.countDocuments(filter),
      ]);

      const pagination = buildPaginationMeta(total, page, limit);
      return paginatedResponse(records, pagination, 'Progress records retrieved');
    } catch (err) {
      console.error('[Progress/GET] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);

// PATCH /api/progress — marks content as viewed
const updateProgressSchema = z.object({
  moduleId: z.string({ required_error: 'Module ID is required' }),
  contentIndex: z.number().int().min(0, 'Content index is required'),
});

export const PATCH = withAuth(
  async (request: NextRequest) => {
    try {
      const body: unknown = await request.json();
      const parsed = updateProgressSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const currentUserId = request.headers.get('x-user-id') ?? '';
      const { moduleId, contentIndex } = parsed.data;

      let progress = await LearnerProgress.findOne({
        user: currentUserId,
        module: moduleId,
      });

      // Module already completed — no further processing needed
      if (progress && progress.status === 'completed') {
        return successResponse(progress.toJSON(), 'Module already completed');
      }

      if (!progress) {
        // Auto-create progress record if missing (e.g., module added after assignment)
        const moduleDoc2 = await Module.findById(moduleId).lean();
        if (!moduleDoc2) {
          return errorResponse('Module not found', 404);
        }
        progress = new LearnerProgress({
          user: currentUserId,
          course: moduleDoc2.course,
          module: moduleId,
          status: 'not_started',
          completedContents: [],
          videoCompleted: false,
          videoPoints: 0,
          quizAttempts: [],
          quizPassed: false,
          quizPoints: 0,
          proofOfWorkPoints: 0,
          totalModulePoints: 0,
        });
      }

      // Add content index to completed (deduplicate)
      if (!progress.completedContents.includes(contentIndex)) {
        progress.completedContents.push(contentIndex);
      }

      // Get module to check completion
      const moduleDoc = await Module.findById(moduleId).lean();
      if (moduleDoc) {
        const totalContents = moduleDoc.contents.length;
        const allContentsCompleted =
          totalContents > 0 && progress.completedContents.length >= totalContents;

        // Once all contents are viewed, mark video phase as done and award points
        if (allContentsCompleted && !progress.videoCompleted) {
          progress.videoCompleted = true;
          progress.videoPoints = POINTS.VIDEO_COMPLETION;

          const hasQuiz = moduleDoc.quiz !== null && moduleDoc.quiz !== undefined;

          if (!hasQuiz) {
            // No quiz — content completion alone = module complete
            progress.status = 'completed';
            progress.completedAt = new Date();
          } else if (progress.quizPassed) {
            // Quiz exists AND already passed — module complete
            progress.status = 'completed';
            progress.completedAt = new Date();
          } else {
            // Quiz exists but not passed yet — wait for quiz
            progress.status = 'in_progress';
          }

          progress.totalModulePoints =
            progress.videoPoints + progress.quizPoints + progress.proofOfWorkPoints;

          // Update gamification (auto-create if missing)
          let gamification = await Gamification.findOne({ user: currentUserId });
          if (!gamification) {
            gamification = new Gamification({
              user: currentUserId,
              totalPoints: 0,
              badges: [],
              streak: { current: 0, longest: 0 },
            });
          }

          gamification.totalPoints += POINTS.VIDEO_COMPLETION;

          // Check badges
          for (const tier of BADGE_TIERS) {
            const alreadyHas = gamification.badges.some((b) => b.name === tier.name);
            if (!alreadyHas && gamification.totalPoints >= tier.threshold) {
              gamification.badges.push({
                name: tier.name,
                threshold: tier.threshold,
                earnedAt: new Date(),
                icon: tier.icon,
              });
            }
          }

          await gamification.save();
        } else if (progress.status === 'not_started' && progress.completedContents.length > 0) {
          progress.status = 'in_progress';
        }
      }

      // Always recalculate total
      progress.totalModulePoints =
        (progress.videoPoints || 0) + (progress.quizPoints || 0) + (progress.proofOfWorkPoints || 0);

      await progress.save();

      // Update daily streak on every content activity
      await updateStreak(currentUserId);

      return successResponse(progress.toJSON(), 'Progress updated');
    } catch (err) {
      console.error('[Progress/PATCH] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['staff']
);
