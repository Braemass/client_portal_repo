// app/auth/callback/route.ts
// --------------------------
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { isAdminEmail, ROUTES, SITE_URL } from '@/lib/site';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const nextParam = url.searchParams.get('next');

  if (!code) {
    return NextResponse.redirect(new URL(`${ROUTES.LOGIN}?error=missing_code`, SITE_URL));
  }

  // Prepare redirect response; we’ll update the Location after we know the role
  const res = NextResponse.redirect(new URL(ROUTES.USER_HOME, SITE_URL));

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

  // Exchange the code for a session (this sets the session cookies on `res`)
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`${ROUTES.LOGIN}?error=${encodeURIComponent(error.message)}`, SITE_URL)
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? '';

  const target = nextParam ?? (isAdminEmail(email) ? ROUTES.ADMIN_HOME : ROUTES.USER_HOME);
  res.headers.set('Location', new URL(target, SITE_URL).toString());
  return res;
}

