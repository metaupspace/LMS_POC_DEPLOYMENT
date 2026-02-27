import { type NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { withAuth } from '@/lib/auth/rbac';
import { successResponse, errorResponse } from '@/lib/utils/apiResponse';

// GET /api/users/metadata — returns distinct domains and locations
export const GET = withAuth(
  async (_request: NextRequest) => {
    try {
      await connectDB();

      const [domains, locations] = await Promise.all([
        User.distinct('domain', { domain: { $ne: '' } }),
        User.distinct('location', { location: { $ne: '' } }),
      ]);

      return successResponse(
        {
          domains: domains.sort(),
          locations: locations.sort(),
        },
        'Metadata retrieved successfully'
      );
    } catch (err) {
      console.error('[Users/Metadata] Error:', err instanceof Error ? err.message : err);
      return errorResponse('Internal server error', 500);
    }
  },
  ['admin', 'manager']
);
