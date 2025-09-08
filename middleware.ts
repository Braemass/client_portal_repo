// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

// Edge runtime is implied for middleware; no need to export runtime here.

function isAdminEmail(email: string | null | undefined) {
  if (!email) return false;
  const list = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase env vars are missing, skip auth logic gracefully
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res;
  }

  // In middleware we can use req.cookies directly (sync)
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

  const url = new URL(req.url);
  const path = url.pathname;

  // Fetch the current user (if any)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAdminRoute = path.startsWith('/admin');
  const isLogin = path === '/login';
  const isPublicPath =
    isLogin ||
    path.startsWith('/auth/callback') ||
    path.startsWith('/reset-password') ||
    path === '/' || // allow root; your root route can redirect to /login server-side if desired
    path.startsWith('/api/'); // don't block API routes with middleware

  // 1) If NOT signed in and hitting a protected page, go to /login
  if (!user && !isPublicPath && !isAdminRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // 2) If signed in and visiting /login, bounce to role-appropriate place
  if (user && isLogin) {
    return NextResponse.redirect(new URL(isAdminEmail(user.email) ? '/admin' : '/profile', req.url));
  }

  // 3) Admin gate: user must be admin to view /admin/*
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

// IMPORTANT: matcher without capturing groups (Next.js 15 requirement)
export const config = {
  matcher: [
    // Skip Next.js assets and common static files (no capturing groups anywhere)
    '/(?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|css|js|txt|map)$).*',
  ],
};

