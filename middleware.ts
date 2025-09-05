k// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // Always create a response we can mutate cookies on:
  const res = NextResponse.next();

  // Edge-safe Supabase client for middleware
  const supabase = createMiddlewareClient({
    req,
    res,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = req.nextUrl;
  const path = url.pathname;

  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth/');
  const isPublicAsset =
    path.startsWith('/_next') ||
    path.startsWith('/favicon') ||
    path.startsWith('/icons') ||
    path.startsWith('/images') ||
    path === '/robots.txt' ||
    path === '/sitemap.xml';

  // If not signed in, only allow login/auth and public assets
  if (!user && !isAuthRoute && !isPublicAsset) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', url.pathname + url.search);
    return NextResponse.redirect(loginUrl);
  }

  // Non-admins can only access /profile (+ assets/auth)
  if (user) {
    const adminList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const isAdmin = user.email ? adminList.includes(user.email.toLowerCase()) : false;

    if (!isAdmin) {
      const allowed =
        path === '/' ||
        path.startsWith('/profile') ||
        isAuthRoute ||
        isPublicAsset;

      if (!allowed) {
        const profileUrl = new URL('/profile', req.url);
        return NextResponse.redirect(profileUrl);
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|images/|icons/).*)',
  ],
};

