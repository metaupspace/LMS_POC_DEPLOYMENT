import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import TrainingSession from '@/lib/db/models/TrainingSession';
import { withAuth } from '@/lib/auth/rbac';
import { updateSessionSchema } from '@/lib/validators/session';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { syncSessionStatus } from '@/lib/utils/syncSessionStatus';

// GET /api/sessions/[id]
export const GET = withAuth(
  async (_request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;

      const session = await TrainingSession.findById(id)
        .populate('instructor', 'name empId email')
        .populate('enrolledStaff', 'name empId email')
        .populate('attendance.staff', 'name empId')
        .populate('createdBy', 'name')
        .lean();

      if (!session) {
        return errorResponse('Session not found', 404);
      }

      // Sync status before returning
      const computed = await syncSessionStatus(session);
      session.status = computed;

      return successResponse(session, 'Session retrieved successfully');
    } catch (err) {
      console.error('[Sessions/GET/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager', 'coach', 'staff']
);

// PATCH /api/sessions/[id]
export const PATCH = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body: unknown = await request.json();
      const parsed = updateSessionSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { id } = await context.params;

      const session = await TrainingSession.findById(id);
      if (!session) {
        return errorResponse('Session not found', 404);
      }

      const updated = await TrainingSession.findByIdAndUpdate(id, parsed.data, { new: true })
        .populate('instructor', 'name empId')
        .lean();

      return successResponse(updated, 'Session updated successfully');
    } catch (err) {
      console.error('[Sessions/PATCH/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);

// DELETE /api/sessions/[id] — hard delete
export const DELETE = withAuth(
  async (_request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;

      const session = await TrainingSession.findById(id);
      if (!session) {
        return errorResponse('Session not found', 404);
      }

      await TrainingSession.findByIdAndDelete(id);

      return successResponse(null, 'Session deleted successfully');
    } catch (err) {
      console.error('[Sessions/DELETE/:id] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
