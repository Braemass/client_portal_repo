// app/auth/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ADMIN_EMAILS, ADMIN_REDIRECT, DEFAULT_USER_REDIRECT, SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';

function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || DEFAULT_USER_REDIRECT;

  // Prepare a redirect response we can mutate cookies on:
  const res = NextResponse.redirect(new URL(next, SITE_URL));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  if (!code) {
    return NextResponse.redirect(new URL(`/login?error=missing_code`, SITE_URL));
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, SITE_URL)
    );
  }

  const email = data.user?.email;
  const dest = isAdminEmail(email) ? ADMIN_REDIRECT : next;
  res.headers.set('Location', new URL(dest, SITE_URL).toString());
  return res;
}

export async function POST(req: NextRequest) {
  // This syncs cookies after a client-side email/password login
  const res = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    }
  );

  // Touch the auth API to ensure Set-Cookie is applied to the response:
  await supabase.auth.getUser();
  return res;
}

