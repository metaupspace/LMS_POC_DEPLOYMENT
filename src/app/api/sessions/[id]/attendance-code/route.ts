import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import TrainingSession from '@/lib/db/models/TrainingSession';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { randomInt } from 'crypto';

// POST /api/sessions/[id]/attendance-code
export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      await connectDB();
      const { id } = await context.params;
      const currentUserId = request.headers.get('x-user-id');

      const session = await TrainingSession.findById(id);
      if (!session) {
        return errorResponse('Session not found', 404);
      }

      // Coach must be the instructor for this session
      if (session.instructor.toString() !== currentUserId) {
        return errorResponse('Only the session instructor can generate an attendance code', 403);
      }

      if (session.status !== 'upcoming') {
        return errorResponse('Attendance code can only be generated for upcoming sessions', 400);
      }

      // Generate 6-digit random code
      const code = String(randomInt(100000, 999999));

      // Set 30-minute expiry
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

      session.attendanceCode = code;
      session.attendanceCodeExpiresAt = expiresAt;
      await session.save();

      return successResponse(
        { attendanceCode: code, expiresAt: expiresAt.toISOString() },
        'Attendance code generated'
      );
    } catch (err) {
      console.error('[Sessions/AttendanceCode] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['coach']
);
