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
        // Read cookies from the incoming request
        getAll() {
          return req.cookies.getAll();
        },
        // Write cookies onto the response (Supabase will call this)
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...(options ?? {}) });
          });
        },
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get('next') || '/profile';

  // Prepare redirect response first so cookie writes land on it
  const res = NextResponse.redirect(new URL(next, req.url));
  const supabase = makeClient(req, res);

  // Finish the OAuth flow (Google, etc.)
  const code = url.searchParams.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  return res;
}

// Optional: lets the client sync server cookies after email+password sign-in/sign-out
export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  const supabase = makeClient(req, res);

  try {
    const { event, session } = await req.json();

    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut();
    } else if (session?.access_token && session?.refresh_token) {
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
    }
  } catch {
    // no-op
  }

  return res;
}

