// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { DEFAULT_USER_REDIRECT, SITE_URL } from '@/lib/site';

// Force Node runtime so Supabase server client works without Edge warnings
export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Handles Supabase OAuth / magic-link callbacks.
 * Exchanges ?code=... for a session and sets the auth cookies on the response.
 * Redirects to ?next=/path or /profile by default.
 */
export async function GET(req: NextRequest) {
  const incomingUrl = new URL(req.url);
  const code = incomingUrl.searchParams.get('code');
  const rawNext = incomingUrl.searchParams.get('next');
  // Only allow on-site redirects
  const next =
    rawNext && rawNext.startsWith('/') ? rawNext : DEFAULT_USER_REDIRECT;

  // Default response is a redirect to the target page
  const res = NextResponse.redirect(new URL(next, SITE_URL));

  // If this is a Supabase email link, exchange code → session (sets cookies on `res`)
  if (code) {
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) =>
          res.cookies.set({ name, value: '', ...options, maxAge: 0 }),
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // If anything goes wrong, bounce back to /login with an error
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, SITE_URL)
      );
    }
  }

  return res;
}

/**
 * Optional: allow the client to "sync" auth cookies after password sign-in/out.
 * Call with: await fetch('/auth/callback', { method: 'POST' })
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}

