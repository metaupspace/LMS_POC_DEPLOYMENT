import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import TrainingSession from '@/lib/db/models/TrainingSession';
import Gamification from '@/lib/db/models/Gamification';
import { withAuth } from '@/lib/auth/rbac';
import { markAttendanceSchema } from '@/lib/validators/session';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { POINTS, BADGE_TIERS } from '@/lib/constants';

// POST /api/sessions/[id]/mark-attendance
export const POST = withAuth(
  async (request: NextRequest, context) => {
    try {
      const body: unknown = await request.json();
      const parsed = markAttendanceSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
        return errorResponse(firstError, 400);
      }

      await connectDB();
      const { id } = await context.params;
      const currentUserId = request.headers.get('x-user-id') ?? '';

      const session = await TrainingSession.findById(id);
      if (!session) {
        return errorResponse('Session not found', 404);
      }

      // Validate code
      if (session.attendanceCode !== parsed.data.attendanceCode) {
        return errorResponse('Invalid attendance code', 400);
      }

      // Check code hasn't expired
      if (session.attendanceCodeExpiresAt && new Date() > session.attendanceCodeExpiresAt) {
        return errorResponse('Attendance code has expired', 400);
      }

      // Check staff is enrolled
      const isEnrolled = session.enrolledStaff.some((s) => s.toString() === currentUserId);
      if (!isEnrolled) {
        return errorResponse('You are not enrolled in this session', 403);
      }

      // Check staff hasn't already marked attendance
      const alreadyMarked = session.attendance.some(
        (a) => a.staff.toString() === currentUserId
      );
      if (alreadyMarked) {
        return errorResponse('Attendance already marked', 400);
      }

      // Add attendance record
      session.attendance.push({
        staff: currentUserId as unknown as typeof session.attendance[0]['staff'],
        markedAt: new Date(),
        status: 'present',
      });

      await session.save();

      // Award session attendance points
      let gamification = await Gamification.findOne({ user: currentUserId });
      if (!gamification) {
        gamification = new Gamification({
          user: currentUserId,
          totalPoints: 0,
          badges: [],
          streak: { current: 0, longest: 0 },
        });
      }

      gamification.totalPoints += POINTS.SESSION_ATTENDANCE;

      // Check badge thresholds
      for (const tier of BADGE_TIERS) {
        const alreadyHas = gamification.badges.some((b) => b.name === tier.name);
        if (!alreadyHas && gamification.totalPoints >= tier.threshold) {
          gamification.badges.push({
            name: tier.name,
            threshold: tier.threshold,
            earnedAt: new Date(),
            icon: tier.icon,
          });
        }
      }

      await gamification.save();

      return successResponse(null, 'Attendance marked successfully');
    } catch (err) {
      console.error('[Sessions/MarkAttendance] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['staff']
);
