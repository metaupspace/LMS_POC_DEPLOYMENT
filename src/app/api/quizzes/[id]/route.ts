import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Quiz from '@/lib/db/models/Quiz';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { z } from 'zod';

const updateQuizSchema = z.object({
  questions: z
    .array(
      z.object({
        questionText: z.string().trim().min(1),
        questionImage: z.string().optional().default(''),
        options: z
          .array(
            z.object({
              text: z.string().trim().min(1),
              image: z.string().optional().default(''),
              isCorrect: z.boolean(),
            })
          )
          .min(2),
        points: z.number().int().positive().optional().default(1),
      })
    )
    .optional(),
  passingScore: z.number().min(0).max(100).optional(),
  maxAttempts: z.number().int().positive().optional(),
});

// GET /api/quizzes/[id]
export const GET = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;
      const currentRole = request.headers.get('x-user-role');

      const quiz = await Quiz.findById(id).lean();
      if (!quiz) {
        return errorResponse('Quiz not found', 404);
      }

      // For staff: exclude isCorrect from options (don't reveal answers)
      if (currentRole === 'staff') {
        const sanitized = {
          ...quiz,
          questions: quiz.questions.map((q) => ({
            ...q,
            options: q.options.map(({ text, image }) => ({ text, image })),
          })),
        };
        return successResponse(sanitized, 'Quiz retrieved successfully');
      }

      return successResponse(quiz, 'Quiz retrieved successfully');
    } catch (err) {
      console.error('[Quizzes/GET/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);

// PATCH /api/quizzes/[id]
export const PATCH = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body: unknown = await request.json();
      const parsed = updateQuizSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { id } = await context.params;

      const quiz = await Quiz.findById(id);
      if (!quiz) {
        return errorResponse('Quiz not found', 404);
      }

      const updated = await Quiz.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
      return successResponse(updated, 'Quiz updated successfully');
    } catch (err) {
      console.error('[Quizzes/PATCH/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);

// DELETE /api/quizzes/[id]
export const DELETE = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;

      const quiz = await Quiz.findById(id);
      if (!quiz) {
        return errorResponse('Quiz not found', 404);
      }

      await Quiz.findByIdAndDelete(id);
      return successResponse(null, 'Quiz deleted successfully');
    } catch (err) {
      console.error('[Quizzes/DELETE/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
