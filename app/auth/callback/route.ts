// app/auth/callback/route.ts
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

function makeClient(req: NextRequest, res: NextResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: '', ...options, maxAge: 0 }),
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/profile';

  // Prepare the redirect response FIRST so cookie writes land on it.
  const res = NextResponse.redirect(new URL(next, req.url));
  const supabase = makeClient(req, res);

  // Exchange the OAuth code for session cookies
  const code = url.searchParams.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return res;
}

export async function POST(req: NextRequest) {
  // optional: keeps the server cookies in sync for sign-out from the client
  const res = NextResponse.json({ ok: true });
  const supabase = makeClient(req, res);

  try {
    const { event, session } = await req.json();

    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut();
      return res;
    }

    if (session?.access_token && session?.refresh_token) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }

    return res;
  } catch {
    return res;
  }
}

