// middleware.ts
// --------------------------
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isAdminEmail, ROUTES } from '@/lib/site';

export const config = {
  matcher: [
    // Skip Next assets and static files
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|txt|map)).*)',
  ],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // We’ll return this (and let Supabase write cookies to it)
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? null;
  const loggedIn = !!email;
  const admin = email && isAdminEmail(email);

  const PUBLIC = new Set<string>([ROUTES.LOGIN, '/auth/callback', '/reset-password']);
  const isPublic =
    PUBLIC.has(pathname) || pathname.startsWith('/reset-password');

  // 1) Unauthed → /login
  if (!loggedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.LOGIN;
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // 2) Authed going to /login → bounce to home
  if (pathname === ROUTES.LOGIN && loggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = admin ? ROUTES.ADMIN_HOME : ROUTES.USER_HOME;
    return NextResponse.redirect(url);
  }

  // 3) Non-admin trying to access /admin → send to /profile
  if (pathname.startsWith(ROUTES.ADMIN_HOME) && !admin) {
    const url = req.nextUrl.clone();
    url.pathname = ROUTES.USER_HOME;
    return NextResponse.redirect(url);
  }

  return res;
}

