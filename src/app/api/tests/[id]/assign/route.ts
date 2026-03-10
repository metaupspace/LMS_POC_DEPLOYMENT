import { type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db/connect';
import CertificationTest from '@/lib/db/models/CertificationTest';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { assignTestSchema } from '@/lib/validators/test';
import { publishToQueue } from '@/lib/rabbitmq/producer';
import { QUEUE_NAMES } from '@/lib/rabbitmq/connection';

// POST /api/tests/[id]/assign — Assign staff to test
export const POST = withAuth(
  async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const body: unknown = await request.json();
    const parsed = assignTestSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
      return errorResponse(firstError, 400);
    }

    await connectDB();
    const { id } = await context.params;

    const test = await CertificationTest.findById(id);
    if (!test) return errorResponse('Test not found', 404);

    // Find newly assigned staff (not already in the list)
    const existingIds = test.assignedStaff.map((s) => s.toString());
    const newIds = parsed.data.staffIds.filter(
      (sid: string) => !existingIds.includes(sid)
    );

    // Merge and deduplicate
    const allIds = [...new Set([...existingIds, ...parsed.data.staffIds])];
    test.assignedStaff = allIds.map(
      (sid) => new mongoose.Types.ObjectId(sid)
    );
    await test.save();

    // Notify newly assigned staff
    if (newIds.length > 0) {
      await publishToQueue(QUEUE_NAMES.NOTIFICATION, {
        type: 'test_assigned',
        payload: {
          userIds: newIds,
          testId: test._id.toString(),
          testTitle: test.title,
          certificationTitle: test.certificationTitle,
        },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    }

    return successResponse(
      test.toJSON(),
      `Assigned ${newIds.length} new staff member${newIds.length !== 1 ? 's' : ''}`
    );
  },
  ['admin', 'manager']
);
