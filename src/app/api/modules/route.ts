import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Module from '@/lib/db/models/Module';
import Course from '@/lib/db/models/Course';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/utils/apiResponse';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils/pagination';
import { z } from 'zod';
import type { FilterQuery } from 'mongoose';

// GET /api/modules
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const { page, limit } = getPaginationParams(searchParams);
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      const filter: FilterQuery<Record<string, unknown>> = {};

      // Filter by course if provided
      const courseId = searchParams.get('course');
      if (courseId) filter.course = courseId;

      // Staff: only modules from courses they are enrolled in
      if (currentRole === 'staff') {
        const staffCourses = await Course.find({ assignedStaff: currentUserId })
          .select('_id')
          .lean();
        const courseIds = staffCourses.map((c) => c._id);
        filter.course = courseId ? courseId : { $in: courseIds };
      }

      // Coach: only modules from their assigned courses
      if (currentRole === 'coach') {
        const coachCourses = await Course.find({ coach: currentUserId })
          .select('_id')
          .lean();
        const courseIds = coachCourses.map((c) => c._id);
        filter.course = courseId ? courseId : { $in: courseIds };
      }

      const skip = (page - 1) * limit;

      const [modules, total] = await Promise.all([
        Module.find(filter)
          .populate('quiz')
          .sort({ course: 1, order: 1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Module.countDocuments(filter),
      ]);

      const pagination = buildPaginationMeta(total, page, limit);
      return paginatedResponse(modules, pagination, 'Modules retrieved successfully');
    } catch (err) {
      console.error('[Modules/GET] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);

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
