import { NextRequest, NextResponse } from 'next/server';
import { createClient as createSupabaseMiddleware } from '@/utils/supabase/middleware';

// ─── Route Configuration ──────────────────────────────────────────────────────

/** Routes that are always public (no auth required) */
const PUBLIC_ROUTES = ['/login', '/register', '/verify-email', '/403', '/404', '/500'];

/** Routes only the president can access */
const PRESIDENT_ONLY = [
  '/dashboard/users',
  '/dashboard/committees/new',
  '/dashboard/settings',
];

/** Routes for president + committee_leader */
const LEADER_ROUTES = [
  '/dashboard/committees',
  '/dashboard/tasks/new',
  '/dashboard/meetings/new',
  '/dashboard/analytics',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isPublicRoute = (pathname: string) =>
  PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

const matchesRoutes = (pathname: string, routes: string[]) =>
  routes.some((r) => pathname === r || pathname.startsWith(`${r}/`));

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next.js internals and static files
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // ── Supabase: refresh session cookies ─────────────────────────────────────
  // This keeps the Supabase Auth session alive without breaking existing logic.
  const supabaseResponse = createSupabaseMiddleware(request);

  // Read auth session from httpOnly cookie set by backend
  const sessionCookie = request.cookies.get('epicclub_session')?.value;
  const isAuthenticated = !!sessionCookie;

  // Read role from a separate (non-sensitive) cookie set by backend on login
  // This cookie contains only the role string (not a token), so it can be readable by JS
  const userRole = request.cookies.get('epicclub_role')?.value as
    | 'president'
    | 'committee_leader'
    | 'member'
    | undefined;

  // Helper to build a redirect while preserving Supabase session cookies
  const redirect = (url: string) => {
    const res = NextResponse.redirect(new URL(url, request.url));
    // Forward any Supabase session cookies that were set
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      res.cookies.set(name, value, options);
    });
    return res;
  };

  // ── Redirect authenticated users away from auth pages ────────────────────
  if (isAuthenticated && (pathname === '/login' || pathname === '/register')) {
    return redirect('/dashboard');
  }

  // ── Allow public routes ──────────────────────────────────────────────────
  if (isPublicRoute(pathname)) {
    return supabaseResponse;
  }

  // ── Root redirect ────────────────────────────────────────────────────────
  if (pathname === '/') {
    return redirect(isAuthenticated ? '/dashboard' : '/login');
  }

  // ── Require authentication ───────────────────────────────────────────────
  if (!isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const res = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...options }) => {
      res.cookies.set(name, value, options);
    });
    return res;
  }

  // ── Role-based access control ────────────────────────────────────────────
  if (matchesRoutes(pathname, PRESIDENT_ONLY)) {
    if (userRole !== 'president') {
      return redirect('/403');
    }
  }

  if (matchesRoutes(pathname, LEADER_ROUTES)) {
    if (userRole !== 'president' && userRole !== 'committee_leader') {
      return redirect('/403');
    }
  }

  // ── Add security headers and return Supabase-refreshed response ──────────
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     * This keeps the matcher efficient.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
