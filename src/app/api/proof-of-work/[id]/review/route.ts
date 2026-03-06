import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import ProofOfWork from '@/lib/db/models/ProofOfWork';
import Course from '@/lib/db/models/Course';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { publishToQueue } from '@/lib/rabbitmq/producer';
import { QUEUE_NAMES } from '@/lib/rabbitmq/connection';
import { POINTS, BADGE_TIERS } from '@/lib/constants';
import { z } from 'zod';

const reviewSchema = z.object({
  status: z.enum(['approved', 'redo_requested'], {
    required_error: 'Status is required',
  }),
  reviewNote: z.string().optional().default(''),
});

// POST /api/proof-of-work/[id]/review
export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body: unknown = await request.json();
      const parsed = reviewSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { id } = await context.params;
      const currentUserId = request.headers.get('x-user-id') ?? '';

      const record = await ProofOfWork.findById(id);
      if (!record) {
        return errorResponse('Proof of work not found', 404);
      }

      record.status = parsed.data.status;
      record.reviewNote = parsed.data.reviewNote;
      record.reviewedBy = currentUserId as unknown as typeof record.reviewedBy;
      record.reviewedAt = new Date();
      await record.save();

      // If approved, add proof of work points
      if (parsed.data.status === 'approved') {
        // Find all learner progress for this user+course and add PoW points
        const progressRecords = await LearnerProgress.find({
          user: record.user,
          course: record.course,
        });

        for (const progress of progressRecords) {
          if (progress.proofOfWorkPoints === 0) {
            progress.proofOfWorkPoints = POINTS.PROOF_OF_WORK_APPROVED;
            progress.totalModulePoints =
              progress.videoPoints + progress.quizPoints + progress.proofOfWorkPoints;
            await progress.save();
          }
        }

        // Update Gamification totalPoints (auto-create if missing)
        let gamification = await Gamification.findOne({ user: record.user });
        if (!gamification) {
          gamification = new Gamification({
            user: record.user,
            totalPoints: 0,
            badges: [],
            streak: { current: 0, longest: 0 },
          });
        }

        gamification.totalPoints += POINTS.PROOF_OF_WORK_APPROVED;

        // Check badge thresholds
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
      }

      // Notify the learner about the review result
      const course = await Course.findById(record.course).select('title').lean();
      const courseTitle = course?.title ?? '';
      const learnerId = record.user.toString();

      if (parsed.data.status === 'approved') {
        await publishToQueue(QUEUE_NAMES.NOTIFICATION, {
          type: 'proof_approved',
          payload: {
            userIds: [learnerId],
            courseId: record.course.toString(),
            courseTitle,
            points: POINTS.PROOF_OF_WORK_APPROVED,
          },
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      } else {
        await publishToQueue(QUEUE_NAMES.NOTIFICATION, {
          type: 'proof_rejected',
          payload: {
            userIds: [learnerId],
            courseId: record.course.toString(),
            courseTitle,
            reviewNote: parsed.data.reviewNote,
          },
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }

      const updated = await ProofOfWork.findById(id)
        .populate('user', 'name empId')
        .populate('reviewedBy', 'name')
        .lean();

      return successResponse(updated, 'Proof of work reviewed');
    } catch (err) {
      console.error('[ProofOfWork/Review] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['coach']
);
