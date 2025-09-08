// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Treat these emails as admins (comma-separated in env)
function isAdminEmail(email?: string | null) {
  if (!email) return false;
  const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // 0) Skip static assets & Next internals early (since we match everything below)
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    /\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|txt|map)$/.test(pathname);

  if (isStaticAsset) return res;

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are missing, bail gracefully
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res;

  // In middleware, cookies are sync:
  const cookieStore = req.cookies;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLogin = pathname === '/login';
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthCallback = pathname.startsWith('/auth/callback');
  const isResetPassword = pathname.startsWith('/reset-password');
  const isPublic =
    isLogin || isAuthCallback || isResetPassword || pathname === '/' || pathname.startsWith('/api/');

  // 1) Not signed in, trying to hit a protected page → send to /login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2) Signed in and on /login → bounce to role destination
  if (user && isLogin) {
    return NextResponse.redirect(new URL(isAdminEmail(user.email) ? '/admin' : '/profile', req.url));
  }

  // 3) Admin gate for /admin/*
  if (isAdminRoute) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (!isAdminEmail(user.email)) {
      return NextResponse.redirect(new URL('/profile', req.url));
    }
  }

  return res;
}

// Safe matcher with no lookaheads/capturing groups.
// We match everything and skip assets inside the middleware logic.
export const config = {
  matcher: ['/:path*'],
};

