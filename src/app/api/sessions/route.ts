import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import TrainingSession from '@/lib/db/models/TrainingSession';
import { withAuth } from '@/lib/auth/rbac';
import { createSessionSchema } from '@/lib/validators/session';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/utils/apiResponse';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils/pagination';
import type { FilterQuery } from 'mongoose';
import type { ITrainingSession } from '@/types';

// GET /api/sessions
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();

      // Session status sync is handled by the cron job — no inline sync needed

      const { searchParams } = new URL(request.url);
      const { page, limit, search, sortBy, sortOrder } = getPaginationParams(searchParams);
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      const filter: FilterQuery<ITrainingSession> = {};

      // Coach: sessions where instructor is current user
      if (currentRole === 'coach') {
        filter.instructor = currentUserId;
      }

      // Staff: sessions where enrolled
      if (currentRole === 'staff') {
        filter.enrolledStaff = currentUserId;
      }

      // Status filter
      const status = searchParams.get('status');
      if (status) filter.status = status;

      // Domain filter
      const domain = searchParams.get('domain');
      if (domain) filter.domain = domain;

      // Date range filter
      const dateFrom = searchParams.get('dateFrom');
      const dateTo = searchParams.get('dateTo');
      if (dateFrom || dateTo) {
        filter.date = {};
        if (dateFrom) filter.date.$gte = new Date(dateFrom);
        if (dateTo) filter.date.$lte = new Date(dateTo);
      }

      // Search
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const sortField = sortBy ?? 'date';
      const sortDir = sortOrder === 'asc' ? 1 : -1;
      const skip = (page - 1) * limit;

      const [sessions, total] = await Promise.all([
        TrainingSession.find(filter)
          .populate('instructor', 'name empId')
          .populate('enrolledStaff', 'name empId')
          .sort({ [sortField]: sortDir })
          .skip(skip)
          .limit(limit)
          .lean(),
        TrainingSession.countDocuments(filter),
      ]);

      const pagination = buildPaginationMeta(total, page, limit);
      return paginatedResponse(sessions, pagination, 'Sessions retrieved successfully');
    } catch (err) {
      console.error('[Sessions/GET] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);

// POST /api/sessions
export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const body: unknown = await request.json();
      const parsed = createSessionSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      const currentUserId = request.headers.get('x-user-id');
      await connectDB();

      const session = await TrainingSession.create({
        ...parsed.data,
        createdBy: currentUserId,
      });

      return successResponse(session.toJSON(), 'Session created successfully', 201);
    } catch (err) {
      console.error('[Sessions/POST] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
