import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Public paths that don't require authentication
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/refresh',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
];

// Role-based route access
const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/admin'],
  manager: ['/admin'],
  coach: ['/coach'],
  staff: ['/learner'],
};

// Home redirects per role
const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  manager: '/admin/dashboard',
  coach: '/coach/home',
  staff: '/learner/home',
};

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path));
}

interface TokenPayload {
  userId: string;
  empId: string;
  role: string;
  name: string;
}

async function verifyToken(token: string): Promise<TokenPayload | null> {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return {
      userId: payload.userId as string,
      empId: payload.empId as string,
      role: payload.role as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Allow static files and public assets
  if (
    pathname.startsWith('/public') ||
    pathname.startsWith('/design-system') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Extract token from cookie or Authorization header
  const token =
    request.cookies.get('accessToken')?.value ??
    request.headers.get('authorization')?.replace('Bearer ', '') ??
    null;

  // No token → redirect to login (for pages) or return 401 (for API)
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, data: null, message: 'Authentication required', error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const user = await verifyToken(token);

  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, data: null, message: 'Invalid or expired token', error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('accessToken');
    response.cookies.delete('refreshToken');
    return response;
  }

  // If user hits /onboarding, allow for first login password change
  if (pathname === '/onboarding') {
    return NextResponse.next();
  }

  // Redirect /admin to /admin/dashboard (no page at /admin root)
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Role-based route protection
  const allowedPrefixes = ROLE_ROUTES[user.role];

  if (allowedPrefixes) {
    const hasAccess = allowedPrefixes.some((prefix) => pathname.startsWith(prefix));

    // If trying to access a role-specific area they shouldn't
    if (!hasAccess && (pathname.startsWith('/admin') || pathname.startsWith('/coach') || pathname.startsWith('/learner'))) {
      // Redirect to their home page
      const homeUrl = ROLE_HOME[user.role] ?? '/login';
      return NextResponse.redirect(new URL(homeUrl, request.url));
    }
  }

  // Inject user info into request headers for API routes
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.userId);
  response.headers.set('x-user-role', user.role);
  response.headers.set('x-user-empid', user.empId);
  response.headers.set('x-user-name', user.name);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
