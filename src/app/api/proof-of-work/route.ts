import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import ProofOfWork from '@/lib/db/models/ProofOfWork';
import Course from '@/lib/db/models/Course';
import { withAuth } from '@/lib/auth/rbac';
import { errorResponse, paginatedResponse } from '@/lib/utils/apiResponse';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils/pagination';
import type { FilterQuery } from 'mongoose';
import type { IProofOfWork } from '@/types';

// GET /api/proof-of-work
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      await connectDB();

      const { searchParams } = new URL(request.url);
      const { page, limit } = getPaginationParams(searchParams);
      const currentRole = request.headers.get('x-user-role');
      const currentUserId = request.headers.get('x-user-id');

      const filter: FilterQuery<IProofOfWork> = {};

      // Coach: only for their assigned courses
      if (currentRole === 'coach') {
        const coachCourses = await Course.find({ coach: currentUserId }).select('_id').lean();
        filter.course = { $in: coachCourses.map((c) => c._id) };
      }

      // Status filter
      const status = searchParams.get('status');
      if (status) filter.status = status;

      // Course filter
      const courseId = searchParams.get('courseId');
      if (courseId) filter.course = courseId;

      const skip = (page - 1) * limit;

      const [records, total] = await Promise.all([
        ProofOfWork.find(filter)
          .populate('user', 'name empId')
          .populate('course', 'title')
          .populate('reviewedBy', 'name')
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        ProofOfWork.countDocuments(filter),
      ]);

      const pagination = buildPaginationMeta(total, page, limit);
      return paginatedResponse(records, pagination, 'Proof of work records retrieved');
    } catch (err) {
      console.error('[ProofOfWork/GET] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach']
);
