import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userRole = request.cookies.get('user_role')?.value;
  const token = request.cookies.get('auth_token')?.value;

  // Protect /admin routes - strictly ADMIN only
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (userRole !== 'ADMIN') {
      // If an OWNER attempts to access /admin, redirect to their owner dashboard
      return NextResponse.redirect(new URL('/owner/dashboard', request.url));
    }
  }

  // Protect /owner routes - OWNER or ADMIN
  if (pathname.startsWith('/owner')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/owner/:path*'],
};
