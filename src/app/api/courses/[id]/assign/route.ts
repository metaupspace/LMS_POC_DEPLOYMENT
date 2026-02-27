import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Course from '@/lib/db/models/Course';
import Module from '@/lib/db/models/Module';
import LearnerProgress from '@/lib/db/models/LearnerProgress';
import { withAuth } from '@/lib/auth/rbac';
import { assignCourseSchema } from '@/lib/validators/course';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { redisDelPattern } from '@/lib/redis/client';
import { publishToQueue } from '@/lib/rabbitmq/producer';
import { QUEUE_NAMES } from '@/lib/rabbitmq/connection';
import { z } from 'zod';

const assignBodySchema = z.object({
  coachId: z.string().optional(),
  staffIds: assignCourseSchema.shape.staffIds.optional(),
});

// POST /api/courses/[id]/assign
export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body: unknown = await request.json();
      const parsed = assignBodySchema.safeParse(body);
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

      const { coachId, staffIds } = parsed.data;

      // Assign coach
      if (coachId) {
        course.coach = coachId as unknown as typeof course.coach;
      }

      // Assign staff (deduplicate)
      if (staffIds && staffIds.length > 0) {
        const existingIds = new Set(course.assignedStaff.map((s) => s.toString()));
        const newStaffIds = staffIds.filter((sid) => !existingIds.has(sid));

        if (newStaffIds.length > 0) {
          course.assignedStaff.push(
            ...newStaffIds.map((sid) => sid as unknown as typeof course.assignedStaff[0])
          );

          // Create LearnerProgress records for each new staff + each module
          const modules = await Module.find({ course: id }).select('_id').lean();

          const progressRecords = newStaffIds.flatMap((staffId) =>
            modules.map((mod) => ({
              user: staffId,
              course: id,
              module: mod._id,
              status: 'not_started',
              completedContents: [],
              videoCompleted: false,
              videoPoints: 0,
              quizAttempts: [],
              quizPassed: false,
              quizPoints: 0,
              proofOfWorkPoints: 0,
              totalModulePoints: 0,
            }))
          );

          if (progressRecords.length > 0) {
            await LearnerProgress.insertMany(progressRecords, { ordered: false }).catch(() => {
              // Ignore duplicate key errors for already-existing progress records
            });
          }

          // Publish assignment notifications
          for (const staffId of newStaffIds) {
            await publishToQueue(QUEUE_NAMES.NOTIFICATION, {
              type: 'assignment',
              payload: {
                userId: staffId,
                courseId: id,
                courseTitle: course.title,
              },
              timestamp: new Date().toISOString(),
            }).catch((err) => {
              console.error('[Courses/Assign] Notification publish error:', err);
            });
          }
        }
      }

      await course.save();

      const updated = await Course.findById(id)
        .populate('coach', 'name empId')
        .populate('assignedStaff', 'name empId')
        .lean();

      // Invalidate course list cache
      await redisDelPattern('courses:list:*').catch(() => {});

      return successResponse(updated, 'Course assigned successfully');
    } catch (err) {
      console.error('[Courses/Assign] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
