import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Course from '@/lib/db/models/Course';
import { withAuth } from '@/lib/auth/rbac';
import { createCourseSchema } from '@/lib/validators/course';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/utils/apiResponse';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils/pagination';
import { redisGet, redisSet, redisDelPattern } from '@/lib/redis/client';
import type { FilterQuery } from 'mongoose';
import type { ICourse } from '@/types';

// GET /api/courses
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(searchParams);
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      const filter: FilterQuery<ICourse> = {};

      // Coach: only courses assigned to them
      if (currentRole === 'coach') {
        filter.coach = currentUserId;
      }

      // Staff: only courses they are enrolled in
      if (currentRole === 'staff') {
        filter.assignedStaff = currentUserId;
      }

      // Domain filter
      const domain = searchParams.get('domain');
      if (domain) filter.domain = domain;

      // Status filter — skip if empty or 'all'
      const status = searchParams.get('status');
      if (status && status !== 'all') filter.status = status;

      // Search
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      // Cache key for list queries (include role since staff gets populated modules)
      const cacheKey = `courses:list:${JSON.stringify({ filter, page, limit, sortBy, sortOrder, role: currentRole })}`;
      const cached = await redisGet<{ data: unknown[]; total: number }>(cacheKey);

      if (cached) {
        const pagination = buildPaginationMeta(cached.total, page, limit);
        return paginatedResponse(cached.data, pagination, 'Courses retrieved successfully');
      }

      const sortField = sortBy ?? 'createdAt';
      const sortDir = sortOrder === 'asc' ? 1 : -1;
      const skip = (page - 1) * limit;

      // For staff: populate modules with quiz data for the learner UI
      let query = Course.find(filter)
        .populate('coach', 'name empId')
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(limit);

      if (currentRole === 'staff') {
        query = query.populate({
          path: 'modules',
          populate: { path: 'quiz' },
        });
      }

      const [courses, total] = await Promise.all([
        query.lean(),
        Course.countDocuments(filter),
      ]);

      // Add module count
      const coursesWithCount = courses.map((c) => ({
        ...c,
        moduleCount: Array.isArray(c.modules) ? c.modules.length : 0,
      }));

      // For staff: strip isCorrect from quiz options (don't reveal answers)
      if (currentRole === 'staff') {
        for (const course of coursesWithCount) {
          if (!Array.isArray(course.modules)) continue;
          for (const mod of course.modules) {
            if (typeof mod !== 'object' || !mod) continue;
            const modObj = mod as unknown as Record<string, unknown>;
            const quiz = modObj.quiz;
            if (!quiz || typeof quiz !== 'object') continue;
            const quizObj = quiz as Record<string, unknown>;
            if (!Array.isArray(quizObj.questions)) continue;
            quizObj.questions = (quizObj.questions as Record<string, unknown>[]).map((q) => ({
              ...q,
              options: (q.options as Record<string, unknown>[]).map(
                ({ text, image }: Record<string, unknown>) => ({ text, image })
              ),
            }));
          }
        }
      }

      await redisSet(cacheKey, { data: coursesWithCount, total }, 600).catch(() => {});

      const pagination = buildPaginationMeta(total, page, limit);
      return paginatedResponse(coursesWithCount, pagination, 'Courses retrieved successfully');
    } catch (err) {
      console.error('[Courses/GET] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);

// POST /api/courses
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body: unknown = await request.json();
      const parsed = createCourseSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      const currentUserId = request.headers.get('x-user-id');
      await connectDB();

      const course = await Course.create({
        ...parsed.data,
        createdBy: currentUserId,
      });

      // Invalidate course list cache
      await redisDelPattern('courses:list:*').catch(() => {});

      return successResponse(course.toJSON(), 'Course created successfully', 201);
    } catch (err) {
      console.error('[Courses/POST] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
