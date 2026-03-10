import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import CertificationTest from '@/lib/db/models/CertificationTest';
import TestAttempt from '@/lib/db/models/TestAttempt';
import Certification from '@/lib/db/models/Certification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// POST /api/tests/[id]/start — Start or resume a test attempt
export const POST = withAuth(
  async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    await connectDB();
    const { id: testId } = await context.params;
    const userId = request.headers.get('x-user-id')!;

    const test = await CertificationTest.findById(testId);
    if (!test) return errorResponse('Test not found', 404);
    if (test.status !== 'active') return errorResponse('Test is not active', 400);

    // Check assignment
    const isAssigned = test.assignedStaff.some(
      (s) => s.toString() === userId
    );
    if (!isAssigned) {
      return errorResponse('You are not assigned to this test', 403);
    }

    // Check if already certified
    const certified = await Certification.findOne({
      user: userId,
      test: testId,
    });
    if (certified) {
      return errorResponse('You already hold this certification', 400);
    }

    // Check attempt limit
    const existingAttempts = await TestAttempt.countDocuments({
      user: userId,
      test: testId,
    });
    if (existingAttempts >= test.maxAttempts) {
      return errorResponse(
        `Maximum attempts (${test.maxAttempts}) exhausted`,
        400
      );
    }

    // Check for in-progress attempt — resume it
    const inProgress = await TestAttempt.findOne({
      user: userId,
      test: testId,
      status: 'in_progress',
    });

    // Build questions WITHOUT isCorrect
    const buildQuestions = () =>
      test.questions.map((q, idx) => ({
        questionText: q.questionText,
        questionImage: q.questionImage,
        options: q.options.map((o) => ({ text: o.text, image: o.image })),
        points: q.points,
        index: idx,
      }));

    if (inProgress) {
      return successResponse({
        attemptId: inProgress._id,
        questions: buildQuestions(),
        answers: inProgress.answers,
        timeLimitMinutes: test.timeLimitMinutes,
        startedAt: inProgress.startedAt,
        resuming: true,
      });
    }

    // Create new attempt
    const attempt = await TestAttempt.create({
      user: userId,
      test: testId,
      answers: test.questions.map((_, idx) => ({
        questionIndex: idx,
        selectedOption: -1,
      })),
      totalQuestions: test.questions.length,
      startedAt: new Date(),
      attemptNumber: existingAttempts + 1,
      status: 'in_progress',
    });

    const questions = buildQuestions();

    // Shuffle questions if configured (deterministic based on attempt ID)
    if (test.shuffleQuestions) {
      const seed = attempt._id
        .toString()
        .split('')
        .reduce((a: number, c: string) => a + c.charCodeAt(0), 0);
      let rng = seed;
      const random = () => {
        rng = (rng * 16807) % 2147483647;
        return (rng - 1) / 2147483646;
      };
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const temp = questions[i]!;
        questions[i] = questions[j]!;
        questions[j] = temp;
      }
    }

    return successResponse(
      {
        attemptId: attempt._id,
        questions,
        answers: attempt.answers,
        timeLimitMinutes: test.timeLimitMinutes,
        startedAt: attempt.startedAt,
        resuming: false,
      },
      'Test started'
    );
  },
  ['staff']
);
