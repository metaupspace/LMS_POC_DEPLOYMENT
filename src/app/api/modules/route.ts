import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Module from '@/lib/db/models/Module';
import Course from '@/lib/db/models/Course';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { z } from 'zod';

const createModuleSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().optional().default(''),
  courseId: z.string({ required_error: 'Course ID is required' }),
  order: z.number().int().min(0),
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
    .optional()
    .default([]),
});

// POST /api/modules
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body: unknown = await request.json();
      const parsed = createModuleSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { courseId, ...moduleData } = parsed.data;

      const course = await Course.findById(courseId);
      if (!course) {
        return errorResponse('Course not found', 404);
      }

      const newModule = await Module.create({
        ...moduleData,
        course: courseId,
      });

      // Push module ID to course's modules array
      course.modules.push(newModule._id);
      await course.save();

      return successResponse(newModule.toJSON(), 'Module created successfully', 201);
    } catch (err) {
      console.error('[Modules/POST] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
