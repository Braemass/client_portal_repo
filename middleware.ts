// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { ROUTES } from '@/lib/site';

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = new URL(req.url);
  const access = req.cookies.get('sb-access-token')?.value || req.cookies.get('sb:token')?.value;
  const authed = !!access;

  if (pathname === ROUTES.login && authed) {
    const next = searchParams.get('next') || ROUTES.profile;
    return NextResponse.redirect(new URL(next, req.url));
  }

  if (pathname.startsWith(ROUTES.admin) && !authed) {
    const u = new URL(ROUTES.login, req.url);
    u.searchParams.set('next', ROUTES.admin);
    return NextResponse.redirect(u);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/profile', '/admin/:path*', '/projects/:path*'],
};

