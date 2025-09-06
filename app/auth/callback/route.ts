// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ADMIN_REDIRECT, DEFAULT_USER_REDIRECT, SITE_URL, isAdmin } from '@/lib/site';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const explicitNext = url.searchParams.get('next'); // optional ?next=/somewhere

  // Prepare a redirect response we can mutate cookies on
  // We'll choose the destination after we know the user.
  let dest = explicitNext && explicitNext.startsWith('/')
    ? explicitNext
    : DEFAULT_USER_REDIRECT;

  const res = NextResponse.redirect(new URL(dest, SITE_URL));

  if (!code) {
    // No code present—just go to login
    return NextResponse.redirect(new URL('/login', SITE_URL));
  }

  // Minimal cookies adapter that matches @supabase/ssr expectations
  const cookiesAdapter = {
    get(name: string) {
      return req.cookies.get(name)?.value;
    },
    set(name: string, value: string, options: CookieOptions) {
      res.cookies.set({ name, value, ...options });
    },
    remove(name: string, options: CookieOptions) {
      res.cookies.set({ name, value: '', ...options, maxAge: 0 });
    },
  } as any;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: cookiesAdapter,
  });

  // IMPORTANT: pass a string (not an object) to exchangeCodeForSession
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, SITE_URL)
    );
  }

  // Decide destination based on user’s email (if no explicit ?next)
  if (!explicitNext) {
    const { data: userData } = await supabase.auth.getUser();
    const email = userData.user?.email ?? null;
    dest = isAdmin(email) ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT;
    res.headers.set('Location', new URL(dest, SITE_URL).toString());
  }

  return res;
}

// Optional cookie-sync endpoint for email/password flows
export async function POST() {
  return NextResponse.json({ ok: true });
}

