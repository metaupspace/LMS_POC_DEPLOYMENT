import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Quiz from '@/lib/db/models/Quiz';
import Module from '@/lib/db/models/Module';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { quizAttemptSchema } from '@/lib/validators/quiz';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { publishToQueue } from '@/lib/rabbitmq/producer';
import { QUEUE_NAMES } from '@/lib/rabbitmq/connection';
import { POINTS, BADGE_TIERS } from '@/lib/constants';

// POST /api/quizzes/[id]/attempt
export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body: unknown = await request.json();
      const parsed = quizAttemptSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { id } = await context.params;
      const currentUserId = request.headers.get('x-user-id') ?? '';

      const quiz = await Quiz.findById(id).lean();
      if (!quiz) {
        return errorResponse('Quiz not found', 404);
      }

      const moduleDoc = await Module.findById(quiz.module).lean();
      if (!moduleDoc) {
        return errorResponse('Associated module not found', 404);
      }

      // Find learner progress (auto-create if missing)
      let progress = await LearnerProgress.findOne({
        user: currentUserId,
        module: quiz.module,
      });

      if (!progress) {
        // Auto-create progress record
        progress = new LearnerProgress({
          user: currentUserId,
          course: moduleDoc.course,
          module: quiz.module,
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

      // Check if already passed
      if (progress.quizPassed) {
        return errorResponse('You have already passed this quiz', 400);
      }

      // Check max attempts
      const attemptsUsed = progress.quizAttempts.length;
      if (attemptsUsed >= quiz.maxAttempts) {
        return errorResponse('Maximum quiz attempts reached', 400);
      }

      // Auto-grade
      const { answers } = parsed.data;
      let correctCount = 0;
      let totalPoints = 0;

      for (const answer of answers) {
        const question = quiz.questions[answer.questionIndex];
        if (!question) continue;

        totalPoints += question.points;
        const selectedOption = question.options[answer.selectedOption];
        if (selectedOption?.isCorrect) {
          correctCount += question.points;
        }
      }

      const scorePercentage = totalPoints > 0 ? Math.round((correctCount / totalPoints) * 100) : 0;
      const passed = scorePercentage >= quiz.passingScore;

      // Record attempt
      progress.quizAttempts.push({
        score: scorePercentage,
        passed,
        answers,
        attemptedAt: new Date(),
      });

      let pointsEarned = 0;

      if (passed) {
        progress.quizPassed = true;
        progress.quizPoints = POINTS.QUIZ_PASS;
        pointsEarned = POINTS.QUIZ_PASS;

        // Check if module is complete (content + quiz done)
        // Check both the flag and actual completedContents in case flag wasn't set
        const totalContents = moduleDoc.contents?.length ?? 0;
        const allContentsDone =
          progress.videoCompleted ||
          (totalContents > 0 && progress.completedContents.length >= totalContents);

        if (allContentsDone) {
          progress.videoCompleted = true;
          progress.videoPoints = progress.videoPoints || POINTS.VIDEO_COMPLETION;
          progress.status = 'completed';
          progress.completedAt = new Date();
        } else {
          progress.status = 'in_progress';
        }

        progress.totalModulePoints = progress.videoPoints + progress.quizPoints + progress.proofOfWorkPoints;

        // Update Gamification (auto-create if missing)
        let gamification = await Gamification.findOne({ user: currentUserId });
        if (!gamification) {
          gamification = new Gamification({
            user: currentUserId,
            totalPoints: 0,
            badges: [],
            streak: { current: 0, longest: 0 },
          });
        }

        gamification.totalPoints += pointsEarned;

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

            // Publish badge notification
            await publishToQueue(QUEUE_NAMES.NOTIFICATION, {
              type: 'badge_earned',
              payload: {
                userId: currentUserId,
                badgeName: tier.name,
                badgeIcon: tier.icon,
              },
              timestamp: new Date().toISOString(),
            }).catch(() => {});
          }
        }

        // Update streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastActivity = gamification.streak.lastActivityDate;

        if (lastActivity) {
          const lastDate = new Date(lastActivity);
          lastDate.setHours(0, 0, 0, 0);
          const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            gamification.streak.current += 1;
          } else if (diffDays > 1) {
            gamification.streak.current = 1;
          }
        } else {
          gamification.streak.current = 1;
        }

        if (gamification.streak.current > gamification.streak.longest) {
          gamification.streak.longest = gamification.streak.current;
        }
        gamification.streak.lastActivityDate = new Date();

        await gamification.save();
      } else {
        if (progress.status === 'not_started') {
          progress.status = 'in_progress';
        }
      }

      await progress.save();

      const attemptNumber = progress.quizAttempts.length;
      const attemptsRemaining = quiz.maxAttempts - attemptNumber;

      return successResponse(
        {
          score: scorePercentage,
          passed,
          attemptsRemaining,
          pointsEarned,
          correctCount,
          totalQuestions: quiz.questions.length,
          attemptNumber,
          maxAttempts: quiz.maxAttempts,
        },
        passed ? 'Quiz passed!' : 'Quiz not passed. Try again.',
      );
    } catch (err) {
      console.error('[Quizzes/Attempt] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['staff']
);
