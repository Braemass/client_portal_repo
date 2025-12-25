// app/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SITE_URL, ROUTES } from '@/lib/site';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    'Missing env vars: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const runtime = 'nodejs'; // required for @supabase/ssr

// Support GET /auth/signout?next=/somewhere
export async function GET(req: NextRequest) {
  const next = new URL(req.url).searchParams.get('next') || ROUTES.login;

  // Create a redirect response we can mutate cookies on
  const res = NextResponse.redirect(new URL(next, SITE_URL));

  // Wire Supabase to request cookies (read) and response cookies (write)
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  });

  await supabase.auth.signOut();
  return res;
}

// Also allow POST /auth/signout
export async function POST(req: NextRequest) {
  return GET(req);
}

