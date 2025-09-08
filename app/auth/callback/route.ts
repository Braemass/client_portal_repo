// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import {
  SITE_URL,
  ADMIN_REDIRECT,
  DEFAULT_USER_REDIRECT,
  isAdminEmail,
  ROUTES,
} from '@/lib/site';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || DEFAULT_USER_REDIRECT;

  // Missing code -> back to login
  if (!code) {
    return NextResponse.redirect(new URL(`${ROUTES.login}?error=missing_code`, SITE_URL));
  }

  const cookieStore = cookies();

  // Prepare a redirect response (we'll set the final Location later)
  const res = NextResponse.redirect(new URL(next, SITE_URL));

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

  // Exchange the code for a session (IMPORTANT: string param, not object)
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    res.headers.set(
      'Location',
      new URL(`${ROUTES.login}?error=${encodeURIComponent(error.message)}`, SITE_URL).toString()
    );
    return res;
  }

  const email = data.user?.email ?? null;
  const destination = isAdminEmail(email) ? ADMIN_REDIRECT : next;

  // Point redirect at the right place *after* cookies have been set on `res`
  res.headers.set('Location', new URL(destination, SITE_URL).toString());
  return res;
}

// Optional: endpoint you can POST to right after credential sign-in/out
// to ensure server cookies are synced (handy for client->server transitions).
export async function POST(_req: NextRequest) {
  const cookieStore = cookies();
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value;
      },
      set(name, value, options) {
        res.cookies.set({ name, value, ...(options as CookieOptions) });
      },
      remove(name, options) {
        res.cookies.set({ name, value: '', ...(options as CookieOptions), maxAge: 0 });
      },
    },
  });

  // Touch the client so cookie methods are bound; no-op otherwise
  void supabase;
  return res;
}

