import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import CertificationTest from '@/lib/db/models/CertificationTest';
import TestAttempt from '@/lib/db/models/TestAttempt';
import Certification from '@/lib/db/models/Certification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';
import { updateTestSchema } from '@/lib/validators/test';

// GET /api/tests/[id] — Get single test
export const GET = withAuth(
  async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    await connectDB();
    const { id } = await context.params;
    const currentRole = request.headers.get('x-user-role');
    const currentUserId = request.headers.get('x-user-id');

    const test = await CertificationTest.findById(id)
      .populate('assignedStaff', 'name empId email domain')
      .populate('createdBy', 'name')
      .lean();

    if (!test) return errorResponse('Test not found', 404);

    const testObj = test as Record<string, unknown>;

    // Strip isCorrect for staff
    if (currentRole === 'staff') {
      const questions = testObj.questions as Array<Record<string, unknown>>;
      testObj.questions = questions.map((q) => ({
        ...q,
        options: (q.options as Array<Record<string, unknown>>).map((o) => ({
          text: o.text,
          image: o.image,
        })),
      }));

      // Include staff's attempts and certification status
      const attempts = await TestAttempt.find({
        user: currentUserId,
        test: id,
      })
        .sort({ attemptNumber: 1 })
        .lean();

      const certification = await Certification.findOne({
        user: currentUserId,
        test: id,
      }).lean();

      return successResponse({
        ...testObj,
        myAttempts: attempts,
        myCertification: certification,
      });
    }

    return successResponse(testObj);
  },
  ['admin', 'manager', 'staff']
);

// PATCH /api/tests/[id] — Update test
export const PATCH = withAuth(
  async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const body: unknown = await request.json();
    const parsed = updateTestSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
      return errorResponse(firstError, 400);
    }

    await connectDB();
    const { id } = await context.params;

    const test = await CertificationTest.findByIdAndUpdate(id, parsed.data, {
      new: true,
    });

    if (!test) return errorResponse('Test not found', 404);

    return successResponse(test.toJSON(), 'Test updated successfully');
  },
  ['admin', 'manager']
);

// DELETE /api/tests/[id] — Delete test and related data
export const DELETE = withAuth(
  async (_request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    await connectDB();
    const { id } = await context.params;

    const test = await CertificationTest.findById(id);
    if (!test) return errorResponse('Test not found', 404);

    await Promise.all([
      CertificationTest.findByIdAndDelete(id),
      TestAttempt.deleteMany({ test: id }),
      Certification.deleteMany({ test: id }),
    ]);

    return successResponse(null, 'Test deleted successfully');
  },
  ['admin', 'manager']
);
