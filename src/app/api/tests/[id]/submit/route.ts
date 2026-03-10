import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import CertificationTest from '@/lib/db/models/CertificationTest';
import TestAttempt from '@/lib/db/models/TestAttempt';
import Certification from '@/lib/db/models/Certification';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { submitTestSchema } from '@/lib/validators/test';
import { publishToQueue } from '@/lib/rabbitmq/producer';
import { QUEUE_NAMES } from '@/lib/rabbitmq/connection';

const CERTIFICATION_POINTS = 50;

// POST /api/tests/[id]/submit — Submit test answers and grade
export const POST = withAuth(
  async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const body: unknown = await request.json();
    const parsed = submitTestSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
      return errorResponse(firstError, 400);
    }

    await connectDB();
    const { id: testId } = await context.params;
    const userId = request.headers.get('x-user-id')!;
    const { attemptId, answers, violations, timeSpentSeconds, wasOfflineSync } =
      parsed.data;

    // Get test with correct answers for grading
    const test = await CertificationTest.findById(testId);
    if (!test) return errorResponse('Test not found', 404);

    // Get and validate attempt
    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) return errorResponse('Attempt not found', 404);
    if (attempt.user.toString() !== userId) {
      return errorResponse('Unauthorized', 403);
    }
    if (attempt.status !== 'in_progress') {
      return errorResponse('Test already submitted', 400);
    }

    // Grade the test
    let correctCount = 0;
    let totalPoints = 0;
    let pointsEarned = 0;

    answers.forEach((ans) => {
      const question = test.questions[ans.questionIndex];
      if (!question) return;

      totalPoints += question.points || 1;
      const isCorrect =
        ans.selectedOption >= 0 &&
        ans.selectedOption < question.options.length &&
        question.options[ans.selectedOption]?.isCorrect === true;

      if (isCorrect) {
        correctCount++;
        pointsEarned += question.points || 1;
      }
    });

    const score =
      test.questions.length > 0
        ? Math.round((correctCount / test.questions.length) * 100)
        : 0;
    const passed = score >= test.passingScore;

    // Update attempt
    attempt.answers = answers.map((a) => ({
      questionIndex: a.questionIndex,
      selectedOption: a.selectedOption,
    }));
    attempt.score = score;
    attempt.correctCount = correctCount;
    attempt.totalQuestions = test.questions.length;
    attempt.passed = passed;
    attempt.pointsEarned = pointsEarned;
    attempt.totalPoints = totalPoints;
    attempt.violations = violations.map((v) => ({
      type: v.type,
      timestamp: v.timestamp ? new Date(v.timestamp) : new Date(),
      details: v.details || '',
    }));
    attempt.totalViolations = violations.length;
    attempt.timeSpentSeconds = timeSpentSeconds;
    attempt.wasOfflineSync = wasOfflineSync;
    attempt.submittedAt = new Date();
    attempt.status = 'graded';
    await attempt.save();

    let certification = null;

    // Award certification if passed
    if (passed) {
      const existing = await Certification.findOne({
        user: userId,
        test: testId,
      });

      if (!existing) {
        certification = await Certification.create({
          user: userId,
          test: testId,
          title: test.certificationTitle,
          score,
          attemptId: attempt._id,
        });

        // Notify staff
        await publishToQueue(QUEUE_NAMES.NOTIFICATION, {
          type: 'certification_earned',
          payload: {
            userIds: [userId],
            testId,
            certificationTitle: test.certificationTitle,
            score,
          },
          timestamp: new Date().toISOString(),
        }).catch(() => {});

        // Add gamification points
        await Gamification.findOneAndUpdate(
          { user: userId },
          { $inc: { totalPoints: CERTIFICATION_POINTS } },
          { upsert: true }
        ).catch(() => {});
      }
    }

    return successResponse({
      score,
      correctCount,
      totalQuestions: test.questions.length,
      passed,
      passingScore: test.passingScore,
      pointsEarned,
      totalPoints,
      certification: certification
        ? { title: certification.title, earnedAt: certification.earnedAt }
        : null,
      attemptNumber: attempt.attemptNumber,
      maxAttempts: test.maxAttempts,
      attemptsRemaining: test.maxAttempts - attempt.attemptNumber,
      totalViolations: attempt.totalViolations,
    });
  },
  ['staff']
);
