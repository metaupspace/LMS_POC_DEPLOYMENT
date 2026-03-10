import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import CertificationTest from '@/lib/db/models/CertificationTest';
import TestAttempt from '@/lib/db/models/TestAttempt';
import Certification from '@/lib/db/models/Certification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse, paginatedResponse } from '@/lib/utils/apiResponse';
import { getPaginationParams, buildPaginationMeta } from '@/lib/utils/pagination';
import { createTestSchema } from '@/lib/validators/test';

// GET /api/tests — List certification tests
export const GET = withAuth(
  async (request: NextRequest) => {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const { page, limit, search } = getPaginationParams(searchParams);
    const status = searchParams.get('status');
    const currentRole = request.headers.get('x-user-role');
    const currentUserId = request.headers.get('x-user-id');

    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;

    // Staff only sees active tests assigned to them
    if (currentRole === 'staff') {
      filter.assignedStaff = currentUserId;
      filter.status = 'active';
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { certificationTitle: { $regex: search, $options: 'i' } },
      ];
    }

    const selectFields =
      currentRole === 'staff' ? '-questions.options.isCorrect' : '';

    const [tests, total] = await Promise.all([
      CertificationTest.find(filter)
        .select(selectFields)
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      CertificationTest.countDocuments(filter),
    ]);

    // For staff: enrich tests with attempt/certification data and optionally filter out completed
    if (currentRole === 'staff' && currentUserId) {
      const includeCompleted = searchParams.get('includeCompleted') === 'true';
      const testIds = tests.map((t: Record<string, unknown>) => t._id);

      const [allAttempts, allCerts] = await Promise.all([
        TestAttempt.find({ user: currentUserId, test: { $in: testIds } }).lean(),
        Certification.find({ user: currentUserId, test: { $in: testIds } }).lean(),
      ]);

      const certMap = new Map(
        allCerts.map((c: Record<string, unknown>) => [String(c.test), c])
      );
      const attemptMap = new Map<string, Array<Record<string, unknown>>>();
      for (const a of allAttempts) {
        const tid = String(a.test);
        if (!attemptMap.has(tid)) attemptMap.set(tid, []);
        attemptMap.get(tid)!.push(a as Record<string, unknown>);
      }

      const enrichedTests = tests.map((test: Record<string, unknown>) => {
        const tid = String(test._id);
        const cert = certMap.get(tid);
        const attempts = attemptMap.get(tid) || [];
        const gradedAttempts = attempts.filter(
          (a: Record<string, unknown>) => a.status === 'graded'
        );

        return {
          ...test,
          myStatus: cert
            ? 'certified'
            : gradedAttempts.length >= (test.maxAttempts as number)
              ? 'exhausted'
              : gradedAttempts.length > 0
                ? 'attempted'
                : 'available',
          myAttemptCount: gradedAttempts.length,
          myCertification: cert || null,
          myAttempts: attempts,
          myBestScore:
            gradedAttempts.length > 0
              ? Math.max(
                  ...gradedAttempts.map((a: Record<string, unknown>) => a.score as number)
                )
              : null,
        };
      });

      // If includeCompleted, return all enriched tests; otherwise filter to available/attempted only
      if (includeCompleted) {
        return paginatedResponse(
          enrichedTests,
          buildPaginationMeta(enrichedTests.length, 1, enrichedTests.length || limit)
        );
      }

      const available = enrichedTests.filter(
        (t: Record<string, unknown>) =>
          t.myStatus === 'available' || t.myStatus === 'attempted'
      );

      return paginatedResponse(
        available,
        buildPaginationMeta(available.length, 1, available.length || limit)
      );
    }

    return paginatedResponse(tests, buildPaginationMeta(total, page, limit));
  },
  ['admin', 'manager', 'staff']
);

// POST /api/tests — Create certification test
export const POST = withAuth(
  async (request: NextRequest) => {
    const body: unknown = await request.json();
    const parsed = createTestSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? 'Validation failed';
      return errorResponse(firstError, 400);
    }

    const currentUserId = request.headers.get('x-user-id');
    await connectDB();

    const test = await CertificationTest.create({
      ...parsed.data,
      createdBy: currentUserId,
    });

    return successResponse(test.toJSON(), 'Test created successfully', 201);
  },
  ['admin', 'manager']
);
