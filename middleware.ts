// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_USER_REDIRECT } from './lib/site';

// Run on every path; we’ll ignore assets manually.
export const config = {
  matcher: ['/:path*'],
};

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Skip Next.js internals & common static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    /\.(png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|txt|map)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Supabase cookie presence is enough to know if the user is signed in.
  // (Authorization / role checks happen server-side on the admin pages.)
  const isAuthed = !!req.cookies.get('sb-access-token')?.value;

  // 1) Send anonymous users to /login when hitting protected areas
  const isProtected =
    pathname.startsWith('/profile') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/admin');

  if (!isAuthed && isProtected) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname + (search || ''));
    return NextResponse.redirect(url);
  }

  // 2) If an authenticated user hits / or /login, send them to their profile
  const isAuthPage = pathname === '/login' || pathname === '/';
  if (isAuthed && isAuthPage) {
    const url = req.nextUrl.clone();
    url.pathname = DEFAULT_USER_REDIRECT;
    url.search = ''; // clear any leftover params
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

