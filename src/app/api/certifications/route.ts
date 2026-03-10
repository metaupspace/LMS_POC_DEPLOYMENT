import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import Certification from '@/lib/db/models/Certification';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse } from '@/lib/utils/apiResponse';

// GET /api/certifications — Get certifications for a user
export const GET = withAuth(
  async (request: NextRequest) => {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const currentRole = request.headers.get('x-user-role');
    const currentUserId = request.headers.get('x-user-id')!;
    const queryUserId = searchParams.get('userId');

    // Staff can only see their own certifications
    const userId =
      currentRole === 'staff' ? currentUserId : queryUserId || currentUserId;

    const certifications = await Certification.find({ user: userId })
      .populate('test', 'title domain')
      .sort({ earnedAt: -1 })
      .lean();

    return successResponse(certifications);
  },
  ['admin', 'manager', 'coach', 'staff']
);
