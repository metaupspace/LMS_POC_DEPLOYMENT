import { type NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from './jwt';
import { connectDB } from '@/lib/db/connect';
import User from '@/lib/db/models/User';
import { errorResponse } from '@/lib/utils/apiResponse';
import { UserStatus } from '@/types/enums';
import type { JwtPayload } from '@/types/api';
import type { UserRole } from '@/types/enums';

// Permission map: which roles can access which resources
export const PERMISSION_MAP: Record<string, UserRole[]> = {
  // User management
  'users:create': ['admin', 'manager'],
  'users:read': ['admin', 'manager'],
  'users:update': ['admin', 'manager'],
  'users:delete': ['admin'],

  // Course management
  'courses:create': ['admin', 'manager'],
  'courses:read': ['admin', 'manager', 'coach', 'staff'],
  'courses:update': ['admin', 'manager'],
  'courses:delete': ['admin', 'manager'],
  'courses:assign': ['admin', 'manager'],

  // Session management
  'sessions:create': ['admin', 'manager'],
  'sessions:read': ['admin', 'manager', 'coach', 'staff'],
  'sessions:update': ['admin', 'manager'],
  'sessions:delete': ['admin', 'manager'],
  'sessions:attendance': ['admin', 'manager', 'coach', 'staff'],

  // Reports
  'reports:read': ['admin', 'manager'],
  'reports:export': ['admin', 'manager'],

  // Profile
  'profile:read': ['admin', 'manager', 'coach', 'staff'],
  'profile:update': ['admin', 'manager', 'coach', 'staff'],

  // Gamification
  'gamification:read': ['admin', 'manager', 'coach', 'staff'],

  // Notifications
  'notifications:read': ['admin', 'manager', 'coach', 'staff'],

  // Proof of Work
  'proof:submit': ['staff'],
  'proof:review': ['admin', 'manager', 'coach'],
  'proof:read': ['admin', 'manager', 'coach', 'staff'],
} as const;

function extractToken(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Fall back to cookie
  const cookieToken = request.cookies.get('accessToken')?.value;
  return cookieToken ?? null;
}

export function getAuthUser(request: NextRequest): JwtPayload | null {
  const token = extractToken(request);
  if (!token) return null;

  try {
    return verifyAccessToken(token);
  } catch {
    return null;
  }
}

type ApiHandler = (
  _request: NextRequest,
  _context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export function withAuth(handler: ApiHandler, allowedRoles: UserRole[]): ApiHandler {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const token = extractToken(request);

    if (!token) {
      return errorResponse('Authentication required', 401);
    }

    let payload: JwtPayload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return errorResponse('Invalid or expired token', 401);
    }

    // Check role authorization
    if (!allowedRoles.includes(payload.role as UserRole)) {
      return errorResponse('Insufficient permissions', 403);
    }

    // Verify user still exists and is active
    await connectDB();
    const user = await User.findById(payload.userId).select('status role').lean();

    if (!user) {
      return errorResponse('User not found', 401);
    }

    if (user.status !== UserStatus.ACTIVE) {
      return errorResponse('Account is not active', 403);
    }

    // Attach user payload to request headers for downstream use
    request.headers.set('x-user-id', payload.userId);
    request.headers.set('x-user-role', payload.role);
    request.headers.set('x-user-empid', payload.empId);
    request.headers.set('x-user-name', payload.name);

    return handler(request, context);
  };
}
