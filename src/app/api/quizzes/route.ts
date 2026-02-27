import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Quiz from '@/lib/db/models/Quiz';
import Module from '@/lib/db/models/Module';
import { withAuth } from '@/lib/auth/rbac';
import { createQuizSchema } from '@/lib/validators/quiz';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// POST /api/quizzes
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body: unknown = await request.json();
      const parsed = createQuizSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { module: moduleId, ...quizData } = parsed.data;

      const moduleDoc = await Module.findById(moduleId);
      if (!moduleDoc) {
        return errorResponse('Module not found', 404);
      }

      if (moduleDoc.quiz) {
        return errorResponse('Module already has a quiz. Delete the existing quiz first.', 409);
      }

      const quiz = await Quiz.create({
        ...quizData,
        module: moduleId,
      });

      // Link quiz to module
      moduleDoc.quiz = quiz._id;
      await moduleDoc.save();

      return successResponse(quiz.toJSON(), 'Quiz created successfully', 201);
    } catch (err) {
      console.error('[Quizzes/POST] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
