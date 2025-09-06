// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SITE_URL, ADMIN_REDIRECT, DEFAULT_USER_REDIRECT, isAdmin } from '@/lib/site';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Handles OAuth / magic-link / recovery callbacks.
 * - Exchanges ?code or ?token_hash for a session.
 * - Writes auth cookies to the SAME response we return.
 * - Redirects admins to /admin, others to /profile, unless ?next is provided.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  // Supabase can send either `code` (OAuth/magic link) or `token_hash` (recovery)
  const code = searchParams.get('code') ?? searchParams.get('token_hash');
  // If caller passed an explicit next, we’ll respect it after we know user role
  const nextParam = searchParams.get('next');

  // Build a single redirect response now; we'll set Location later.
  const res = new NextResponse(null, { status: 302 });

  // Create server Supabase client that reads from req.cookies and writes to res.cookies
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get: (name: string) => req.cookies.get(name)?.value,
      set: (name: string, value: string, options?: any) => {
        // NextResponse allows object form
        res.cookies.set({ name, value, ...(options || {}) });
      },
      remove: (name: string, options?: any) => {
        res.cookies.set({ name, value: '', ...(options || {}), maxAge: 0 });
      },
    },
  });

  // If a code is present, exchange it for a session (required to be "logged in")
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // Stay on /login and surface the error
      res.headers.set(
        'Location',
        new URL(`/login?error=${encodeURIComponent(error.message)}`, SITE_URL).toString(),
      );
      return res;
    }
  }

  // Determine user & target route
  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email ?? null;

  const target =
    nextParam ||
    (isAdmin(email) ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT);

  res.headers.set('Location', new URL(target, SITE_URL).toString());
  return res;
}

