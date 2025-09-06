// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ROUTES, isAdmin } from '@/lib/site';

export const runtime = 'nodejs'; // needed for supabase-js ws/lib

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = new URL(req.url);

  // Build a mutable response for cookie updates
  const res = NextResponse.next();

  // Supabase SSR client with request/response cookie bridge
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options?: any) => {
        res.cookies.set({ name, value, ...(options || {}) });
      },
      remove: (name: string, options?: any) => {
        res.cookies.set({ name, value: '', ...(options || {}), maxAge: 0 });
      },
    },
  });

  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email?.toLowerCase() || null;
  const authed = !!email;
  const admin = authed && isAdmin(email);

  // If already signed in, keep people away from /login
  if (pathname === ROUTES.login && authed) {
    const next = searchParams.get('next');
    const dest = admin ? ROUTES.admin : next || ROUTES.profile;
    return NextResponse.redirect(new URL(dest, req.url));
  }

  // Guard /admin for admins only
  if (pathname.startsWith(ROUTES.admin)) {
    if (!authed) {
      const u = new URL(ROUTES.login, req.url);
      u.searchParams.set('next', ROUTES.admin);
      return NextResponse.redirect(u);
    }
    if (!admin) {
      return NextResponse.redirect(new URL(ROUTES.profile, req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/',                 // home
    '/login',
    '/profile',
    '/admin/:path*',
    '/projects/:path*',
  ],
};


