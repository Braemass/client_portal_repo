// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ADMIN_REDIRECT, DEFAULT_USER_REDIRECT, SITE_URL, isAdmin } from '@/lib/site';

export const runtime = 'nodejs'; // ensure Node runtime for ws + cookies

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Handles OAuth / magic-link / recovery "code" exchange and redirects
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || DEFAULT_USER_REDIRECT;

  // We will set cookies on this response
  const res = NextResponse.redirect(new URL('/login', req.url)); // temp; we’ll overwrite below

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

  if (!code) {
    // no auth code present; just go to login
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Exchange the code for a session (IMPORTANT: expects a string param)
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  // Now we can read the user and decide where to go
  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email?.toLowerCase() || null;

  const dest = email && isAdmin(email) ? ADMIN_REDIRECT : next;
  return NextResponse.redirect(new URL(dest, req.url));
}

// Optional: a cookie-sync endpoint you can call after password sign-in
export async function POST(req: NextRequest) {
  // Touching the SSR client ensures cookies are set on server response as needed
  const res = NextResponse.json({ ok: true });
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
  // This read forces the helper to reconcile cookies if needed
  await supabase.auth.getSession();
  return res;
}

