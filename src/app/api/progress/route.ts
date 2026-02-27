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
import { ContentType } from '@/types/enums';
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

      const courseId = searchParams.get('courseId');
      if (courseId) filter.course = courseId;

      // Coach: only progress for their assigned courses
      if (currentRole === 'coach') {
        const coachCourses = await Course.find({ coach: currentUserId }).select('_id').lean();
        const courseIds = coachCourses.map((c) => c._id);
        filter.course = { $in: courseIds };
      }

      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        LearnerProgress.find(filter)
          .populate('user', 'name empId')
          .populate('course', 'title')
          .populate('module', 'title order')
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
  ['admin', 'manager', 'coach']
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

      const progress = await LearnerProgress.findOne({
        user: currentUserId,
        module: moduleId,
      });

      if (!progress) {
        return errorResponse('Progress record not found', 404);
      }

      // Add content index to completed (deduplicate)
      if (!progress.completedContents.includes(contentIndex)) {
        progress.completedContents.push(contentIndex);
      }

      // Get module to check if all video contents are completed
      const moduleDoc = await Module.findById(moduleId).lean();
      if (moduleDoc) {
        const videoContentIndices = moduleDoc.contents
          .map((c, idx) => ({ type: c.type, idx }))
          .filter((c) => c.type === ContentType.VIDEO)
          .map((c) => c.idx);

        const allVideosCompleted = videoContentIndices.every((idx) =>
          progress.completedContents.includes(idx)
        );

        if (allVideosCompleted && videoContentIndices.length > 0 && !progress.videoCompleted) {
          progress.videoCompleted = true;
          progress.videoPoints = POINTS.VIDEO_COMPLETION;

          // If quiz also passed, mark module as completed
          if (progress.quizPassed) {
            progress.status = 'completed';
            progress.completedAt = new Date();
          } else {
            progress.status = 'in_progress';
          }

          progress.totalModulePoints =
            progress.videoPoints + progress.quizPoints + progress.proofOfWorkPoints;

          // Update gamification
          const gamification = await Gamification.findOne({ user: currentUserId });
          if (gamification) {
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

            // Update streak
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const lastActivity = gamification.streak.lastActivityDate;
            if (lastActivity) {
              const lastDate = new Date(lastActivity);
              lastDate.setHours(0, 0, 0, 0);
              const diffDays = Math.floor(
                (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              if (diffDays === 1) gamification.streak.current += 1;
              else if (diffDays > 1) gamification.streak.current = 1;
            } else {
              gamification.streak.current = 1;
            }
            if (gamification.streak.current > gamification.streak.longest) {
              gamification.streak.longest = gamification.streak.current;
            }
            gamification.streak.lastActivityDate = new Date();
            await gamification.save();
          }
        } else if (progress.status === 'not_started') {
          progress.status = 'in_progress';
        }
      }

      await progress.save();

      return successResponse(progress.toJSON(), 'Progress updated');
    } catch (err) {
      console.error('[Progress/PATCH] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['staff']
);
