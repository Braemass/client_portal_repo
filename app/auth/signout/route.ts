// app/auth/signout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL, ROUTES } from '@/lib/site';

export const runtime = 'nodejs'; // @supabase/ssr uses Node APIs

// Sign out via GET /auth/signout (optional ?next=/somewhere)
export async function GET(req: NextRequest) {
  const next = new URL(req.url).searchParams.get('next') || ROUTES.login;

  // Prepare a response we can attach cookie mutations to
  const res = NextResponse.redirect(new URL(next, SITE_URL));

  // Create a server client wired to *request* cookies (read)
  // and *response* cookies (write/remove)
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

// Support POST /auth/signout too
export async function POST(req: NextRequest) {
  return GET(req);
}

