import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import TestAttempt from '@/lib/db/models/TestAttempt';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { reportViolationSchema } from '@/lib/validators/test';

// POST /api/tests/[id]/violation — Record a proctoring violation
export const POST = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json();
    const parsed = reportViolationSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
      return errorResponse(firstError, 400);
    }

    await connectDB();

    const { attemptId, type, details } = parsed.data;

    await TestAttempt.findByIdAndUpdate(attemptId, {
      $push: {
        violations: { type, timestamp: new Date(), details },
      },
      $inc: { totalViolations: 1 },
    });

    return successResponse(null, 'Violation recorded');
  },
  ['staff']
);
