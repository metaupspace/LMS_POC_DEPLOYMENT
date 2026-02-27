import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Module from '@/lib/db/models/Module';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// GET /api/courses/[id]/modules
export const GET = withAuth(
  async (_request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;

      const modules = await Module.find({ course: id })
        .populate('quiz')
        .sort({ order: 1 })
        .lean();

      return successResponse(modules, 'Modules retrieved successfully');
    } catch (err) {
      console.error('[Courses/Modules] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);
