import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Course from '@/lib/db/models/Course';
import Module from '@/lib/db/models/Module';
import Quiz from '@/lib/db/models/Quiz';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import ProofOfWork from '@/lib/db/models/ProofOfWork';
import { withAuth } from '@/lib/auth/rbac';
import { updateCourseSchema } from '@/lib/validators/course';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisDelPattern } from '@/lib/redis/client';

// GET /api/courses/[id]
export const GET = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      const course = await Course.findById(id)
        .populate('coach', 'name empId email')
        .populate('assignedStaff', 'name empId email')
        .populate('modules')
        .populate('createdBy', 'name')
        .lean();

      if (!course) {
        return errorResponse('Course not found', 404);
      }

      // Coach can only view courses assigned to them
      if (currentRole === 'coach' && course.coach?._id?.toString() !== currentUserId) {
        return errorResponse('Insufficient permissions', 403);
      }

      // Staff can only view courses they are enrolled in
      if (currentRole === 'staff') {
        const isEnrolled = course.assignedStaff?.some(
          (s: { _id?: { toString(): string }; toString(): string }) =>
            (s._id ? s._id.toString() : s.toString()) === currentUserId
        );
        if (!isEnrolled) {
          return errorResponse('Insufficient permissions', 403);
        }
      }

      return successResponse(course, 'Course retrieved successfully');
    } catch (err) {
      console.error('[Courses/GET/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);

// PATCH /api/courses/[id]
export const PATCH = withAuth(
  async (_request: NextRequest, context) => {
    try {
      const body: unknown = await _request.json();
      const parsed = updateCourseSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { id } = await context.params;

      const course = await Course.findById(id);
      if (!course) {
        return errorResponse('Course not found', 404);
      }

      const updated = await Course.findByIdAndUpdate(id, parsed.data, { new: true })
        .populate('coach', 'name empId')
        .lean();

      // Invalidate course list cache
      await redisDelPattern('courses:list:*').catch(() => {});

      return successResponse(updated, 'Course updated successfully');
    } catch (err) {
      console.error('[Courses/PATCH/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);

// DELETE /api/courses/[id] — hard delete with cascade
export const DELETE = withAuth(
  async (_request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;

      const course = await Course.findById(id);
      if (!course) {
        return errorResponse('Course not found', 404);
      }

      // Cascade delete: modules, quizzes, progress, proof of work
      const moduleIds = course.modules ?? [];
      if (moduleIds.length > 0) {
        await Quiz.deleteMany({ module: { $in: moduleIds } });
        await Module.deleteMany({ _id: { $in: moduleIds } });
      }
      await LearnerProgress.deleteMany({ course: id });
      await ProofOfWork.deleteMany({ course: id });
      await Course.findByIdAndDelete(id);

      // Invalidate course list cache
      await redisDelPattern('courses:list:*').catch(() => {});

      return successResponse(null, 'Course deleted successfully');
    } catch (err) {
      console.error('[Courses/DELETE/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
