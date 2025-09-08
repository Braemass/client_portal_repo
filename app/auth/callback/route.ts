// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import {
  SITE_URL,
  ROUTES,
  DEFAULT_USER_REDIRECT,
  ADMIN_REDIRECT,
  isAdminEmail,
} from '@/lib/site';

export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ---------- OAuth code exchange (Google, etc.) ----------
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const requestedNext = url.searchParams.get('next') || DEFAULT_USER_REDIRECT;

  if (!code) {
    return NextResponse.redirect(new URL(`${ROUTES.login}?error=missing_code`, SITE_URL));
  }

  const cookieStore = await cookies();
  const res = NextResponse.redirect(new URL(DEFAULT_USER_REDIRECT, SITE_URL));

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    res.headers.set(
      'Location',
      new URL(`${ROUTES.login}?error=${encodeURIComponent(error.message)}`, SITE_URL).toString()
    );
    return res;
  }

  const email = data.user?.email ?? '';
  let destination = requestedNext;
  if (requestedNext.startsWith(ROUTES.admin)) {
    destination = isAdminEmail(email) ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT;
  }

  res.headers.set('Location', new URL(destination, SITE_URL).toString());
  return res;
}

// ---------- Session sync for email/password sign-in ----------
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { event, session, next } = body as {
    event?: 'SIGNED_IN' | 'SIGNED_OUT';
    session?: { access_token: string; refresh_token: string; user?: { email?: string } };
    next?: string;
  };

  const cookieStore = await cookies();
  const res = NextResponse.json({ ok: true });

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

  if (event === 'SIGNED_OUT') {
    await supabase.auth.signOut();
    return res;
  }

  if (event === 'SIGNED_IN' && session?.access_token && session?.refresh_token) {
    // Persist the session into HTTP-only cookies used by RSC/server
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    // Optionally return where the client should go next
    const email = session.user?.email ?? '';
    const destination =
      next && next.startsWith(ROUTES.admin)
        ? isAdminEmail(email) ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT
        : (next || DEFAULT_USER_REDIRECT);

    return NextResponse.json({ ok: true, next: destination });
  }

  return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
}

