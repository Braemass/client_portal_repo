// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { ADMIN_REDIRECT, DEFAULT_USER_REDIRECT, SITE_URL, isAdmin } from '@/lib/site';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || DEFAULT_USER_REDIRECT;

  const res = NextResponse.redirect(new URL('/login', req.url)); // temp, overwritten below

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name) => req.cookies.get(name)?.value,
      set: (name, value, options) => res.cookies.set({ name, value, ...(options || {}) }),
      remove: (name, options) =>
        res.cookies.set({ name, value: '', ...(options || {}), maxAge: 0 }),
    },
  });

  if (!code) return NextResponse.redirect(new URL('/login', req.url));

  const { error } = await supabase.auth.exchangeCodeForSession(code); // IMPORTANT: pass string
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url)
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email?.toLowerCase() || null;
  const dest = email && isAdmin(email) ? ADMIN_REDIRECT : next;

  return NextResponse.redirect(new URL(dest, req.url));
}

export async function POST(req: NextRequest) {
  // optional cookie-sync endpoint
  const res = NextResponse.json({ ok: true });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name) => req.cookies.get(name)?.value,
      set: (name, value, options) => res.cookies.set({ name, value, ...(options || {}) }),
      remove: (name, options) =>
        res.cookies.set({ name, value: '', ...(options || {}), maxAge: 0 }),
    },
  });
  await supabase.auth.getSession();
  return res;
}

