import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Module from '@/lib/db/models/Module';
import Course from '@/lib/db/models/Course';
import Quiz from '@/lib/db/models/Quiz';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { z } from 'zod';

const updateModuleSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().optional(),
  order: z.number().int().min(0).optional(),
  contents: z
    .array(
      z.object({
        type: z.enum(['video', 'text']),
        title: z.string().trim().min(1),
        data: z.string().min(1),
        duration: z.number().min(0).optional().default(0),
        downloadable: z.boolean().optional().default(false),
      })
    )
    .optional(),
});

// GET /api/modules/[id]
export const GET = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      const moduleDoc = await Module.findById(id).populate('quiz').lean();
      if (!moduleDoc) {
        return errorResponse('Module not found', 404);
      }

      // Staff can only view if course is assigned to them
      if (currentRole === 'staff') {
        const course = await Course.findById(moduleDoc.course).lean();
        if (!course || !course.assignedStaff.some((s) => s.toString() === currentUserId)) {
          return errorResponse('Insufficient permissions', 403);
        }
      }

      return successResponse(moduleDoc, 'Module retrieved successfully');
    } catch (err) {
      console.error('[Modules/GET/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);

// PATCH /api/modules/[id]
export const PATCH = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body: unknown = await request.json();
      const parsed = updateModuleSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { id } = await context.params;

      const moduleDoc = await Module.findById(id);
      if (!moduleDoc) {
        return errorResponse('Module not found', 404);
      }

      const updated = await Module.findByIdAndUpdate(id, parsed.data, { new: true }).lean();
      return successResponse(updated, 'Module updated successfully');
    } catch (err) {
      console.error('[Modules/PATCH/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);

// DELETE /api/modules/[id]
export const DELETE = withAuth(
  async (_request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;

      const moduleDoc = await Module.findById(id);
      if (!moduleDoc) {
        return errorResponse('Module not found', 404);
      }

      // Remove from Course.modules array
      await Course.findByIdAndUpdate(moduleDoc.course, {
        $pull: { modules: id },
      });

      // Delete associated quiz
      if (moduleDoc.quiz) {
        await Quiz.findByIdAndDelete(moduleDoc.quiz);
      }

      // Delete associated LearnerProgress records
      await LearnerProgress.deleteMany({ module: id });

      // Delete the module
      await Module.findByIdAndDelete(id);

      return successResponse(null, 'Module deleted successfully');
    } catch (err) {
      console.error('[Modules/DELETE/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
