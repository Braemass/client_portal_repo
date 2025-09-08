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

  // Only honor /admin as a destination if the user is actually an admin
  let destination = requestedNext;
  if (requestedNext.startsWith(ROUTES.admin)) {
    destination = isAdminEmail(email) ? ADMIN_REDIRECT : DEFAULT_USER_REDIRECT;
  }

  res.headers.set('Location', new URL(destination, SITE_URL).toString());
  return res;
}

