// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { DEFAULT_USER_REDIRECT, SITE_URL } from '@/lib/site';

// Ensure Node runtime (not Edge) for Supabase server client
export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Handles Supabase OAuth/magic-link recovery callbacks:
 *   /auth/callback?code=...&next=/profile
 * Exchanges `code` -> session (sets cookies) then redirects to `next` (or /profile).
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const rawNext = url.searchParams.get('next');
  const next = rawNext && rawNext.startsWith('/') ? rawNext : DEFAULT_USER_REDIRECT;

  // We'll write cookies on this response and then redirect
  const res = NextResponse.redirect(new URL(next, SITE_URL));

  if (code) {
    // Adapter for @supabase/ssr cookies option (typed defensively to avoid version drift)
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
    } as any; // Cast avoids TS complaining across different @supabase/ssr versions

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: cookiesAdapter,
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, SITE_URL)
      );
    }
  }

  return res;
}

/**
 * Optional: lets the client "sync" cookies after password sign-in/out.
 * You can call: await fetch('/auth/callback', { method: 'POST' })
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}

